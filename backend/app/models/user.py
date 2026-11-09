from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    mobile_number = Column(String(20), nullable=False)
    role = Column(String(50), nullable=False, default="vendor")
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())