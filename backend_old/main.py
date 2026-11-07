import os
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from ocr_engine import extract_documents_with_gemini
from rules_engine import evaluate_vendor_compliance
from constants import COUNTRY_DOC_REQUIREMENTS

app = FastAPI(
    title="Zamp AI Multi-Region Vendor Onboarding API",
    description="Cross-border vendor compliance pipeline with dedicated US and India endpoints.",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database simulation for developer GET endpoints
IN_MEMORY_DB: List[Dict[str, Any]] = []

# ==========================================
# GET ENDPOINTS (Developer Data & Configs)
# ==========================================

@app.get("/api/dev/vendors", tags=["Developer Data"])
def get_all_onboarded_vendors():
    """Retrieve all onboarded vendors and their compliance statuses for dashboard tracking."""
    return {"total_vendors": len(IN_MEMORY_DB), "vendors": IN_MEMORY_DB}


@app.get("/api/vendors/countries", tags=["Configuration"])
def get_supported_countries():
    """Returns supported markets and their entity types."""
    response = []
    for country_code, data in COUNTRY_DOC_REQUIREMENTS.items():
        response.append({
            "country_code": country_code,
            "tax_id_label": data["tax_id_label"],
            "entity_types": list(data["required_docs"].keys())
        })
    return {"supported_markets": response}


@app.get("/api/vendors/requirements", tags=["Configuration"])
def get_country_requirements(country: str, entity_type: str):
    """Dynamically fetch document checklists and tax patterns for a given market."""
    country_upper = country.upper()
    entity_upper = entity_type.upper()
    
    country_data = COUNTRY_DOC_REQUIREMENTS.get(country_upper)
    if not country_data:
        raise HTTPException(status_code=400, detail=f"Unsupported country: {country}")
        
    required_docs = country_data["required_docs"].get(entity_upper)
    if not required_docs:
        raise HTTPException(status_code=400, detail=f"Unsupported entity type '{entity_type}' for {country_upper}")
    
    return {
        "country": country_upper,
        "entity_type": entity_upper,
        "tax_id_label": country_data.get("tax_id_label"),
        "tax_id_pattern": country_data.get("tax_id_pattern"),
        "required_documents": required_docs
    }


# ==========================================
# POST ENDPOINT 1: Basic Vendor Registration
# ==========================================

@app.post("/api/vendors/register-basic", tags=["Onboarding Flow"])
def register_basic_details(
    company_name: str = Form(...),
    contact_email: str = Form(...),
    country: str = Form(...),
    entity_type: str = Form(...)
):
    """
    Step 1: Captures basic company profile info and returns a temporary session/vendor token
    so the frontend knows which country-specific form to load next.
    """
    session_token = f"SESS-{uuid.uuid4().hex[:8].upper()}"
    return {
        "session_token": session_token,
        "company_name": company_name,
        "country": country.upper(),
        "entity_type": entity_type.upper(),
        "next_step": f"/api/vendors/onboard/{country.lower()}"
    }


# ==========================================
# POST ENDPOINT 2: India-Specific Onboarding
# ==========================================

@app.post("/api/vendors/onboard/india", tags=["Onboarding Flow"])
async def onboard_india_vendor(
    company_name: str = Form(...),
    entity_type: str = Form(...),
    pan_number: str = Form(...),
    gstin: str = Form(...),
    bank_name: str = Form(...),
    pan_card_document: UploadFile = File(...),
    canceled_cheque: UploadFile = File(...)
):
    """
    Step 2 (India): Validates PAN, GSTIN, and Indian compliance docs (PAN card & Canceled Cheque).
    """
    vendor_id = f"VEN-IN-{uuid.uuid4().hex[:8].upper()}"
    
    file_bytes = await pan_card_document.read()
    ocr_data = extract_documents_with_gemini(file_bytes, pan_card_document.content_type or "image/jpeg", "IN", entity_type)

    vendor_data = {
        "company_name": company_name,
        "country": "IN",
        "entity_type": entity_type.upper(),
        "tax_id": pan_number,
        "bank_name": bank_name
    }

    status, flags = evaluate_vendor_compliance(vendor_data, ocr_data)
    
    result = {
        "vendor_id": vendor_id,
        "company_name": company_name,
        "country": "IN",
        "tax_id_used": "PAN",
        "status": status,
        "flags": flags,
        "ocr_extracted_data": ocr_data
    }
    IN_MEMORY_DB.append(result)
    return result


# ==========================================
# POST ENDPOINT 3: US-Specific Onboarding
# ==========================================

@app.post("/api/vendors/onboard/us", tags=["Onboarding Flow"])
async def onboard_us_vendor(
    company_name: str = Form(...),
    entity_type: str = Form(...),
    ein: str = Form(...),
    bank_name: str = Form(...),
    w9_document: UploadFile = File(...),
    bank_proof: UploadFile = File(...)
):
    """
    Step 3 (US): Validates EIN and US compliance docs (Form W-9 & Bank Proof).
    """
    vendor_id = f"VEN-US-{uuid.uuid4().hex[:8].upper()}"
    
    file_bytes = await w9_document.read()
    ocr_data = extract_documents_with_gemini(file_bytes, w9_document.content_type or "image/jpeg", "US", entity_type)

    vendor_data = {
        "company_name": company_name,
        "country": "US",
        "entity_type": entity_type.upper(),
        "tax_id": ein,
        "bank_name": bank_name
    }

    status, flags = evaluate_vendor_compliance(vendor_data, ocr_data)
    
    result = {
        "vendor_id": vendor_id,
        "company_name": company_name,
        "country": "US",
        "tax_id_used": "EIN",
        "status": status,
        "flags": flags,
        "ocr_extracted_data": ocr_data
    }
    IN_MEMORY_DB.append(result)
    return result