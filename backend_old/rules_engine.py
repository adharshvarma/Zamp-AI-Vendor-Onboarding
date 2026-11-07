# backend/rules_engine.py

import re
from thefuzz import fuzz
from constants import COUNTRY_DOC_REQUIREMENTS

def evaluate_vendor_compliance(vendor_data: dict, ocr_data: dict) -> tuple[str, list]:
    country = vendor_data.get("country", "US")
    entity_type = vendor_data.get("entity_type", "LLC")
    input_legal_name = vendor_data.get("company_name", "")
    input_tax_id = vendor_data.get("tax_id", "")
    input_bank_name = vendor_data.get("bank_name", "")

    extracted_name = ocr_data.get("extracted_legal_name")
    extracted_tax_id = ocr_data.get("extracted_tax_id")
    extracted_bank = ocr_data.get("extracted_bank_name")

    flags = []
    
    # 1. Country-Specific Tax ID Format Validation
    country_rules = COUNTRY_DOC_REQUIREMENTS.get(country, COUNTRY_DOC_REQUIREMENTS["US"])
    tax_pattern = country_rules["tax_id_pattern"]
    
    if input_tax_id and not re.match(tax_pattern, input_tax_id):
        tax_label = country_rules["tax_id_label"]
        flags.append(f"INVALID_{tax_label}_FORMAT")

    # 2. Check if Document is Blank / Unfilled via AI Extraction
    if not extracted_name or extracted_name == "null" or "blank" in ocr_data.get("ai_message", "").lower():
        return "REJECTED", ["BLANK_OR_UNREADABLE_DOCUMENT"]

    # 3. Fuzzy Name Matching (Tax Document vs Intake Form)
    name_similarity = fuzz.ratio(input_legal_name.lower(), extracted_name.lower())
    if name_similarity < 60:
        flags.append(f"SEVERE_TAX_DOC_NAME_MISMATCH ({name_similarity}%)")
    elif name_similarity < 85:
        flags.append(f"MINOR_TAX_DOC_NAME_MISMATCH ({name_similarity}%)")

    # 4. Bank Name Matching
    if extracted_bank:
        bank_similarity = fuzz.ratio(input_bank_name.lower(), extracted_bank.lower())
        if bank_similarity < 70:
            flags.append(f"MINOR_BANK_NAME_MISMATCH ({bank_similarity}%)")

    # 5. Determine Final Status
    if any("SEVERE" in flag for flag in flags) or any("INVALID" in flag for flag in flags):
        status = "REJECTED"
    elif len(flags) > 0:
        status = "PENDING_REMEDIATION"
    else:
        status = "APPROVED"

    return status, flags