import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "VendorGate AI Backend"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    UPLOAD_DIR: str = "backend/uploads"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)