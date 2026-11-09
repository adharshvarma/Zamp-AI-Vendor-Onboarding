from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"extend_existing": True}
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    actor_email = Column(String(255), nullable=False)
    action_text = Column(Text, nullable=False)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

    company = relationship("Company", back_populates="audit_logs")