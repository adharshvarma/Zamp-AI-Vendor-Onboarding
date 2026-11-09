from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String, unique=True, index=True)
    vendor_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String, index=True)
    entity_type = Column(String)
    custom_entity = Column(String, nullable=True)
    country = Column(String, default="India")
    pincode = Column(String)
    state = Column(String)
    district = Column(String)
    post_office = Column(String, nullable=True)
    address_building = Column(String, nullable=True)
    address_street = Column(String, nullable=True)
    pan_number = Column(String)
    gst_registered = Column(String)
    gstin = Column(String, nullable=True)
    bank_holder_name = Column(String)
    bank_name = Column(String)
    acc_number = Column(String)
    ifsc_code = Column(String)
    status = Column(String, default="Pending")
    ai_summary = Column(Text, nullable=True)  # <-- Stores JSON string or summary text of AI results
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="company", cascade="all, delete-orphan")