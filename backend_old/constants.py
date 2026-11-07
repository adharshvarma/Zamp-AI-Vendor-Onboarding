# --- Form Options & Country Definitions ---
COUNTRY_OPTIONS = [
    {"code": "US", "label": "United States"},
    {"code": "IN", "label": "India"}
]

ENTITY_TYPES = {
    "US": [
        {"value": "LLC", "label": "Limited Liability Company (LLC)"},
        {"value": "CORP", "label": "Corporation"},
        {"value": "SOLE_PROP", "label": "Sole Proprietorship"}
    ],
    "IN": [
        {"value": "PVT_LTD", "label": "Private Limited (Pvt Ltd)"},
        {"value": "PUBLIC_LTD", "label": "Public Limited"},
        {"value": "LLP", "label": "Limited Liability Partnership (LLP)"},
        {"value": "SOLE_PROP", "label": "Sole Proprietorship"}
    ]
}

REQUIRED_DOCUMENTS = {
    "US": [
        {"id": "w9_file", "label": "Form W-9", "required": True},
        {"id": "banking_file", "label": "Voided Check / Bank Letter", "required": True},
        {"id": "coi_file", "label": "Certificate of Insurance (COI)", "required": True}
    ],
    "IN": [
        {"id": "pan_file", "label": "PAN Card", "required": True},
        {"id": "gst_file", "label": "GST Registration Certificate", "required": True},
        {"id": "banking_file", "label": "Cancelled Cheque / Bank Passbook", "required": True},
        {"id": "udyam_file", "label": "Udyam MSME Certificate", "required": False}, # Conditional for 45-day rule
        {"id": "coi_file", "label": "Certificate of Incorporation", "required": False} # Mandatory only for Pvt Ltd/LLP
    ]
}

# --- Routing Statuses & Failure Flags ---
STATUS_APPROVED = "APPROVED"
STATUS_PENDING = "PENDING_REMEDIATION"
STATUS_REJECTED = "REJECTED"

FLAG_INVALID_EIN = "INVALID_US_EIN_FORMAT"
FLAG_INVALID_ROUTING = "INVALID_US_ROUTING_FORMAT"
FLAG_INVALID_PAN = "INVALID_INDIAN_PAN_FORMAT"
FLAG_INVALID_GSTIN = "INVALID_GSTIN_FORMAT"
FLAG_INVALID_IFSC = "INVALID_IFSC_CODE_FORMAT"

COUNTRY_DOC_REQUIREMENTS = {
    "US": {
        "tax_id_label": "EIN",
        "tax_id_pattern": r"^\d{2}-\d{7}$",  # Example US EIN pattern: XX-XXXXXXX
        "required_docs": {
            "LLC": ["Form W-9", "Articles of Organization", "Bank Proof (Voided Check/Letter)"],
            "C_CORP": ["Form W-9", "Articles of Incorporation", "Certificate of Good Standing", "Bank Proof"],
            "S_CORP": ["Form W-9", "Articles of Incorporation", "Certificate of Good Standing", "Bank Proof"],
            "PARTNERSHIP": ["Form W-9", "Partnership Agreement", "Bank Proof"],
            "SOLE_PROPRIETOR": ["Form W-9", "Bank Proof"]
        }
    },
    "IN": {
        "tax_id_label": "PAN",
        "tax_id_pattern": r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$",  # Standard Indian PAN pattern: ABCDE1234F
        "secondary_tax_label": "GSTIN",
        "secondary_tax_pattern": r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$", # GSTIN pattern
        "required_docs": {
            "PRIVATE_LIMITED": ["PAN Card", "GST Registration Certificate", "Certificate of Incorporation", "Canceled Cheque"],
            "LLP": ["PAN Card", "GST Registration Certificate", "LLP Agreement", "Canceled Cheque"],
            "PARTNERSHIP": ["PAN Card", "GST Registration Certificate", "Partnership Deed", "Canceled Cheque"],
            "SOLE_PROPRIETOR": ["PAN Card", "GST Registration Certificate", "Udyam Registration", "Canceled Cheque"]
        }
    }
}