import redis
import json
import os
import pymupdf
import requests
import tempfile
from google import genai
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380")
api_key = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client (reads GEMINI_API_KEY from environment)
gemini_client = genai.Client(api_key=api_key)

# Output directory for extracted images
OUTPUT_DIR = "extracted_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def parse_pdf(pdf_path: str, submission_id: str) -> dict:
    """
    Parse a PDF file and extract text and images.

    Args:
        pdf_path: Path to the PDF file
        submission_id: Unique identifier for the submission

    Returns:
        Dictionary containing extracted data from all pages
    """
    print(f"📄 Starting PDF parsing for: {pdf_path}")

    try:
        doc = pymupdf.open(pdf_path)
        extracted_data = []

        # Create submission-specific output directory
        submission_output_dir = os.path.join(OUTPUT_DIR, submission_id)
        os.makedirs(submission_output_dir, exist_ok=True)

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Extract text
            text = page.get_text()

            # Extract images
            image_list = page.get_images(full=True)
            page_images = []

            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                image_filename = f"page_{page_num + 1}_img_{img_index + 1}.{image_ext}"
                image_path = os.path.join(submission_output_dir, image_filename)

                with open(image_path, "wb") as f:
                    f.write(image_bytes)

                page_images.append(image_path)

            extracted_data.append({
                "page_number": page_num + 1,
                "text": text,
                "images": page_images
            })

        doc.close()

        print(f"✅ PDF parsing completed! Extracted {len(extracted_data)} pages")
        return {
            "success": True,
            "submission_id": submission_id,
            "pages": len(extracted_data),
            "data": extracted_data
        }

    except Exception as e:
        print(f"❌ PDF parsing failed: {str(e)}")
        return {
            "success": False,
            "submission_id": submission_id,
            "error": str(e)
        }


def evaluate_with_gemini(parsed_data: dict, assignment_id: str) -> dict:
    """
    Send parsed PDF content to Gemini for evaluation.

    Args:
        parsed_data: Dictionary containing extracted text and images from PDF
        assignment_id: The assignment ID for context

    Returns:
        Dictionary containing evaluation results
    """
    print(f"🤖 Sending to Gemini for evaluation...")

    try:
        # Combine all text from pages
        full_text = "\n\n".join([
            f"--- Page {page['page_number']} ---\n{page['text']}"
            for page in parsed_data.get("data", [])
        ])

        # Create the evaluation prompt
        evaluation_prompt = f"""You are an academic assignment evaluator. Please evaluate the following student submission.

Assignment ID: {assignment_id}

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

        # Generate evaluation using Gemini
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=evaluation_prompt
        )

        # Parse the response
        response_text = response.text
        print(f"📝 Gemini Response received")

        # Try to extract JSON from response
        try:
            # Find JSON in response (handle markdown code blocks)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text.strip()

            evaluation = json.loads(json_str)

            print(f"✅ Evaluation completed! Score: {evaluation.get('score', 'N/A')}/100")
            return {
                "success": True,
                "evaluation": evaluation
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw response
            print(f"⚠️ Could not parse JSON, returning raw response")
            return {
                "success": True,
                "evaluation": {
                    "raw_response": response_text,
                    "score": None
                }
            }

    except Exception as e:
        print(f"❌ Gemini evaluation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def download_pdf(url: str, submission_id: str) -> str | None:
    """
    Download PDF from public URL to a temporary file.

    Args:
        url: Public URL of the PDF
        submission_id: Unique identifier for the submission

    Returns:
        Path to the downloaded PDF file, or None if download failed
    """
    print(f"⬇️ Downloading PDF from: {url}")

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Create temp file for the PDF
        temp_dir = tempfile.gettempdir()
        pdf_path = os.path.join(temp_dir, f"{submission_id}.pdf")

        with open(pdf_path, "wb") as f:
            f.write(response.content)

        print(f"✅ PDF downloaded successfully: {pdf_path}")
        return pdf_path

    except requests.RequestException as e:
        print(f"❌ Failed to download PDF: {str(e)}")
        return None


def handle_submission(message_data: dict):
    """
    Handle incoming submission event.

    Args:
        message_data: Parsed JSON data from the submission event
    """
    print(f"\n{'='*50}")
    print(f"📥 New submission received!")
    print(f"{'='*50}")
    print(f"Submission Data: {json.dumps(message_data, indent=2)}")

    # Extract relevant info from submission
    submission_id = message_data.get("id", "unknown")
    public_url = message_data.get("public_url")
    assignment_id = message_data.get("assignmentId", "unknown")

    if public_url:
        print(f"📎 Public URL: {public_url}")

        # Download PDF from public URL
        pdf_path = download_pdf(public_url, submission_id)

        if pdf_path:
            # Parse the downloaded PDF
            parse_result = parse_pdf(pdf_path, submission_id)
            print(f"📊 Parse result: {json.dumps({k: v for k, v in parse_result.items() if k != 'data'}, indent=2)}")

            # Evaluate with Gemini if parsing was successful
            if parse_result.get("success"):
                evaluation_result = evaluate_with_gemini(parse_result, assignment_id)

                if evaluation_result.get("success"):
                    evaluation = evaluation_result.get("evaluation", {})
                    print(f"\n🎯 EVALUATION RESULTS:")
                    print(f"   Score: {evaluation.get('score', 'N/A')}/100")
                    print(f"   Summary: {evaluation.get('summary', 'N/A')}")

                    # TODO: Update submission in database with score and feedback
                    # You can publish this back to another Redis channel or call an API
                else:
                    print(f"❌ Evaluation failed: {evaluation_result.get('error')}")

            # Clean up temp file
            try:
                os.remove(pdf_path)
                print(f"🧹 Cleaned up temp file")
            except:
                pass
        else:
            print(f"❌ Could not download PDF, skipping parsing")
    else:
        print(f"⚠️ No public_url in submission, skipping PDF parsing")

    print(f"{'='*50}\n")


def start_worker():
    """
    Start the Redis subscription worker.
    Listens for messages on the 'submission' channel.
    """
    print(f"🚀 Starting Submission Worker...")
    print(f"📡 Connecting to Redis: {REDIS_URL}")

    try:
        # Connect to Redis
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        print(f"✅ Redis connected successfully!")

        # Create pubsub instance
        pubsub = client.pubsub()

        # Subscribe to the submission channel
        pubsub.subscribe("submission")
        print(f"📢 Subscribed to 'submission' channel")
        print(f"👂 Waiting for submissions...\n")

        # Listen for messages
        for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    # Parse the JSON data
                    data = json.loads(message["data"])
                    handle_submission(data)
                except json.JSONDecodeError as e:
                    print(f"❌ Failed to parse message JSON: {e}")
                    print(f"Raw message: {message['data']}")
                except Exception as e:
                    print(f"❌ Error handling submission: {e}")

    except redis.ConnectionError as e:
        print(f"❌ Failed to connect to Redis: {e}")
    except KeyboardInterrupt:
        print(f"\n👋 Worker shutting down...")
    finally:
        if 'pubsub' in locals():
            pubsub.close()
        if 'client' in locals():
            client.close()
        print(f"🔌 Connections closed")


if __name__ == "__main__":
    start_worker()
