import sys
import json
import os
import base64
from groq import Groq

# Models
TEXT_MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

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

def ocr_image_with_groq(client, image_path):
    """Use Groq vision model to OCR/describe an image so the text-only grader can use it."""
    image_b64 = load_image_as_base64(image_path)
    if not image_b64:
        return None
    mime_type = get_mime_type(image_path)
    try:
        completion = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract ALL text, equations, code, diagrams, charts and handwritten content "
                                "from this image. Transcribe text verbatim. For diagrams, describe the structure, "
                                "labels, arrows and relationships. For charts, list axes, data points and trends. "
                                "Be thorough — the output is the only representation downstream graders will see."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{image_b64}"},
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=1500,
        )
        return completion.choices[0].message.content or ""
    except Exception as e:
        publish({"warning": f"OCR failed for {image_path}: {str(e)}"})
        return None

# Validate args
if len(sys.argv) < 4:
    publish({"error": "Missing args. Usage: geminiGrader.py <extracted_data_json> <assignment_id> <submission_id> [context_json]"})
    sys.exit(1)

extracted_data_json = sys.argv[1]
assignment_id = sys.argv[2]
submission_id = sys.argv[3]
context_json = sys.argv[4] if len(sys.argv) > 4 else "{}"

# Get Groq API key
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    publish({"error": "GROQ_API_KEY not found in environment"})
    sys.exit(1)

publish({"info": f"API key length: {len(api_key)}", "step": "initialization"})

try:
    extracted_data = json.loads(extracted_data_json)
    context = json.loads(context_json)

    rubric = context.get("rubric")
    description = context.get("description", "")
    title = context.get("title", "Assignment")
    context_max_score = context.get("maxScore")

    total_images = sum(len(page.get('images', [])) for page in extracted_data)
    publish({"info": f"Parsed {len(extracted_data)} pages with {total_images} images", "step": "data_parsed"})

    publish({"step": "gemini_started", "percent": 85})

    publish({"info": "Initializing Groq client", "step": "client_init"})
    groq_client = Groq(api_key=api_key)

    # Build rubric / scoring header
    rubric_text = ""
    max_score = context_max_score if context_max_score else 100

    publish({"info": f"Assignment maxScore from context: {context_max_score}", "step": "debug_maxscore"})
    publish({"info": f"Using max_score: {max_score}", "step": "debug_maxscore"})

    if rubric:
        if isinstance(rubric, list):
            criteria_list = rubric
            rubric_name = "Assignment Rubric"
        else:
            criteria_list = rubric.get('criteria', [])
            rubric_name = rubric.get('name', 'Rubric')

        if not context_max_score:
            rubric_total = sum(c.get('points', 0) for c in criteria_list)
            if rubric_total > 0:
                max_score = rubric_total

        rubric_text = f"""
=== RUBRIC ===
Name: {rubric_name}
Total Points: {max_score}
Criteria:
{json.dumps(criteria_list, indent=2)}
=== END RUBRIC ===
"""

    has_rubric = bool(rubric)

    prompt_parts = [f"""You are an academic assignment evaluator. Grade MODERATELY — not lenient, not harsh.

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
{"- A RUBRIC IS PROVIDED ABOVE. The rubric is the authoritative source of truth for what to evaluate. Grade against the rubric criteria, NOT against your interpretation of the title." if has_rubric else "- No rubric provided. Evaluate against the title and description."}
- Relevance check: A submission is OFF-TOPIC only if NONE of the rubric criteria can be meaningfully evaluated against it. If even one criterion applies, grade normally — do not zero out.
- The title may be brief, ambiguous, or contain typos. Do NOT guess what the assignment "really meant" and then mark the student off-topic on that guess. If the rubric clearly applies to the submission, the submission is on-topic.
- Be MODERATE — expect quality, but reward partial fulfillment of rubric criteria.
- Do NOT give credit for "effort" alone if the content does not address any rubric criterion.

=== STUDENT SUBMISSION ===
The submission contains {len(extracted_data)} pages. Each page may have text content and/or image-derived transcriptions (diagrams, figures, handwritten work, etc.).
Image content has been transcribed by a vision model and is included as "[Image N OCR]" blocks. Treat that transcription as authoritative for what the image contains.
"""]

    # Per-page: text + OCR each image via Groq vision
    for page in extracted_data:
        page_num = page.get('page_number', 0)
        text = page.get('text', '')
        images = page.get('images', [])

        prompt_parts.append(f"\n--- PAGE {page_num} ---\n")

        if text.strip():
            prompt_parts.append(f"[Text Content]:\n{text}\n")
        else:
            prompt_parts.append("[No text content on this page]\n")

        if images:
            prompt_parts.append(f"\n[This page contains {len(images)} image(s)/figure(s). OCR transcriptions below:]\n")
            for idx, image_path in enumerate(images):
                if os.path.exists(image_path):
                    publish({"info": f"OCR image {idx + 1} on page {page_num}", "step": "image_ocr"})
                    ocr_text = ocr_image_with_groq(groq_client, image_path)
                    if ocr_text:
                        prompt_parts.append(f"\n[Image {idx + 1} OCR from Page {page_num}]:\n{ocr_text}\n")
                        publish({"info": f"OCR'd image {idx + 1} from page {page_num}", "step": "image_loaded"})
                    else:
                        prompt_parts.append(f"\n[Image {idx + 1} from Page {page_num}]: (OCR unavailable)\n")
                else:
                    publish({"warning": f"Image file not found: {image_path}"})
        else:
            prompt_parts.append("[No images on this page]\n")

    closing_prompt = f"""
=== END OF SUBMISSION ===


EVALUATION INSTRUCTIONS:

STEP 1 - RELEVANCE CHECK:
- Assignment Title: "{title}"
- A submission is OFF-TOPIC (score = 0) ONLY if NONE of the rubric criteria can be evaluated against it.
- If even one rubric criterion applies to the submission, it is ON-TOPIC — proceed to scoring.
- Titles can be short, ambiguous, or contain typos. Do NOT infer a stricter expected output than the rubric specifies, and do NOT zero a submission just because it "looks like" an off-topic example.

STEP 2 - SCORING:
*** CRITICAL: THE MAXIMUM SCORE IS {max_score} POINTS, NOT 100! ***
- Your score MUST be between 0 and {max_score}
- DO NOT score out of 100. Score out of {max_score}.
- Example: If max is {max_score}, a perfect submission gets {max_score}, a good submission gets around {int(max_score * 0.8)}, a mediocre one gets around {int(max_score * 0.5)}.
- Grade MODERATELY - expect quality work that meets the requirements
- Do NOT give generous scores for mediocre work

STEP 3 - RUBRIC EVALUATION (if rubric provided):
- Evaluate EACH criterion independently
- The total points of all criteria = {max_score}
- If submission doesn't address a criterion, that criterion scores 0
- Sum up the points earned for each criterion for the final score
- The score MUST be based on rubric criteria, NOT general content quality

Consider BOTH text content AND OCR'd image transcriptions when evaluating.
Image OCR may contain critical information like diagrams, flowcharts, handwritten work, charts, or code.

Provide:
1. **Score**: An integer from 0 to {max_score}. NOT out of 100! Score is out of {max_score}.
2. **Strengths**: What the student did well (empty array if off-topic or nothing good)
3. **Weaknesses**: Areas for improvement. If off-topic, state that submission doesn't match assignment.
4. **Feedback**: Detailed feedback. If off-topic, explain what was expected vs what was submitted.
5. **Summary**: Brief summary. Must indicate if submission is relevant or off-topic.

*** REMINDER: Maximum possible score is {max_score}. Your score value must be between 0 and {max_score}! ***

Respond with a single valid JSON object in this exact shape (no markdown, no commentary):
{{
    "score": <integer from 0 to {max_score}>,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "feedback": "detailed feedback text",
    "summary": "brief summary"
}}
"""
    prompt_parts.append(closing_prompt)
    full_prompt = "".join(prompt_parts)

    publish({
        "step": "gemini_processing",
        "percent": 90,
        "info": f"Sending grading prompt to Groq ({TEXT_MODEL})"
    })

    publish({"info": "Calling Groq API", "step": "api_call"})
    response = groq_client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a STRICT academic grader. Always return a single valid JSON object matching "
                    "the requested schema. No markdown, no commentary, no trailing text."
                ),
            },
            {"role": "user", "content": full_prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    publish({"info": "Received Groq response", "step": "api_response"})

    response_text = response.choices[0].message.content if response and response.choices else ""

    if not response_text:
        publish({"error": "Groq API returned empty text"})
        sys.exit(1)

    try:
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()

        evaluation = json.loads(json_str)

        if isinstance(evaluation.get("score"), str):
            evaluation["score"] = int(evaluation["score"])

        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": evaluation
        })

    except (json.JSONDecodeError, ValueError) as e:
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
        "error": f"Groq evaluation failed: {str(e)}",
        "step": "gemini_failed",
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc()
    }
    publish(error_details)
    sys.exit(1)
