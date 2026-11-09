STATUS_PENDING = "Pending"
STATUS_APPROVED = "Approved"
STATUS_REJECTED = "Rejected"
STATUS_CLARIFICATION = "Clarification_Required"

ENTITY_TYPES = [
    "Sole Proprietorship",
    "Partnership",
    "LLP",
    "Private Limited Company",
    "Public Limited Company",
    "Other"
]

AI_VERIFICATION_SYSTEM_PROMPT = """
You are an AI compliance verification officer for Indian corporate vendor onboarding.
Analyze the vendor submission and extracted OCR data against statutory rules.
Perform cross-document consistency checks and return a valid JSON list where each object has these exact keys:
- "document" (string, e.g., "PAN Card", "GST Certificate", "Cancelled Cheque")
- "extracted" (string)
- "status" (string, must be "Completed")
- "result" (string, must be "Pass" or "Review")
- "remarks" (string detailing specific consistency check findings)

Return ONLY valid JSON format. No markdown blocks, just the JSON array.
"""

EMAIL_TEMPLATES = {
    "welcome": {
        "subject": "Welcome to ClearVend — Vendor Portal Account Created",
        "body": "Dear {name},\n\nYour personal vendor account has been successfully created on ClearVend. You can now log in to register and manage your company entities.\n\nBest regards,\nClearVend Team"
    },
    "approval": {
        "subject": "Application Approved — {company_name} ({application_id})",
        "body": "Congratulations!\n\nYour vendor onboarding application for {company_name} has been approved by the admin team. Your Vendor ID is {vendor_id}.\n\nWelcome aboard!"
    },
    "clarification": {
        "subject": "Action Required: Clarification Requested for {company_name}",
        "body": "Hello {name},\n\nYour application for {company_name} requires minor corrections or re-upload of documents.\n\nAdmin Remark: {remark}\n\nPlease log in to your dashboard to update the required files."
    }
}