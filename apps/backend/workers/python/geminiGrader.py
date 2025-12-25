import sys
import json
import os
import base64
from google import genai
from google.genai import types

def publish(event):
    """Print JSON event to stdout for Node.js to capture"""
    print(json.dumps(event), flush=True)

def get_mime_type(file_path):
    """Get MIME type based on file extension"""
    ext = os.path.splitext(file_path)[1].lower()
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
    }
    return mime_types.get(ext, 'image/png')

def load_image_as_base64(image_path):
    """Load an image file and return base64 encoded data"""
    try:
        with open(image_path, 'rb') as f:
            return base64.standard_b64encode(f.read()).decode('utf-8')
    except Exception as e:
        publish({"warning": f"Could not load image {image_path}: {str(e)}"})
        return None

# Validate args
if len(sys.argv) < 4:
    publish({"error": "Missing args. Usage: geminiGrader.py <extracted_data_json> <assignment_id> <submission_id> [context_json]"})
    sys.exit(1)

extracted_data_json = sys.argv[1]
assignment_id = sys.argv[2]
submission_id = sys.argv[3]
context_json = sys.argv[4] if len(sys.argv) > 4 else "{}"

# Get Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    publish({"error": "GEMINI_API_KEY not found in environment"})
    sys.exit(1)

publish({"info": f"API key length: {len(api_key)}", "step": "initialization"})

try:
    # Parse extracted data
    extracted_data = json.loads(extracted_data_json)
    context = json.loads(context_json)

    rubric = context.get("rubric")
    description = context.get("description", "")
    title = context.get("title", "Assignment")

    # Count total images
    total_images = sum(len(page.get('images', [])) for page in extracted_data)
    publish({"info": f"Parsed {len(extracted_data)} pages with {total_images} images", "step": "data_parsed"})

    publish({
        "step": "gemini_started",
        "percent": 85
    })

    # Initialize Gemini client
    publish({"info": "Initializing Gemini client", "step": "client_init"})
    gemini_client = genai.Client(api_key=api_key)

    # Build content parts with text and images in context
    content_parts = []

    # Create evaluation prompt header
    rubric_text = ""
    max_score = 100  # Default if no rubric
    if rubric:
        # Handle both formats: rubric can be a list of criteria directly, or a dict with name/criteria
        if isinstance(rubric, list):
            criteria_list = rubric
            rubric_name = "Assignment Rubric"
        else:
            criteria_list = rubric.get('criteria', [])
            rubric_name = rubric.get('name', 'Rubric')

        # Calculate total points from rubric
        max_score = sum(c.get('points', 0) for c in criteria_list)
        if max_score == 0:
            max_score = 100  # Fallback if no points defined

        rubric_text = f"""
=== RUBRIC ===
Name: {rubric_name}
Total Points: {max_score}
Criteria:
{json.dumps(criteria_list, indent=2)}
=== END RUBRIC ===
"""

    prompt_header = f"""You are a STRICT academic assignment evaluator. You grade MODERATELY, not leniently.

Assignment ID: {assignment_id}
Submission ID: {submission_id}

=== ASSIGNMENT TITLE ===
{title}
=== END TITLE ===

=== ASSIGNMENT DESCRIPTION ===
{description if description else "No description provided."}
=== END DESCRIPTION ===
{rubric_text}

GRADING INSTRUCTIONS:
- You are evaluating if the student submission matches the ASSIGNMENT TITLE and DESCRIPTION above.
- If the submission is COMPLETELY unrelated to the assignment (e.g., assignment asks for "DevOps Project Synopsis" but student submits a "Resume"), you MUST give a score of 0.
- Be a MODERATE grader - not lenient, not harsh. Expect quality work that matches the assignment requirements.
- Do NOT give partial credit for "effort" if the content doesn't match the assignment topic.

=== STUDENT SUBMISSION ===
The submission contains {len(extracted_data)} pages. Each page may have text content and/or images (diagrams, figures, handwritten work, etc.).
You must carefully examine BOTH the text AND images when evaluating the submission.
Images may contain important information like diagrams, charts, handwritten solutions, or visual elements that are essential to the answer.

"""
    content_parts.append(types.Part.from_text(text=prompt_header))

    # Add each page with its text and images
    for page in extracted_data:
        page_num = page.get('page_number', 0)
        text = page.get('text', '')
        images = page.get('images', [])

        # Add page header
        page_header = f"\n--- PAGE {page_num} ---\n"
        content_parts.append(types.Part.from_text(text=page_header))

        # Add text content
        if text.strip():
            content_parts.append(types.Part.from_text(text=f"[Text Content]:\n{text}\n"))
        else:
            content_parts.append(types.Part.from_text(text="[No text content on this page]\n"))

        # Add images with context
        if images:
            content_parts.append(types.Part.from_text(text=f"\n[This page contains {len(images)} image(s)/figure(s). Please analyze them carefully as they may contain diagrams, charts, handwritten work, or visual solutions:]\n"))

            for idx, image_path in enumerate(images):
                if os.path.exists(image_path):
                    image_data = load_image_as_base64(image_path)
                    if image_data:
                        mime_type = get_mime_type(image_path)
                        # Add context before image
                        content_parts.append(types.Part.from_text(text=f"\n[Image {idx + 1} from Page {page_num}]:"))
                        # Add image as inline data
                        content_parts.append(types.Part.from_bytes(
                            data=base64.standard_b64decode(image_data),
                            mime_type=mime_type
                        ))
                        publish({"info": f"Added image {idx + 1} from page {page_num}", "step": "image_loaded"})
                else:
                    publish({"warning": f"Image file not found: {image_path}"})
        else:
            content_parts.append(types.Part.from_text(text="[No images on this page]\n"))

    # Add closing prompt with dynamic max_score
    closing_prompt = f"""
=== END OF SUBMISSION ===

EVALUATION INSTRUCTIONS:

STEP 1 - RELEVANCE CHECK (MOST IMPORTANT):
First, determine if the submission is RELEVANT to the assignment title and description.
- Assignment Title: "{title}"
- If the submission is COMPLETELY UNRELATED (e.g., you expected a "DevOps Synopsis" but got a "Resume"), give score = 0.
- Do NOT be lenient. If content doesn't match the assignment topic, the score is 0.

STEP 2 - SCORING (if submission is relevant):
- Maximum possible score: {max_score} points
- If a rubric is provided, score based on the sum of rubric criteria points (total: {max_score})
- If no rubric, score out of 100
- Grade MODERATELY - expect quality work that meets the requirements
- Do NOT give generous scores for mediocre work

STEP 3 - RUBRIC EVALUATION:
- If a rubric is provided, evaluate EACH criterion independently
- If submission doesn't address a criterion, that criterion scores 0
- Sum up the points for the final score
- The score MUST be based on rubric criteria, NOT general content quality

Consider BOTH text content AND any images/figures when evaluating.
Images may contain critical information like diagrams, flowcharts, handwritten work, charts, or code.

Provide:
1. **Score**: 0 if off-topic. Otherwise, score out of {max_score} based on rubric criteria.
2. **Strengths**: What the student did well (empty array if off-topic or nothing good)
3. **Weaknesses**: Areas for improvement. If off-topic, state that submission doesn't match assignment.
4. **Feedback**: Detailed feedback. If off-topic, explain what was expected vs what was submitted.
5. **Summary**: Brief summary. Must indicate if submission is relevant or off-topic.

Respond in the following JSON format:
{{
    "score": <number 0-{max_score}>,
    "strengths": ["strength1", "strength2", ...],
    "weaknesses": ["weakness1", "weakness2", ...],
    "feedback": "detailed feedback text",
    "summary": "brief summary"
}}
"""
    content_parts.append(types.Part.from_text(text=closing_prompt))

    publish({
        "step": "gemini_processing",
        "percent": 90,
        "info": f"Sending {len(content_parts)} content parts (text + images) to Gemini"
    })

    # Generate evaluation using Gemini with multimodal content
    publish({"info": "Calling Gemini API with multimodal content", "step": "api_call"})
    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=content_parts
    )

    publish({"info": "Received Gemini response", "step": "api_response"})

    # Check if response is valid
    if not response or not hasattr(response, 'text'):
        publish({"error": "Gemini API returned empty response"})
        sys.exit(1)

    response_text = response.text

    if not response_text:
        publish({"error": "Gemini API returned empty text"})
        sys.exit(1)

    # Try to extract JSON from response
    try:
        # Handle markdown code blocks
        if response_text and "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif response_text and "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip() if response_text else "{}"

        evaluation = json.loads(json_str)

        # Ensure score is a number
        if isinstance(evaluation.get("score"), str):
            evaluation["score"] = int(evaluation["score"])

        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": evaluation
        })

    except (json.JSONDecodeError, ValueError) as e:
        # If JSON parsing fails, try to extract score and return raw response
        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": {
                "raw_response": response_text,
                "score": 50,
                "feedback": response_text,
                "summary": "Evaluation completed but response format was non-standard"
            },
            "warning": f"Could not parse JSON: {str(e)}"
        })

except Exception as e:
    import traceback
    error_details = {
        "error": f"Gemini evaluation failed: {str(e)}",
        "step": "gemini_failed",
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc()
    }
    publish(error_details)
    sys.exit(1)
