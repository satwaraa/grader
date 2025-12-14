# Submission Grading Worker Flow

## Overview

This worker orchestrates the complete assignment grading flow using BullMQ, Python PDF parsing, and Gemini AI evaluation.

## Architecture

```
SubmissionWorker.ts (Main Orchestrator)
         ↓
    [Job Received]
         ↓
    1. Download PDF
         ↓
    2. Parse PDF → pdfParser.py
         ↓
    [Extracted Text & Images]
         ↓
    3. Grade with AI → geminiGrader.py
         ↓
    [Evaluation Results]
         ↓
    4. Update Database
         ↓
    [Job Complete]
```

## Components

### 1. **SubmissionWorker.ts** (Main Orchestrator)

-   **Language**: TypeScript
-   **Responsibilities**:
    -   Listens to `grade_assignment` queue via BullMQ
    -   Downloads PDF from public URL
    -   Orchestrates Python scripts execution
    -   Updates submission in database with final grade
    -   Publishes progress events to Redis
    -   Manages error handling and job completion

### 2. **pdfParser.py** (PDF Parser)

-   **Language**: Python
-   **Input**: PDF file path, submission ID
-   **Responsibilities**:
    -   Opens and parses PDF using PyMuPDF
    -   Extracts text from each page
    -   Extracts and saves images
    -   Publishes progress events (0-80%)
-   **Output**: Array of parsed pages with text and image paths

### 3. **geminiGrader.py** (AI Grader)

-   **Language**: Python
-   **Input**: Extracted data JSON, assignment ID, submission ID
-   **Responsibilities**:
    -   Sends extracted text to Gemini AI
    -   Requests structured evaluation (score, feedback, strengths, weaknesses)
    -   Publishes progress events (85-95%)
-   **Output**: Evaluation object with score and detailed feedback

## Data Flow

### Job Data Structure

```typescript
interface SubmissionJobData {
    id: string; // Submission ID
    public_url: string; // PDF URL
    score: number | null;
    feedback: string | null;
    status: "PENDING" | "GRADED" | "REVIEWING";
    submittedAt: string;
    gradedAt: string | null;
    studentId: string;
    assignmentId: string;
}
```

### Progress Events (Published to Redis)

```json
// PDF Parsing Started (0%)
{"step": "parsing_started", "total_pages": 5, "percent": 0}

// Page Parsed (1-80%)
{"step": "page_parsed", "page": 1, "total_pages": 5, "percent": 16}

// Parsing Completed (80%)
{"step": "parsing_completed", "percent": 100, "result": [...]}

// Gemini Started (85%)
{"step": "gemini_started", "percent": 85}

// Gemini Processing (90%)
{"step": "gemini_processing", "percent": 90}

// Gemini Completed (95%)
{"step": "gemini_completed", "percent": 95, "evaluation": {...}}

// Grading Completed (100%)
{"step": "grading_completed", "percent": 100, "score": 85, "status": "GRADED"}
```

### Evaluation Structure

```typescript
interface GeminiEvaluation {
    score: number; // 0-100
    strengths?: string[]; // What student did well
    weaknesses?: string[]; // Areas for improvement
    feedback: string; // Detailed feedback
    summary: string; // Brief summary
    raw_response?: string; // Fallback if JSON parsing fails
}
```

## Environment Variables

```env
# Redis Connection
REDIS_URL="redis://localhost:6380"

# Gemini AI API Key
GEMINI_API_KEY="your-gemini-api-key-here"

# Database
DATABASE_URL="postgresql://..."

# S3/R2 for PDF storage
PUBLIC_ENDPOINT="https://..."
```

## Setup

### 1. Install Python Dependencies

```bash
cd apps/backend/workers/python
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Add your Gemini API key to .env
echo 'GEMINI_API_KEY="your-key-here"' >> apps/backend/.env
```

### 3. Start Redis

```bash
docker compose up -d redis
```

### 4. Start Worker

```bash
cd apps/backend/workers
bun SubmissionWorker.ts
```

## Usage

### Adding a Job to Queue

```typescript
import { submissionQueue } from "./utils/queue";

await submissionQueue.add("grade_assignment", {
    id: "submission-uuid",
    public_url: "https://cdn.example.com/submission.pdf",
    score: null,
    feedback: null,
    status: "PENDING",
    submittedAt: new Date().toISOString(),
    gradedAt: null,
    studentId: "student-uuid",
    assignmentId: "assignment-uuid",
});
```

### Subscribing to Progress Events

```typescript
import { redis } from "./utils/redis";

const pubsub = redis.duplicate();
await pubsub.subscribe(`submission:${submissionId}`);

pubsub.on("message", (channel, message) => {
    const event = JSON.parse(message);
    console.log(`Progress: ${event.percent}%`);

    if (event.step === "grading_completed") {
        console.log(`Final Score: ${event.score}/100`);
    }
});
```

## Error Handling

-   **PDF Download Failure**: Job fails immediately
-   **PDF Parsing Error**: Python process exits with code 1, job fails
-   **Gemini API Error**: Job fails, error logged
-   **Database Update Error**: Job fails, rollback possible

All errors are logged with detailed context and job is marked as failed in BullMQ.

## File Locations

```
apps/backend/
├── tmp/                              # Temporary files
│   ├── submission_{id}.pdf          # Downloaded PDFs
│   └── extracted_images/            # Extracted images
│       └── {submission_id}/
│           └── p1_img1.png
├── workers/
│   ├── SubmissionWorker.ts          # Main orchestrator
│   └── python/
│       ├── pdfParser.py             # PDF parser
│       └── geminiGrader.py          # AI grader
└── api/submission/
    └── submission.manager.ts        # Database operations
```

## Performance

-   **Concurrency**: 2 jobs processed simultaneously
-   **PDF Parsing**: ~1-2 seconds per page
-   **Gemini Grading**: ~3-5 seconds per submission
-   **Total Time**: ~10-15 seconds for a 5-page submission

## Monitoring

```bash
# Check worker logs
bun SubmissionWorker.ts

# Check queue status
bun check-queue.ts

# Add test job
bun test-queue.ts
```

## Future Enhancements

-   [ ] Add retry logic for Gemini API failures
-   [ ] Support image analysis in Gemini evaluation
-   [ ] Add plagiarism detection
-   [ ] Support multiple grading rubrics
-   [ ] Add grading history/audit log
-   [ ] Implement manual review workflow
