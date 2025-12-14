import sys
import json
import os
from google import genai

def publish(event):
    """Print JSON event to stdout for Node.js to capture"""
    print(json.dumps(event), flush=True)

# Validate args
if len(sys.argv) < 4:
    publish({"error": "Missing args. Usage: geminiGrader.py <extracted_data_json> <assignment_id> <submission_id>"})
    sys.exit(1)

extracted_data_json = sys.argv[1]
assignment_id = sys.argv[2]
submission_id = sys.argv[3]

# Get Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    publish({"error": "GEMINI_API_KEY not found in environment"})
    sys.exit(1)

publish({"info": f"API key length: {len(api_key)}", "step": "initialization"})

try:
    # Parse extracted data
    extracted_data = json.loads(extracted_data_json)

    publish({"info": f"Parsed {len(extracted_data)} pages", "step": "data_parsed"})

    publish({
        "step": "gemini_started",
        "percent": 85
    })

    # Initialize Gemini client
    publish({"info": "Initializing Gemini client", "step": "client_init"})
    gemini_client = genai.Client(api_key=api_key)

    # Combine all text from pages
    full_text = "\n\n".join([
        f"--- Page {page['page_number']} ---\n{page['text']}"
        for page in extracted_data
    ])

    # Create evaluation prompt
    evaluation_prompt = f"""You are an academic assignment evaluator. Please evaluate the following student submission.

Assignment ID: {assignment_id}
Submission ID: {submission_id}

=== STUDENT SUBMISSION ===
{full_text}
=== END OF SUBMISSION ===

Please evaluate this submission and provide:
1. **Score**: A score out of 100
2. **Strengths**: What the student did well
3. **Weaknesses**: Areas that need improvement
4. **Feedback**: Detailed constructive feedback for the student
5. **Summary**: A brief overall summary

Respond in the following JSON format:
{{
    "score": <number 0-100>,
    "strengths": ["strength1", "strength2", ...],
    "weaknesses": ["weakness1", "weakness2", ...],
    "feedback": "detailed feedback text",
    "summary": "brief summary"
}}
"""

    publish({
        "step": "gemini_processing",
        "percent": 90
    })

    # Generate evaluation using Gemini
    publish({"info": "Calling Gemini API", "step": "api_call"})
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=evaluation_prompt
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
