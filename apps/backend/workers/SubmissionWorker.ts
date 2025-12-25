import { Job, Worker } from "bullmq";
import { spawn } from "child_process";
import fs from "fs";
// import { config } from "dotenv";
import path from "path";
import { SubmissionManager } from "../api/submission/submission.manager";
import { prisma } from "../lib/prisma";
import { redis } from "../utils/redis";

// Load environment variables from parent directory
// config({ path: path.join(__dirname, "../.env") });

const submissionManager = new SubmissionManager();

enum SubmissionStatus {
    PENDING = "PENDING",
    GRADED = "GRADED",
    REVIEWING = "REVIEWING",
}

interface SubmissionJobData {
    id: string;
    public_url: string;
    score: number | null;
    feedback: string | null;
    status: SubmissionStatus;
    submittedAt: string;
    gradedAt: string | null;
    studentId: string;
    assignmentId: string;
}

interface ParsedPage {
    page_number: number;
    text: string;
    images: string[];
}

interface GeminiEvaluation {
    score: number;
    strengths?: string[];
    weaknesses?: string[];
    feedback: string;
    summary: string;
    raw_response?: string;
}

function runPython(
    submissionId: string,
    filePath: string,
    assignmentId: string,
    studentId: string,
): Promise<ParsedPage[]> {
    return new Promise<ParsedPage[]>((resolve, reject) => {
        const script = path.join(__dirname, "python", "pdfParser.py");
        let extractedData: ParsedPage[] = [];

        const proc = spawn("python3", [script, filePath, submissionId], {
            cwd: path.join(__dirname, "python"),
        });

        proc.stdout.on("data", (data) => {
            const output = data.toString();
            console.log(`🐍 Python output: ${output}`);

            try {
                const msg = JSON.parse(output);
                // Inject assignmentId and studentId for teacher dashboard
                const enrichedMsg = { ...msg, assignmentId, studentId };
                console.log(`📤 Publishing event:`, enrichedMsg);

                // Store extracted data when parsing is completed
                if (msg.step === "parsing_completed" && msg.result) {
                    extractedData = msg.result;
                }

                redis.publish(`submission:${submissionId}`, JSON.stringify(enrichedMsg));
            } catch {
                console.log(`⚠️  Non-JSON output (ignored): ${output}`);
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`🐍 Python error: ${err.toString()}`);
        });

        proc.on("close", (code) => {
            console.log(`🐍 Python process exited with code: ${code}`);
            if (code === 0) {
                console.log(`✅ Python process completed successfully`);
                resolve(extractedData);
            } else {
                const error = new Error(`Python process failed with code ${code}`);
                console.error(`❌ ${error.message}`);
                reject(error);
            }
        });
    });
}

function runGeminiGrader(
    extractedData: ParsedPage[],
    assignmentId: string,
    submissionId: string,
    studentId: string,
    context: {
        rubric?: { name: string; points: number; description: string }[];
        description?: string;
    } = {},
): Promise<GeminiEvaluation> {
    return new Promise<GeminiEvaluation>((resolve, reject) => {
        const script = path.join(__dirname, "python", "geminiGrader.py");
        let evaluation: GeminiEvaluation | null = null;

        // Pass extracted data as JSON string
        const extractedDataJson = JSON.stringify(extractedData);
        const contextJson = JSON.stringify(context);

        // Get the backend directory to find .env file
        const backendDir = path.join(__dirname, "..");
        const envPath = path.join(backendDir, ".env");

        console.log(`📄 Using .env from: ${envPath}`);

        const proc = spawn(
            "python3",
            [script, extractedDataJson, assignmentId, submissionId, contextJson],
            {
                env: {
                    ...process.env,
                    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
                    DOTENV_PATH: envPath,
                },
                cwd: path.join(__dirname, "python"),
            },
        );

        proc.stdout.on("data", (data) => {
            const output = data.toString();
            console.log(`🤖 Gemini output: ${output}`);

            try {
                const msg = JSON.parse(output);
                // Inject assignmentId and studentId for teacher dashboard
                const enrichedMsg = { ...msg, assignmentId, studentId };
                console.log(`📤 Publishing event:`, enrichedMsg);

                // Store evaluation when Gemini completes
                if (msg.step === "gemini_completed" && msg.evaluation) {
                    evaluation = msg.evaluation;
                }

                redis.publish(`submission:${submissionId}`, JSON.stringify(enrichedMsg));
            } catch {
                console.log(`⚠️  Non-JSON output (ignored): ${output}`);
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`🤖 Gemini error: ${err.toString()}`);
        });

        proc.on("close", (code) => {
            console.log(`🤖 Gemini process exited with code: ${code}`);
            if (code === 0 && evaluation) {
                console.log(`✅ Gemini evaluation completed successfully`);
                resolve(evaluation);
            } else {
                const error = new Error(`Gemini process failed with code ${code}`);
                console.error(`❌ ${error.message}`);
                reject(error);
            }
        });
    });
}

const worker = new Worker<SubmissionJobData>(
    "grade_assignment",
    async (job: Job<SubmissionJobData>) => {
        console.log("✅ Job received:", job.id);
        console.log("Job data:", job.data);

        const { id, public_url, studentId, assignmentId } = job.data;
        console.log(`📝 Processing submission ${id} for student ${studentId}`);

        // Publish start event
        redis.publish(
            `submission:${id}`,
            JSON.stringify({
                step: "submission_started",
                percent: 5,
                assignmentId,
                studentId,
            }),
        );

        await job.updateProgress(5);

        // Create tmp directory in project if it doesn't exist
        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const pdfPath = path.join(tmpDir, `submission_${id}.pdf`);
        const imagesDir = path.join(tmpDir, "extracted_images", id);

        try {
            // Download the PDF from public URL
            console.log(`⬇️  Downloading PDF from: ${public_url}`);

            redis.publish(
                `submission:${id}`,
                JSON.stringify({
                    step: "downloading_pdf",
                    percent: 5,
                    assignmentId,
                    studentId,
                }),
            );

            const buffer = await fetch(public_url).then((res) => res.arrayBuffer());
            console.log(`💾 Saving PDF to: ${pdfPath}`);
            fs.writeFileSync(pdfPath, Buffer.from(buffer));
            console.log(`✅ PDF saved successfully`);

            redis.publish(
                `submission:${id}`,
                JSON.stringify({
                    step: "pdf_downloaded",
                    percent: 10,
                    assignmentId,
                    studentId,
                }),
            );

            await job.updateProgress(10);

            // Step 1: Parse PDF with Python
            console.log(`🚀 Starting Python PDF parser...`);
            const extractedData = await runPython(id, pdfPath, assignmentId, studentId);
            console.log(
                `✅ PDF parsing completed. Extracted ${extractedData.length} pages`,
            );

            await job.updateProgress(80);

            // Step 2: Grade with Gemini
            console.log(`🤖 Starting Gemini grading...`);

            // Fetch assignment details including rubric
            const assignment = await prisma.assignment.findUnique({
                where: { id: assignmentId },
                include: { rubric: true },
            });

            if (!assignment) {
                throw new Error(`Assignment not found: ${assignmentId}`);
            }

            // Transform rubric to the expected array format if present
            let formattedRubric:
                | { name: string; points: number; description: string }[]
                | undefined = undefined;
            if (assignment.rubric && Array.isArray(assignment.rubric.criteria)) {
                formattedRubric = (
                    assignment.rubric.criteria as {
                        name: string;
                        points: number;
                        description: string;
                    }[]
                ).map((c) => ({
                    name: c.name,
                    points: c.points,
                    description: c.description,
                }));
            }

            const context = {
                rubric: formattedRubric,
                description: assignment.description || undefined,
            };

            const evaluation = await runGeminiGrader(
                extractedData,
                assignmentId,
                id,
                studentId,
                context,
            );
            console.log(`✅ Gemini grading completed. Score: ${evaluation.score}/100`);

            await job.updateProgress(95);

            // Step 3: Update submission in database
            console.log(`💾 Updating submission in database...`);
            const fullFeedback = `
**Summary:** ${evaluation.summary}

**Score:** ${evaluation.score}/100

${
    evaluation.strengths && evaluation.strengths.length > 0
        ? `**Strengths:**\n${evaluation.strengths.map((s) => `- ${s}`).join("\n")}\n\n`
        : ""
}

${
    evaluation.weaknesses && evaluation.weaknesses.length > 0
        ? `**Areas for Improvement:**\n${evaluation.weaknesses
              .map((w) => `- ${w}`)
              .join("\n")}\n\n`
        : ""
}

**Detailed Feedback:**
${evaluation.feedback}
            `.trim();

            await submissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: fullFeedback,
                status: "GRADED",
            });

            console.log(`✅ Submission updated in database`);

            // Publish final completion event
            redis.publish(
                `submission:${id}`,
                JSON.stringify({
                    step: "grading_completed",
                    percent: 100,
                    score: evaluation.score,
                    status: "GRADED",
                    assignmentId,
                    studentId,
                }),
            );

            await job.updateProgress(100);
            console.log(`🎉 Job ${job.id} completed successfully!`);

            return true;
        } catch (error: any) {
            console.error(`❌ Job ${job.id} failed:`, error);

            // Publish error event
            redis.publish(
                `submission:${id}`,
                JSON.stringify({
                    error: error.message || "Unknown error occurred during grading",
                    step: "failed",
                    assignmentId,
                    studentId,
                }),
            );

            throw error;
        } finally {
            // Cleanup
            try {
                if (fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                    console.log(`🧹 Deleted temp PDF: ${pdfPath}`);
                }
                if (fs.existsSync(imagesDir)) {
                    fs.rmSync(imagesDir, { recursive: true, force: true });
                    console.log(`🧹 Deleted extracted images: ${imagesDir}`);
                }
            } catch (cleanupErr) {
                console.error("⚠️ Cleanup failed:", cleanupErr);
            }
        }
    },
    {
        connection: redis,
        concurrency: 5,
    },
);

console.log("🚀 Worker started and listening for jobs on 'grade_assignment' queue");
console.log("📡 Redis connection:", redis.options.host, redis.options.port);

// Handle worker events
worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
    console.log(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
    console.error("❌ Worker error:", err);
});
