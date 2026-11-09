from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Updated with your correct project ID (kuseahrviqotnqaouegw)
DATABASE_URL = "postgresql+psycopg2://postgres.kuseahrviqotnqaouegw:MWsSAUWvzF3@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()