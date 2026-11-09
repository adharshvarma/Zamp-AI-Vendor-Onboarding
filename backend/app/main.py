import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import verify_router, vendor_router, admin_router, auth_router

app = FastAPI(title="VendorGate API", version="1.0.0")

# Read from environment variable, supporting multiple comma-separated URLs
env_origins = os.getenv("CORS_ORIGINS", "")
if env_origins:
    origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
else:
    # Default local dev origins if environment variable is not provided
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify_router.router)
app.include_router(vendor_router.router)
app.include_router(admin_router.router)
app.include_router(auth_router.router)  # Include the auth router for authentication endpoints

@app.get("/")
def root():
    return {"message": "VendorGate Cloud Backend is running successfully!"}