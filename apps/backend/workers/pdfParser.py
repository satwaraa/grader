import pymupdf
import os

# Open and parse the PDF file
pdf_path = "synopsis.pdf"
doc = pymupdf.open(pdf_path)

# Create output directory for images
output_dir = "extracted_images"
os.makedirs(output_dir, exist_ok=True)

extracted_data = []

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
        image_path = os.path.join(output_dir, image_filename)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        page_images.append(image_path)

    extracted_data.append({
        "page_number": page_num + 1,
        "text": text,
        "images": page_images
    })

# Close the document
doc.close()

# Print the extracted data structure
print(extracted_data)
