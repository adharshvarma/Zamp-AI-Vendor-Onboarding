# backend/ocr_engine.py

import os
import json
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def extract_documents_with_gemini(file_bytes: bytes, mime_type: str, country: str, entity_type: str) -> dict:
    if not client:
        return {
            "extracted_legal_name": "Groq API Key Missing",
            "extracted_tax_id": "Unknown",
            "extracted_bank_name": "Unknown",
            "confidence": 0.0,
            "ai_message": "Please configure GROQ_API_KEY."
        }
    
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    data_url = f"data:{mime_type};base64,{base64_image}"
    
    # Dynamic prompt based on region
    doc_expectation = "Form W-9 and EIN" if country == "US" else "PAN Card, GSTIN, and Canceled Cheque"
    
    prompt = (
        f"You are an enterprise compliance officer reviewing vendor documents for a {country} entity of type '{entity_type}'. "
        f"Expected documents for this region usually include: {doc_expectation}. "
        "Inspect the uploaded image. If the document is blank or un-filled, state so in 'ai_message'. "
        "Return a valid JSON object with these exact keys: "
        "'extracted_legal_name' (string or null), "
        "'extracted_tax_id' (string or null, e.g., EIN for US or PAN for India), "
        "'extracted_bank_name' (string or null), "
        "'confidence' (float between 0 and 1), and "
        "'ai_message' (A short conversational summary of what is seen)."
    )
    
    try:
        completion = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {
            "extracted_legal_name": "Extraction Error",
            "extracted_tax_id": "Unknown",
            "extracted_bank_name": "Unknown",
            "confidence": 0.0,
            "ai_message": f"Extraction failed: {str(e)}"
        }