# File path: backend/app/routers/admin_router.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Company, Document, AuditLog, User
from app.routers.vendor_router import normalize_status, parse_report, company_to_dict

router = APIRouter(prefix="/api/admin", tags=["Admin Review Operations"])

ALLOWED = ("Approved", "Pending", "Rejected")


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


class ReviewActionPayload(BaseModel):
    status: str  # 'Approved' | 'Pending' | 'Rejected'
    remark: Optional[str] = ""


@router.get("/applications")
def get_all_applications(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    results = []
    for comp in companies:
        report = parse_report(comp.ai_summary) or {}
        contact = report.get("contact") or {}
        results.append({
            "id": comp.id,
            "applicationId": comp.application_id,
            "vendorId": comp.vendor_id,
            "companyName": comp.company_name,
            "entityType": comp.entity_type,
            "status": normalize_status(comp.status),
            "aiDecision": report.get("decision"),
            "headline": report.get("headline") or "Submitted before AI engine v2 - open to review",
            "counts": report.get("counts"),
            "contactName": contact.get("name"),
            "designation": contact.get("designation"),
            "createdAt": comp.created_at,
        })
    return results


@router.get("/applications/{company_id}")
def get_application_detail(company_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company application not found.")
    documents = db.query(Document).filter(Document.company_id == company.id).all()
    data = company_to_dict(company, documents)
    logs = db.query(AuditLog).filter(AuditLog.company_id == company.id).order_by(AuditLog.created_at.asc()).all()
    data["activity"] = [
        {"action": l.action_text, "remark": l.remark, "by": l.actor_email, "at": l.created_at} for l in logs
    ]
    return data


@router.post("/applications/{company_id}/review")
def review_application(company_id: int, payload: ReviewActionPayload,
                       db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company application not found.")

    if payload.status not in ALLOWED:
        raise HTTPException(status_code=400, detail="Status must be Approved, Pending or Rejected.")

    report = parse_report(company.ai_summary) or {}
    ai_decision = report.get("decision")
    remark = (payload.remark or "").strip()
    is_override = ai_decision is not None and payload.status != ai_decision
    if is_override and not remark:
        raise HTTPException(status_code=400,
            detail=f"The AI recommended '{ai_decision}'. A remark is required to override it.")

    company.status = payload.status
    action = f"Admin final decision: {payload.status}"
    if is_override:
        action += f" (overrode AI recommendation: {ai_decision})"
    db.add(AuditLog(company_id=company.id, actor_email=admin.email, action_text=action, remark=remark))
    db.commit()

    return {
        "status": "Success",
        "applicationId": company.application_id,
        "newStatus": company.status,
        "remark": remark,
    }
