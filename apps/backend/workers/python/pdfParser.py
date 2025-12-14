import pymupdf
import os
import sys
import json

def publish(event):
    print(json.dumps(event), flush=True)

# Validate args
if len(sys.argv) < 3:
    publish({ "error": "Missing args" })
    sys.exit(1)

pdf_path = sys.argv[1]
submission_id = sys.argv[2]

# Open PDF
try:
    doc = pymupdf.open(pdf_path)
except Exception as e:
    publish({ "error": f"Failed to open PDF: {str(e)}" })
    sys.exit(1)

total_pages = len(doc)

# Get the directory of this script, then go to backend/tmp
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(script_dir))  # backend/
tmp_dir = os.path.join(backend_dir, "tmp")
output_dir = os.path.join(tmp_dir, "extracted_images", submission_id)
os.makedirs(output_dir, exist_ok=True)

publish({
    "step": "parsing_started",
    "total_pages": total_pages,
    "percent": 10
})

extracted_data = []

for page_num in range(total_pages):
    page = doc[page_num]

    # ----- TEXT -----
    text = page.get_text()

    # ----- IMAGES -----
    image_list = page.get_images(full=True)
    page_images = []

    for img_index, img in enumerate(image_list):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        ext = base_image["ext"]

        image_filename = f"p{page_num+1}_img{img_index+1}.{ext}"
        image_path = os.path.join(output_dir, image_filename)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        page_images.append(image_path)

    extracted_data.append({
        "page_number": page_num + 1,
        "text": text,
        "images": page_images
    })

    # ----- PROGRESS EVENT -----
    # Map progress from 10% to 80%
    current_percent = 10 + int((page_num + 1) / total_pages * 70)
    publish({
        "step": "page_parsed",
        "page": page_num + 1,
        "total_pages": total_pages,
        "percent": current_percent
    })

doc.close()

# Final completion event
publish({
    "step": "parsing_completed",
    "percent": 80,
    "result": extracted_data
})
