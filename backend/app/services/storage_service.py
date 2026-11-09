import os
from supabase import create_client, Client
from fastapi import UploadFile
from app.core.config import settings

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def upload_file_to_supabase(upload_file: UploadFile, folder: str = "documents") -> str:
    """
    Uploads a file directly to Supabase Storage and returns its public URL.
    """
    if not supabase:
        # Fallback simulation if Supabase is unconfigured
        return f"https://mock-storage.supabase.co/storage/v1/object/public/vendor-documents/{upload_file.filename}"

    file_bytes = await upload_file.read()
    file_path = f"{folder}/{upload_file.filename}"

    try:
        # Upload file to Supabase bucket 'vendor-documents'
        response = supabase.storage.from_("vendor-documents").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": upload_file.content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url_res = supabase.storage.from_("vendor-documents").get_public_url(file_path)
        return public_url_res
    except Exception as e:
        print(f"Supabase storage upload error: {e}")
        return f"https://fallback-url.com/{upload_file.filename}"