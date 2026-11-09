# File path: backend/app/services/ai_evaluator.py
#
# VendorGate verification engine
# ------------------------------------------------------------------
# Design (how real KYB tools work):
#   STEP 1 - AI READS:  a Groq vision model looks at each uploaded image and
#                       returns the fields it can see (PAN, names, GSTIN,
#                       account number, IFSC...). It does NOT decide anything.
#   STEP 2 - RULES CHECK: plain Python rules compare the form against what the
#                       AI read. Same input -> same result, every time.
#   STEP 3 - DECISION:   any FAIL -> Rejected, any WARN -> Pending,
#                       all PASS -> Approved. Every check carries a reason and,
#                       if needed, the exact action the vendor must take.
# ------------------------------------------------------------------

import asyncio
import base64
import json
import os
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher

import httpx

from app.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Vision models tried in order. You can override with a Render env var
# GROQ_VISION_MODEL (comma separated) without touching code.
DEFAULT_VISION_MODELS = [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]

MAX_IMAGE_BYTES = 4 * 1024 * 1024  # Groq limit for base64 images
IMAGE_MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}

DOC_PAN = "PAN Card"
DOC_GST = "GST Certificate"
DOC_BANK = "Cancelled Cheque"

STATUS_APPROVED = "Approved"
STATUS_PENDING = "Pending"
STATUS_REJECTED = "Rejected"

PASS, WARN, FAIL, INFO = "pass", "warn", "fail", "info"

GST_STATE_CODES = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman and Diu", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
    "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
}

# 4th character of a PAN tells the holder type
PAN_HOLDER_TYPES = {
    "C": "Company", "P": "Individual / Proprietor", "F": "Firm / LLP", "H": "HUF",
    "A": "Association of Persons", "T": "Trust", "B": "Body of Individuals",
    "L": "Local Authority", "J": "Artificial Juridical Person", "G": "Government",
}
ENTITY_EXPECTED_PAN_TYPE = {
    "Private Limited Company": "C",
    "Public Limited Company": "C",
    "LLP": "F",
    "Partnership": "F",
    "Sole Proprietorship": "P",
}

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
ACCOUNT_RE = re.compile(r"^[0-9]{9,18}$")


# ==================================================================
# STEP 1 - AI document reading (Groq vision)
# ==================================================================

EXTRACTION_PROMPTS = {
    DOC_PAN: """Read this image. It is supposed to be an Indian PAN card.
Return ONLY a JSON object with these keys:
{"document_type_detected": one of ["PAN Card","GST Certificate","Cancelled Cheque","Aadhaar Card","Bank Statement","Other"],
 "is_legible": true/false,
 "pan_number": "10 character PAN exactly as printed, or null",
 "name": "name printed on the card, or null",
 "date": "date of birth / incorporation as printed, or null"}""",
    DOC_GST: """Read this image. It is supposed to be an Indian GST Registration Certificate (Form GST REG-06).
Return ONLY a JSON object with these keys:
{"document_type_detected": one of ["PAN Card","GST Certificate","Cancelled Cheque","Aadhaar Card","Bank Statement","Other"],
 "is_legible": true/false,
 "gstin": "15 character registration number exactly as printed, or null",
 "legal_name": "legal name, or null",
 "trade_name": "trade name, or null",
 "constitution": "constitution of business, or null",
 "address": "principal place of business, or null",
 "state": "state name, or null"}""",
    DOC_BANK: """Read this image. It is supposed to be an Indian cancelled cheque or bank proof.
Return ONLY a JSON object with these keys:
{"document_type_detected": one of ["PAN Card","GST Certificate","Cancelled Cheque","Aadhaar Card","Bank Statement","Other"],
 "is_legible": true/false,
 "account_number": "account number digits exactly as printed, or null",
 "ifsc": "11 character IFSC exactly as printed, or null",
 "bank_name": "bank name, or null",
 "account_holder_name": "account holder / company name printed on it, or null",
 "is_cancelled": true if the word CANCELLED or crossed lines are visible, else false}""",
}

SYSTEM_PROMPT = (
    "You are a precise document reader for Indian vendor KYC. "
    "Copy numbers and names exactly as printed. Never guess or invent values; "
    "use null when a field is not visible. Output raw JSON only, no markdown, no explanation."
)


def _models():
    env = os.getenv("GROQ_VISION_MODEL", "").strip()
    if env:
        return [m.strip() for m in env.split(",") if m.strip()]
    return DEFAULT_VISION_MODELS


def _parse_json(text: str):
    if not text:
        return None
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


async def extract_document_fields(doc_type: str, file_bytes: bytes | None, filename: str) -> dict:
    """Ask the vision model to read one document. Returns a dict that always has
    'read_ok' (True/False) and 'read_error' (str or None)."""
    if not file_bytes:
        return {"read_ok": False, "read_error": "missing"}

    ext = os.path.splitext(filename or "")[1].lower()
    mime = IMAGE_MIME.get(ext)
    if not mime:
        return {"read_ok": False, "read_error": "unsupported_format"}
    if len(file_bytes) > MAX_IMAGE_BYTES:
        return {"read_ok": False, "read_error": "too_large"}

    api_key = (settings.GROQ_API_KEY or "").strip()
    if not api_key:
        return {"read_ok": False, "read_error": "ai_unavailable"}

    data_url = f"data:{mime};base64,{base64.b64encode(file_bytes).decode('utf-8')}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    last_error = "ai_unavailable"

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in _models():
            # Some models accept 'reasoning_format', some don't -> try both ways
            for extra in ({"reasoning_format": "hidden"}, {}):
                payload = {
                    "model": model,
                    "temperature": 0,
                    "max_tokens": 800,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": [
                            {"type": "text", "text": EXTRACTION_PROMPTS[doc_type]},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ]},
                    ],
                    **extra,
                }
                try:
                    resp = await client.post(GROQ_URL, json=payload, headers=headers)
                    if resp.status_code == 429:
                        await asyncio.sleep(3)
                        resp = await client.post(GROQ_URL, json=payload, headers=headers)
                    if resp.status_code == 401:
                        print("Groq: invalid API key")
                        return {"read_ok": False, "read_error": "ai_unavailable"}
                    if resp.status_code != 200:
                        print(f"Groq {model} {extra} -> {resp.status_code}: {resp.text[:300]}")
                        continue
                    content = resp.json()["choices"][0]["message"].get("content") or ""
                    parsed = _parse_json(content)
                    if parsed is None:
                        print(f"Groq {model}: could not parse JSON: {content[:300]}")
                        last_error = "unreadable"
                        continue
                    parsed["read_ok"] = True
                    parsed["read_error"] = None
                    parsed["model"] = model
                    return parsed
                except Exception as e:
                    print(f"Groq {model} exception: {e}")
                    continue

    return {"read_ok": False, "read_error": last_error}


# ==================================================================
# Helpers for STEP 2
# ==================================================================

def _clean_id(value) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def _clean_digits(value) -> str:
    return re.sub(r"[^0-9]", "", str(value or ""))


def _clean_ifsc(value) -> str:
    v = _clean_id(value)
    if len(v) == 11 and v[4] == "O":  # common OCR confusion O vs 0
        v = v[:4] + "0" + v[5:]
    return v


SUFFIX_MAP = [
    (r"\bPVT\b", "PRIVATE"), (r"\bPRIV\b", "PRIVATE"), (r"\bLTD\b", "LIMITED"),
    (r"\bCO\b", "COMPANY"), (r"\bCORP\b", "CORPORATION"), (r"&", " AND "),
]
LEGAL_SUFFIX_WORDS = {"PRIVATE", "LIMITED", "LLP", "COMPANY", "CORPORATION", "INC", "THE", "MS", "M", "S", "OPC"}


def _normalize_name(name) -> str:
    n = str(name or "").upper()
    n = n.replace("M/S", " ").replace("M/s", " ")
    for pattern, repl in SUFFIX_MAP:
        n = re.sub(pattern, repl, n)
    n = re.sub(r"[^A-Z0-9 ]", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def _core_name(name) -> str:
    words = [w for w in _normalize_name(name).split() if w not in LEGAL_SUFFIX_WORDS]
    return " ".join(words)


def name_similarity(a, b) -> float:
    """0.0 - 1.0. Ignores case, punctuation and Pvt/Private, Ltd/Limited differences."""
    ca, cb = _core_name(a), _core_name(b)
    if not ca or not cb:
        return 0.0
    if ca == cb:
        return 1.0
    return round(SequenceMatcher(None, ca, cb).ratio(), 2)


def _state_key(name) -> str:
    return re.sub(r"[^a-z]", "", str(name or "").lower().replace("&", "and"))


# Name match thresholds (documented rules)
NAME_MATCH = 0.90     # >= 90% similar -> same entity
NAME_PARTIAL = 0.60   # 60-89% -> probably same, ask vendor to clarify (Pending)
                      # < 60% -> different entity (Rejected)


def _check(check_id, label, status, detail, action=None, document=None):
    return {"id": check_id, "label": label, "status": status, "detail": detail,
            "vendor_action": action, "document": document}


def _read_problem_check(doc, extraction, check_id):
    """Turns a failed AI read into a clear Pending check."""
    err = extraction.get("read_error")
    messages = {
        "missing": (f"{doc} was not uploaded.", f"Upload your {doc}."),
        "unsupported_format": (f"{doc} is not an image file (JPG/PNG required).",
                               f"Re-upload your {doc} as a JPG or PNG photo/scan."),
        "too_large": (f"{doc} file is larger than 4 MB.", f"Re-upload a smaller {doc} image (under 4 MB)."),
        "unreadable": (f"{doc} could not be read clearly.", f"Re-upload a clear, uncropped image of your {doc}."),
        "ai_unavailable": (f"Automatic reading of {doc} was unavailable; sent to manual review.", None),
    }
    detail, action = messages.get(err, messages["unreadable"])
    return _check(check_id, f"{doc} readable", WARN, detail, action, doc)


# ==================================================================
# STEP 2 - Rules
# ==================================================================

def run_rules(form: dict, extractions: dict) -> list:
    checks = []
    company = form.get("company_name") or ""
    entity = form.get("entity_type") or ""
    form_state = form.get("state") or ""
    form_pan = _clean_id(form.get("pan_number"))
    gst_yes = str(form.get("gst_registered") or "").lower() == "yes"
    form_gstin = _clean_id(form.get("gstin"))
    form_acc = _clean_digits(form.get("acc_number"))
    form_ifsc = _clean_ifsc(form.get("ifsc_code"))
    form_holder = form.get("bank_holder_name") or ""

    # ---------------- PAN ----------------
    doc = DOC_PAN
    if PAN_RE.match(form_pan):
        checks.append(_check("pan_format", "PAN format", PASS, f"{form_pan} is a valid PAN format.", None, doc))
        expected = ENTITY_EXPECTED_PAN_TYPE.get(entity)
        holder_code = form_pan[3]
        holder = PAN_HOLDER_TYPES.get(holder_code, "Unknown")
        if expected and holder_code != expected:
            checks.append(_check("pan_entity", "PAN holder type vs entity type", INFO,
                f"PAN 4th letter '{holder_code}' means '{holder}', but entity type is '{entity}' "
                f"(expected '{PAN_HOLDER_TYPES[expected]}'). Flagged for admin attention.", None, doc))
        else:
            checks.append(_check("pan_entity", "PAN holder type vs entity type", PASS,
                f"PAN holder type '{holder}' is consistent with '{entity}'.", None, doc))
    else:
        checks.append(_check("pan_format", "PAN format", WARN,
            f"PAN '{form.get('pan_number') or ''}' is not valid. A PAN has 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).",
            "Correct the PAN number in your application.", doc))

    ex = extractions.get(DOC_PAN, {})
    if not ex.get("read_ok"):
        checks.append(_read_problem_check(doc, ex, "pan_read"))
    elif ex.get("document_type_detected") not in (None, DOC_PAN):
        checks.append(_check("pan_doctype", "Correct document uploaded", WARN,
            f"The file uploaded as PAN Card looks like a '{ex.get('document_type_detected')}'.",
            "Upload your PAN card in the PAN Card slot.", doc))
    elif ex.get("is_legible") is False:
        checks.append(_check("pan_read", "PAN Card readable", WARN, "PAN card image is blurry or cropped.",
            "Re-upload a clear image of your PAN card.", doc))
    else:
        doc_pan = _clean_id(ex.get("pan_number"))
        if not doc_pan:
            checks.append(_check("pan_match", "PAN on card = PAN in form", WARN,
                "PAN number could not be found on the uploaded card.", "Re-upload a clear image of your PAN card.", doc))
        elif doc_pan == form_pan:
            checks.append(_check("pan_match", "PAN on card = PAN in form", PASS, f"Card shows {doc_pan}, matches form.", None, doc))
        elif not PAN_RE.match(form_pan):
            checks.append(_check("pan_match", "PAN on card = PAN in form", WARN,
                f"Card shows {doc_pan}; the PAN typed in the form looks like a typo.",
                f"Correct the PAN in the form (card shows {doc_pan}).", doc))
        else:
            checks.append(_check("pan_match", "PAN on card = PAN in form", FAIL,
                f"Card shows {doc_pan} but form says {form_pan or '(blank)'}. The PAN card belongs to a different PAN.",
                "Submit the PAN card that matches the PAN entered, or correct the PAN number.", doc))

        doc_name = ex.get("name")
        if doc_name:
            sim = name_similarity(doc_name, company)
            if sim >= NAME_MATCH:
                checks.append(_check("pan_name", "Name on PAN = company name", PASS,
                    f"'{doc_name}' matches '{company}' ({int(sim*100)}% similar).", None, doc))
            elif sim >= NAME_PARTIAL:
                checks.append(_check("pan_name", "Name on PAN = company name", WARN,
                    f"'{doc_name}' only partly matches '{company}' ({int(sim*100)}% similar).",
                    "Confirm the exact legal name as printed on your PAN card and update the company name.", doc))
            else:
                checks.append(_check("pan_name", "Name on PAN = company name", FAIL,
                    f"'{doc_name}' does not match '{company}' ({int(sim*100)}% similar). PAN appears to belong to a different entity.",
                    "Upload the PAN card of the company being registered.", doc))
        else:
            checks.append(_check("pan_name", "Name on PAN = company name", WARN,
                "Name could not be read on the PAN card.", "Re-upload a clear image of your PAN card.", doc))

    # ---------------- GST ----------------
    doc = DOC_GST
    if not gst_yes:
        checks.append(_check("gst_na", "GST registration", INFO,
            "Vendor declared they are not GST registered (below threshold / exempt). No GST input credit possible; noted for admin.", None, doc))
    else:
        if GSTIN_RE.match(form_gstin):
            checks.append(_check("gst_format", "GSTIN format", PASS, f"{form_gstin} is a valid GSTIN format.", None, doc))
            # PAN is embedded inside every GSTIN (characters 3-12)
            if PAN_RE.match(form_pan):
                if form_gstin[2:12] == form_pan:
                    checks.append(_check("gst_pan_link", "GSTIN contains the same PAN", PASS,
                        f"GSTIN characters 3-12 ({form_gstin[2:12]}) = PAN.", None, doc))
                else:
                    checks.append(_check("gst_pan_link", "GSTIN contains the same PAN", FAIL,
                        f"GSTIN {form_gstin} is linked to PAN {form_gstin[2:12]}, not {form_pan}. GST and PAN belong to different entities.",
                        "Provide the GSTIN registered under your own PAN.", doc))
            code = form_gstin[:2]
            gst_state = GST_STATE_CODES.get(code)
            if not gst_state:
                checks.append(_check("gst_state", "GST state code", WARN, f"'{code}' is not a valid GST state code.",
                    "Correct the GSTIN.", doc))
            elif form_state and _state_key(gst_state) != _state_key(form_state):
                checks.append(_check("gst_state", "GST state = address state", WARN,
                    f"GSTIN is registered in {gst_state} (code {code}) but the address is in {form_state}.",
                    f"Provide the GSTIN registered for {form_state}, or update the address to your {gst_state} registered office.", doc))
            else:
                checks.append(_check("gst_state", "GST state = address state", PASS,
                    f"State code {code} = {gst_state}, matches address.", None, doc))
        else:
            checks.append(_check("gst_format", "GSTIN format", WARN,
                f"GSTIN '{form.get('gstin') or ''}' is not valid. A GSTIN has 15 characters (e.g. 27ABCDE1234F1Z5).",
                "Correct the GSTIN in your application.", doc))

        ex = extractions.get(DOC_GST, {})
        if not ex.get("read_ok"):
            checks.append(_read_problem_check(doc, ex, "gst_read"))
        elif ex.get("document_type_detected") not in (None, DOC_GST):
            checks.append(_check("gst_doctype", "Correct document uploaded", WARN,
                f"The file uploaded as GST Certificate looks like a '{ex.get('document_type_detected')}'.",
                "Upload your GST Registration Certificate (REG-06).", doc))
        elif ex.get("is_legible") is False:
            checks.append(_check("gst_read", "GST Certificate readable", WARN, "GST certificate image is blurry or cropped.",
                "Re-upload a clear image of your GST certificate.", doc))
        else:
            doc_gstin = _clean_id(ex.get("gstin"))
            if not doc_gstin:
                checks.append(_check("gst_match", "GSTIN on certificate = form", WARN,
                    "GSTIN could not be found on the certificate.", "Re-upload a clear image of your GST certificate.", doc))
            elif doc_gstin == form_gstin:
                checks.append(_check("gst_match", "GSTIN on certificate = form", PASS, f"Certificate shows {doc_gstin}, matches form.", None, doc))
            elif not GSTIN_RE.match(form_gstin):
                checks.append(_check("gst_match", "GSTIN on certificate = form", WARN,
                    f"Certificate shows {doc_gstin}; the GSTIN typed in the form looks like a typo.",
                    f"Correct the GSTIN in the form (certificate shows {doc_gstin}).", doc))
            else:
                checks.append(_check("gst_match", "GSTIN on certificate = form", FAIL,
                    f"Certificate shows {doc_gstin} but form says {form_gstin or '(blank)'}.",
                    "Upload the GST certificate for the GSTIN entered, or correct the GSTIN.", doc))

            legal = ex.get("legal_name")
            if legal:
                sim = name_similarity(legal, company)
                if sim >= NAME_MATCH:
                    checks.append(_check("gst_name", "GST legal name = company name", PASS,
                        f"'{legal}' matches '{company}' ({int(sim*100)}% similar).", None, doc))
                elif sim >= NAME_PARTIAL:
                    checks.append(_check("gst_name", "GST legal name = company name", WARN,
                        f"'{legal}' only partly matches '{company}' ({int(sim*100)}% similar).",
                        "Use the exact legal name shown on your GST certificate.", doc))
                else:
                    checks.append(_check("gst_name", "GST legal name = company name", FAIL,
                        f"'{legal}' does not match '{company}' ({int(sim*100)}% similar).",
                        "Upload the GST certificate of the company being registered.", doc))

    # ---------------- BANK ----------------
    doc = DOC_BANK
    if IFSC_RE.match(form_ifsc):
        checks.append(_check("ifsc_format", "IFSC format", PASS, f"{form_ifsc} is a valid IFSC format.", None, doc))
    else:
        checks.append(_check("ifsc_format", "IFSC format", WARN,
            f"IFSC '{form.get('ifsc_code') or ''}' is not valid. IFSC is 11 characters: 4 letters, a zero, 6 letters/digits (e.g. HDFC0001234).",
            "Correct the IFSC code.", doc))
    if ACCOUNT_RE.match(form_acc):
        checks.append(_check("acc_format", "Account number format", PASS, "Account number has a valid length (9-18 digits).", None, doc))
    else:
        checks.append(_check("acc_format", "Account number format", WARN,
            "Account number must be 9-18 digits.", "Correct the bank account number.", doc))

    sim_holder = name_similarity(form_holder, company)
    if sim_holder >= NAME_MATCH:
        checks.append(_check("holder_form", "Account holder (form) = company name", PASS,
            f"'{form_holder}' matches company name.", None, doc))
    elif sim_holder >= NAME_PARTIAL:
        checks.append(_check("holder_form", "Account holder (form) = company name", WARN,
            f"Account holder '{form_holder}' only partly matches '{company}' ({int(sim_holder*100)}% similar).",
            "Payments can only go to an account in the company's own name. Upload a bank letter confirming the account holder name.", doc))
    else:
        checks.append(_check("holder_form", "Account holder (form) = company name", FAIL,
            f"Account holder '{form_holder}' is a different party from '{company}' ({int(sim_holder*100)}% similar). Third-party bank accounts are not allowed (payment-fraud risk).",
            "Provide a bank account held in the company's own name.", doc))

    ex = extractions.get(DOC_BANK, {})
    if not ex.get("read_ok"):
        checks.append(_read_problem_check(doc, ex, "bank_read"))
    elif ex.get("document_type_detected") not in (None, DOC_BANK, "Bank Statement"):
        checks.append(_check("bank_doctype", "Correct document uploaded", WARN,
            f"The file uploaded as bank proof looks like a '{ex.get('document_type_detected')}'.",
            "Upload a cancelled cheque or bank letter.", doc))
    elif ex.get("is_legible") is False:
        checks.append(_check("bank_read", "Bank proof readable", WARN, "Bank proof image is blurry or cropped.",
            "Re-upload a clear image of the cancelled cheque.", doc))
    else:
        doc_acc = _clean_digits(ex.get("account_number"))
        if not doc_acc:
            checks.append(_check("acc_match", "Account no. on cheque = form", WARN,
                "Account number could not be found on the cheque.", "Re-upload a clear image of the cancelled cheque.", doc))
        elif doc_acc == form_acc:
            checks.append(_check("acc_match", "Account no. on cheque = form", PASS, f"Cheque shows A/c {doc_acc}, matches form.", None, doc))
        elif not ACCOUNT_RE.match(form_acc):
            checks.append(_check("acc_match", "Account no. on cheque = form", WARN,
                f"Cheque shows A/c {doc_acc}; the account number typed in the form looks like a typo.",
                "Correct the account number in the form.", doc))
        else:
            checks.append(_check("acc_match", "Account no. on cheque = form", FAIL,
                f"Cheque shows A/c {doc_acc} but form says {form_acc or '(blank)'}. Paying to an unverified account is a fraud risk.",
                "Upload the cancelled cheque of the account entered, or correct the account number.", doc))

        doc_ifsc = _clean_ifsc(ex.get("ifsc"))
        if not doc_ifsc:
            checks.append(_check("ifsc_match", "IFSC on cheque = form", WARN,
                "IFSC could not be found on the cheque.", "Re-upload a clear image of the cancelled cheque.", doc))
        elif doc_ifsc == form_ifsc:
            checks.append(_check("ifsc_match", "IFSC on cheque = form", PASS, f"Cheque shows {doc_ifsc}, matches form.", None, doc))
        elif not IFSC_RE.match(form_ifsc):
            checks.append(_check("ifsc_match", "IFSC on cheque = form", WARN,
                f"Cheque shows {doc_ifsc}; the IFSC typed in the form looks like a typo.",
                f"Correct the IFSC in the form (cheque shows {doc_ifsc}).", doc))
        else:
            checks.append(_check("ifsc_match", "IFSC on cheque = form", FAIL,
                f"Cheque shows IFSC {doc_ifsc} but form says {form_ifsc or '(blank)'}.",
                "Correct the IFSC code or upload the cheque for the account entered.", doc))

        doc_holder = ex.get("account_holder_name")
        if doc_holder:
            sim = name_similarity(doc_holder, company)
            if sim >= NAME_MATCH:
                checks.append(_check("holder_doc", "Name on cheque = company name", PASS,
                    f"'{doc_holder}' matches company name.", None, doc))
            elif sim >= NAME_PARTIAL:
                checks.append(_check("holder_doc", "Name on cheque = company name", WARN,
                    f"Name on cheque '{doc_holder}' only partly matches '{company}' ({int(sim*100)}% similar).",
                    "Upload a bank letter on bank letterhead confirming the account holder name.", doc))
            else:
                checks.append(_check("holder_doc", "Name on cheque = company name", FAIL,
                    f"Name on cheque '{doc_holder}' is a different party from '{company}' ({int(sim*100)}% similar).",
                    "Provide a bank account held in the company's own name.", doc))
        else:
            checks.append(_check("holder_doc", "Name on cheque = company name", INFO,
                "Account holder name not printed on cheque; relying on form value.", None, doc))

        if ex.get("is_cancelled") is False:
            checks.append(_check("cheque_cancelled", "Cheque marked CANCELLED", INFO,
                "Cheque does not appear to be marked 'CANCELLED'. Admin should confirm.", None, doc))

    return checks


# ==================================================================
# STEP 3 - Decision + explanation
# ==================================================================

def _doc_status(doc_checks):
    statuses = {c["status"] for c in doc_checks}
    if statuses == {INFO}:
        return "Not applicable"
    if FAIL in statuses:
        return "Fail"
    if WARN in statuses:
        return "Needs fix"
    return "Pass"


def decide(form: dict, extractions: dict, checks: list) -> dict:
    fails = [c for c in checks if c["status"] == FAIL]
    warns = [c for c in checks if c["status"] == WARN]
    passes = [c for c in checks if c["status"] == PASS]
    infos = [c for c in checks if c["status"] == INFO]

    if fails:
        decision = STATUS_REJECTED
        headline = "Rejected: " + "; ".join(c["label"] for c in fails[:3])
    elif warns:
        decision = STATUS_PENDING
        headline = "Pending: " + "; ".join(c["label"] for c in warns[:3])
    else:
        decision = STATUS_APPROVED
        headline = f"Approved: all {len(passes)} checks passed"

    company = form.get("company_name") or "the company"
    if decision == STATUS_APPROVED:
        summary = (f"All {len(passes)} verification checks passed for {company}. PAN, GST and bank details on the "
                   f"uploaded documents match the application, and the GSTIN is linked to the same PAN. Recommended for approval.")
    elif decision == STATUS_PENDING:
        summary = (f"{company} cannot be approved yet: {len(warns)} item(s) need the vendor's action "
                   f"(missing, unclear or partly matching information). No hard conflicts were found. "
                   f"The vendor has been told exactly what to fix.")
    else:
        summary = (f"{company} is rejected because {len(fails)} hard conflict(s) were found between the application "
                   f"and the documents: " + " ".join(c["detail"] for c in fails[:3]))
    if infos:
        summary += f" {len(infos)} note(s) flagged for admin attention."

    actions = []
    for c in fails + warns:
        if c.get("vendor_action") and c["vendor_action"] not in actions:
            actions.append(c["vendor_action"])

    documents = []
    for doc in (DOC_PAN, DOC_GST, DOC_BANK):
        doc_checks = [c for c in checks if c["document"] == doc]
        if not doc_checks:
            continue
        ex = extractions.get(doc, {}) or {}
        extracted = {k: v for k, v in ex.items() if k not in ("read_ok", "read_error", "model") and v not in (None, "")}
        bad = [c for c in doc_checks if c["status"] == FAIL] + [c for c in doc_checks if c["status"] == WARN]
        documents.append({
            "document": doc,
            "result": _doc_status(doc_checks),
            "extracted": extracted,
            "remarks": bad[0]["detail"] if bad else (doc_checks[0]["detail"] if _doc_status(doc_checks) == "Not applicable" else "All checks passed."),
            "checks": doc_checks,
        })

    return {
        "decision": decision,
        "headline": headline,
        "summary": summary,
        "vendor_actions": actions,
        "vendor_message": build_vendor_message(form, decision, actions, fails),
        "documents": documents,
        "checks": checks,
        "counts": {"pass": len(passes), "warn": len(warns), "fail": len(fails), "info": len(infos)},
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "engine": "VendorGate rules v2 + Groq vision extraction",
    }


def build_vendor_message(form, decision, actions, fails):
    name = form.get("contact_name") or "Vendor"
    company = form.get("company_name") or "your company"
    if decision == STATUS_APPROVED:
        return (f"Dear {name},\n\nYour vendor onboarding application for {company} has passed all verification checks "
                f"and is with our procurement team for final sign-off. No action is needed from you.\n\nRegards,\nVendorGate Team")
    lines = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(actions)) or "  1. Please contact us for details."
    if decision == STATUS_PENDING:
        return (f"Dear {name},\n\nThank you for submitting {company}. We need a few things before we can approve it:\n\n"
                f"{lines}\n\nPlease log in to VendorGate, open your application and use 'Fix & Resubmit'.\n\nRegards,\nVendorGate Team")
    reasons = "\n".join(f"  - {c['detail']}" for c in fails[:3])
    return (f"Dear {name},\n\nWe could not approve the application for {company} because the details conflict with "
            f"the documents provided:\n\n{reasons}\n\nTo proceed:\n{lines}\n\nRegards,\nVendorGate Team")


# ==================================================================
# Public entry point
# ==================================================================

async def evaluate_application(form: dict, files: dict, previous_extractions: dict | None = None) -> dict:
    """
    form:  dict of form fields (company_name, entity_type, state, pan_number, gst_registered,
           gstin, bank_holder_name, acc_number, ifsc_code, contact_name, designation)
    files: {doc_type: (bytes, filename)} for newly uploaded documents
    previous_extractions: {doc_type: extraction_dict} reused when a doc was not re-uploaded
    """
    previous_extractions = previous_extractions or {}
    gst_yes = str(form.get("gst_registered") or "").lower() == "yes"
    needed = [DOC_PAN, DOC_BANK] + ([DOC_GST] if gst_yes else [])

    extractions = {}
    tasks = {}
    for doc in needed:
        if doc in files and files[doc] and files[doc][0]:
            data, fname = files[doc]
            tasks[doc] = extract_document_fields(doc, data, fname)
        elif previous_extractions.get(doc) and previous_extractions[doc].get("read_ok"):
            extractions[doc] = previous_extractions[doc]
        else:
            extractions[doc] = {"read_ok": False, "read_error": "missing"}

    if tasks:
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for doc, res in zip(tasks.keys(), results):
            extractions[doc] = res if isinstance(res, dict) else {"read_ok": False, "read_error": "ai_unavailable"}

    checks = run_rules(form, extractions)
    report = decide(form, extractions, checks)
    report["extractions"] = extractions
    report["contact"] = {"name": form.get("contact_name"), "designation": form.get("designation")}
    return report


# Kept so the old /api/verify route still imports without errors
async def evaluate_vendor_documents_with_groq(company_data: dict, extracted_texts: list) -> dict:
    form = {
        "company_name": company_data.get("companyName"),
        "pan_number": company_data.get("panNumber"),
        "gst_registered": "Yes" if company_data.get("gstin") else "No",
        "gstin": company_data.get("gstin"),
        "ifsc_code": company_data.get("ifscCode"),
        "acc_number": company_data.get("accNumber"),
        "bank_holder_name": company_data.get("companyName"),
    }
    report = await evaluate_application(form, {})
    return {"ai_summary": report["summary"], "evaluations": report["documents"]}
