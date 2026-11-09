from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    doc_type = Column(String(50), nullable=False)
    file_url = Column(Text, nullable=False)
    extracted_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

    company = relationship("Company", back_populates="documents")