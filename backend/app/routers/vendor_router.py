# File path: backend/app/routers/vendor_router.py

import os
import json
import random
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Company, Document, AuditLog
from app.services.ai_evaluator import evaluate_application, DOC_PAN, DOC_GST, DOC_BANK

router = APIRouter(prefix="/api/vendor", tags=["Vendor Pipeline"])

UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

VALID_STATUSES = ("Approved", "Pending", "Rejected")


def normalize_status(value: str | None) -> str:
    """Old records used 'Flagged' / 'Clarification_Required'. Show them as Pending."""
    return value if value in VALID_STATUSES else "Pending"


def parse_report(raw: str | None) -> dict | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) and "decision" in data else None
    except Exception:
        return None


async def read_upload(upload: UploadFile | None, vendor_id: str):
    """Reads the uploaded file into memory and also saves a copy to disk.
    Returns (bytes, filename, saved_path) or (None, None, None)."""
    if upload is None or not upload.filename:
        return None, None, None
    data = await upload.read()
    if not data:
        return None, None, None
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{vendor_id}_{os.path.basename(upload.filename)}"
    path = os.path.join(UPLOAD_DIR, safe_name)
    try:
        with open(path, "wb") as f:
            f.write(data)
    except Exception as e:
        print(f"Could not save file to disk: {e}")
    return data, upload.filename, path


def save_documents(db: Session, company: Company, saved: dict, report: dict):
    """saved = {doc_type: path}. Stores the AI reading of each document in extracted_text."""
    extractions = report.get("extractions", {})
    for doc_type, path in saved.items():
        extracted = json.dumps(extractions.get(doc_type, {}))
        existing = db.query(Document).filter(Document.company_id == company.id, Document.doc_type == doc_type).first()
        if existing:
            existing.file_url = path
            existing.extracted_text = extracted
        else:
            db.add(Document(company_id=company.id, doc_type=doc_type, file_url=path, extracted_text=extracted))


def form_dict_from_company(company: Company, contact_name=None, designation=None) -> dict:
    return {
        "company_name": company.company_name,
        "entity_type": company.entity_type,
        "state": company.state,
        "pan_number": company.pan_number,
        "gst_registered": company.gst_registered,
        "gstin": company.gstin,
        "bank_holder_name": company.bank_holder_name,
        "bank_name": company.bank_name,
        "acc_number": company.acc_number,
        "ifsc_code": company.ifsc_code,
        "contact_name": contact_name,
        "designation": designation,
    }


def company_to_dict(company: Company, documents: list) -> dict:
    report = parse_report(company.ai_summary)
    contact = (report or {}).get("contact") or {}
    return {
        "id": company.id,
        "application_id": company.application_id,
        "vendor_id": company.vendor_id,
        "company_name": company.company_name,
        "entity_type": company.entity_type,
        "custom_entity": company.custom_entity,
        "country": company.country,
        "pincode": company.pincode,
        "state": company.state,
        "district": company.district,
        "post_office": company.post_office,
        "address_building": company.address_building,
        "address_street": company.address_street,
        "pan_number": company.pan_number,
        "gst_registered": company.gst_registered,
        "gstin": company.gstin,
        "bank_holder_name": company.bank_holder_name,
        "bank_name": company.bank_name,
        "acc_number": company.acc_number,
        "ifsc_code": company.ifsc_code,
        "contact_name": contact.get("name"),
        "designation": contact.get("designation"),
        "status": normalize_status(company.status),
        "ai_report": report,
        "ai_summary": (report or {}).get("summary") or company.ai_summary,
        "submitted_at": company.created_at,
        "documents": [
            {"doc_type": d.doc_type, "file_url": d.file_url} for d in documents
        ],
    }


@router.get("/me")
def get_vendor_profile(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "mobile_number": current_user.mobile_number,
        "role": current_user.role
    }


@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def submit_vendor_application(
    company_name: str = Form(...),
    entity_type: str = Form(...),
    custom_entity: str | None = Form(None),
    country: str = Form("India"),
    pincode: str = Form(...),
    state: str = Form(...),
    district: str = Form(...),
    post_office: str | None = Form(None),
    address_building: str | None = Form(None),
    address_street: str | None = Form(None),
    contact_name: str | None = Form(None),
    designation: str | None = Form(None),
    pan_number: str = Form(...),
    gst_registered: str = Form(...),
    gstin: str | None = Form(None),
    bank_holder_name: str = Form(...),
    bank_name: str = Form(...),
    acc_number: str = Form(...),
    ifsc_code: str = Form(...),
    pan_file: UploadFile | None = File(None),
    gst_file: UploadFile | None = File(None),
    bank_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rand_num = random.randint(10000, 99999)
    application_id = f"APP-{rand_num}"
    vendor_id = f"VEND-{rand_num}"

    if not contact_name:
        contact_name = f"{current_user.first_name} {current_user.last_name}".strip()

    files, saved = {}, {}
    uploads = [(DOC_PAN, pan_file), (DOC_BANK, bank_file)]
    if gst_registered.lower() == "yes":
        uploads.append((DOC_GST, gst_file))
    for doc_type, up in uploads:
        data, fname, path = await read_upload(up, vendor_id)
        if data:
            files[doc_type] = (data, fname)
            saved[doc_type] = path

    form = {
        "company_name": company_name, "entity_type": entity_type, "state": state,
        "pan_number": pan_number, "gst_registered": gst_registered, "gstin": gstin,
        "bank_holder_name": bank_holder_name, "bank_name": bank_name,
        "acc_number": acc_number, "ifsc_code": ifsc_code,
        "contact_name": contact_name, "designation": designation,
    }
    report = await evaluate_application(form, files)
    report["contact"]["email"] = current_user.email
    report["contact"]["mobile"] = current_user.mobile_number

    new_company = Company(
        application_id=application_id,
        vendor_id=vendor_id,
        user_id=current_user.id,
        company_name=company_name,
        entity_type=entity_type,
        custom_entity=custom_entity,
        country=country,
        pincode=pincode,
        state=state,
        district=district,
        post_office=post_office,
        address_building=address_building,
        address_street=address_street,
        pan_number=pan_number,
        gst_registered=gst_registered,
        gstin=gstin,
        bank_holder_name=bank_holder_name,
        bank_name=bank_name,
        acc_number=acc_number,
        ifsc_code=ifsc_code,
        status=report["decision"],
        ai_summary=json.dumps(report, default=str),
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    save_documents(db, new_company, saved, report)
    db.add(AuditLog(
        company_id=new_company.id,
        actor_email="ai-engine@vendorgate",
        action_text=f"AI verification: {report['decision']}",
        remark=report["headline"],
    ))
    db.commit()

    return {
        "message": "Application submitted and verified",
        "application_id": new_company.application_id,
        "vendor_id": new_company.vendor_id,
        "status": new_company.status,
        "report": report,
        "ai_evaluations": report["documents"],
    }


@router.get("/status")
def get_application_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    companies = db.query(Company).filter(Company.user_id == current_user.id).order_by(Company.created_at.desc()).all()
    if not companies:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vendor applications found for this account.")

    results = []
    for c in companies:
        report = parse_report(c.ai_summary) or {}
        results.append({
            "id": c.id,
            "application_id": c.application_id,
            "vendor_id": c.vendor_id,
            "company_name": c.company_name,
            "entity_type": c.entity_type,
            "status": normalize_status(c.status),
            "headline": report.get("headline", ""),
            "actions_needed": len(report.get("vendor_actions", [])),
            "submitted_at": c.created_at,
        })
    return results


@router.put("/update", status_code=status.HTTP_200_OK)
async def update_vendor_application(
    vendor_id: str = Form(...),
    company_name: str | None = Form(None),
    pan_number: str | None = Form(None),
    gst_registered: str | None = Form(None),
    gstin: str | None = Form(None),
    bank_holder_name: str | None = Form(None),
    bank_name: str | None = Form(None),
    acc_number: str | None = Form(None),
    ifsc_code: str | None = Form(None),
    contact_name: str | None = Form(None),
    designation: str | None = Form(None),
    pan_file: UploadFile | None = File(None),
    gst_file: UploadFile | None = File(None),
    bank_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """'Fix & Resubmit': vendor corrects fields and/or re-uploads documents, AI re-verifies."""
    company = db.query(Company).filter(Company.vendor_id == vendor_id, Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or unauthorized to update this vendor record.")

    old_report = parse_report(company.ai_summary) or {}
    old_contact = old_report.get("contact") or {}

    # Only overwrite fields that were sent and are not empty
    for field, value in {
        "company_name": company_name, "pan_number": pan_number, "gst_registered": gst_registered,
        "gstin": gstin, "bank_holder_name": bank_holder_name, "bank_name": bank_name,
        "acc_number": acc_number, "ifsc_code": ifsc_code,
    }.items():
        if value is not None and str(value).strip() != "":
            setattr(company, field, value.strip())

    # Previous AI readings for documents not re-uploaded
    previous = {}
    for d in db.query(Document).filter(Document.company_id == company.id).all():
        try:
            previous[d.doc_type] = json.loads(d.extracted_text or "{}")
        except Exception:
            previous[d.doc_type] = {}

    files, saved = {}, {}
    for doc_type, up in [(DOC_PAN, pan_file), (DOC_GST, gst_file), (DOC_BANK, bank_file)]:
        data, fname, path = await read_upload(up, vendor_id)
        if data:
            files[doc_type] = (data, fname)
            saved[doc_type] = path

    form = form_dict_from_company(
        company,
        contact_name=contact_name or old_contact.get("name"),
        designation=designation or old_contact.get("designation"),
    )
    report = await evaluate_application(form, files, previous_extractions=previous)
    report["contact"]["email"] = current_user.email
    report["contact"]["mobile"] = current_user.mobile_number

    company.status = report["decision"]
    company.ai_summary = json.dumps(report, default=str)
    save_documents(db, company, saved, report)
    db.add(AuditLog(
        company_id=company.id,
        actor_email=current_user.email,
        action_text=f"Vendor resubmitted. AI re-verification: {report['decision']}",
        remark=report["headline"],
    ))
    db.commit()
    db.refresh(company)

    return {
        "message": "Application updated and re-verified",
        "application_id": company.application_id,
        "vendor_id": company.vendor_id,
        "status": company.status,
        "report": report,
        "ai_evaluations": report["documents"],
    }


@router.get("/companies/{vendor_id}")
def get_company_details(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.vendor_id == vendor_id, Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or unauthorized.")
    documents = db.query(Document).filter(Document.company_id == company.id).all()
    data = company_to_dict(company, documents)
    logs = db.query(AuditLog).filter(AuditLog.company_id == company.id).order_by(AuditLog.created_at.asc()).all()
    data["activity"] = [vendor_activity(l) for l in logs]
    return data


def vendor_activity(log) -> dict:
    """Timeline entry as the vendor should see it: no internal process details."""
    text = log.action_text or ""
    status = text.rsplit(":", 1)[-1].strip().split(" ")[0] if ":" in text else ""
    if text.startswith("Vendor resubmitted"):
        action, remark = f"Application resubmitted and re-checked: {status}", None
    elif text.startswith("AI verification"):
        action, remark = f"Application submitted and checked: {status}", None
    elif text.startswith("Admin final decision"):
        action, remark = f"Procurement team decision: {status}", log.remark or None
    else:
        action, remark = text, None
    return {"action": action, "remark": remark, "by": None, "at": log.created_at}
