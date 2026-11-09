from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional
from sqlalchemy.orm import Session
from app.services.storage_service import upload_file_to_supabase
from app.services.ai_evaluator import evaluate_vendor_documents_with_groq
from app.core.database import get_db

router = APIRouter(prefix="/api", tags=["Verification"])
@router.post("/verify")
async def verify_vendor_application(
    applicationId: Optional[str] = Form(None),
    application_id: Optional[str] = Form(None),
    companyName: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    panNumber: Optional[str] = Form(None),
    pan_number: Optional[str] = Form(None),
    gstin: Optional[str] = Form(None),
    ifscCode: Optional[str] = Form(None),
    ifsc_code: Optional[str] = Form(None),
    accNumber: Optional[str] = Form(None),
    acc_number: Optional[str] = Form(None),
    panDoc: Optional[UploadFile] = File(None),
    pan_file: Optional[UploadFile] = File(None),
    gstDoc: Optional[UploadFile] = File(None),
    gst_file: Optional[UploadFile] = File(None),
    bankProof: Optional[UploadFile] = File(None),
    bank_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Normalize variables (fallback to whichever was provided)
    app_id = applicationId or application_id or "APP-DEFAULT"
    comp_name = companyName or company_name or "Unknown Company"
    pan = panNumber or pan_number or ""
    ifsc = ifscCode or ifsc_code or ""
    acc = accNumber or acc_number or ""
    
    pan_f = panDoc or pan_file
    gst_f = gstDoc or gst_file
    bank_f = bankProof or bank_file

    try:
        extracted_texts = []
        uploaded_files = [("PAN Card", pan_f), ("GST Certificate", gst_f), ("Cancelled Cheque", bank_f)]
        file_urls = {}

        for doc_type, file in uploaded_files:
            if file:
                public_url = await upload_file_to_supabase(file, folder=app_id)
                file_urls[doc_type] = public_url
                
                filename = file.filename.lower()
                if "pan" in filename or doc_type == "PAN Card":
                    extracted_texts.append(f"PAN Card Number: {pan} Name: {comp_name}")
                elif "gst" in filename or doc_type == "GST Certificate":
                    extracted_texts.append(f"GSTIN: {gstin} Legal Name: {comp_name}")
                elif "cheque" in filename or "bank" in filename or doc_type == "Cancelled Cheque":
                    extracted_texts.append(f"IFSC: {ifsc} A/c No: {acc} Name: {comp_name}")

        company_payload = {
            "companyName": comp_name,
            "panNumber": pan,
            "gstin": gstin,
            "ifscCode": ifsc,
            "accNumber": acc
        }

        verification_results = await evaluate_vendor_documents_with_groq(company_payload, extracted_texts)

        return {
            "applicationId": app_id,
            "status": "Success",
            "cloudStorageUrls": file_urls,
            "results": verification_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))