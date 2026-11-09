# File path: backend/app/routers/admin_router.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models import Company, Document, AuditLog
from app.constants import STATUS_APPROVED, STATUS_REJECTED, STATUS_CLARIFICATION

router = APIRouter(prefix="/api/admin", tags=["Admin Review Operations"])

class ReviewActionPayload(BaseModel):
    status: str # 'Approved', 'Rejected', 'Clarification_Required'
    remark: Optional[str] = ""
    admin_email: str = "admin@VendorGate.ai"

@router.get("/applications")
def get_all_applications(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    results = []
    for comp in companies:
        docs = [{"doc_type": d.doc_type, "file_url": d.file_url} for d in comp.documents]
        results.append({
            "id": comp.id,
            "applicationId": comp.application_id,
            "vendorId": comp.vendor_id,
            "companyName": comp.company_name,
            "entityType": comp.entity_type,
            "status": comp.status,
            "createdAt": comp.created_at,
            "documents": docs
        })
    return results

@router.post("/applications/{company_id}/review")
def review_application(company_id: int, payload: ReviewActionPayload, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company application not found.")

    if payload.status not in [STATUS_APPROVED, STATUS_REJECTED, STATUS_CLARIFICATION]:
        raise HTTPException(status_code=400, detail="Invalid status update value.")

    company.status = payload.status
    
    # Record Audit Log (Adjust fields if your AuditLog model differs)
    audit = AuditLog(
        company_id=company.id,
        actor_email=payload.admin_email,
        action_text=f"Status updated to {payload.status}",
        remark=payload.remark
    )
    db.add(audit)
    db.commit()

    return {
        "status": "Success",
        "applicationId": company.application_id,
        "newStatus": company.status,
        "remark": payload.remark
    }