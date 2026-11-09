from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="vendor")
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(String(50), unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    company_name = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=False)
    custom_entity = Column(String(100))
    country = Column(String(100), default="India")
    pincode = Column(String(10), nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    post_office = Column(String(150))
    address_building = Column(String(255))
    address_street = Column(String(255))
    pan_number = Column(String(20), nullable=False)
    gst_registered = Column(String(10), nullable=False)
    gstin = Column(String(20))
    bank_holder_name = Column(String(255), nullable=False)
    bank_name = Column(String(150), nullable=False)
    acc_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="company", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    doc_type = Column(String(50), nullable=False)
    file_url = Column(Text, nullable=False)
    extracted_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

    company = relationship("Company", back_populates="documents")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    actor_email = Column(String(255), nullable=False)
    action_text = Column(Text, nullable=False)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

    company = relationship("Company", back_populates="audit_logs")