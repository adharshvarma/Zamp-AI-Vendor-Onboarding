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
 "gstin": "the 15 character Registration Number / GSTIN printed near the top, exactly as printed, or null",
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
    if len(v) == 11 and v[4] == "O":  # common misread: O instead of 0
        v = v[:4] + "0" + v[5:]
    return v


# Characters an AI/OCR commonly confuses. Used only to forgive misreads.
_CONFUSABLE = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "S": "5", "B": "8", "Z": "2", "G": "6"})


def compare_ids(a: str, b: str) -> str:
    """'match' | 'near' (1-2 characters differ: likely typo) | 'different' | 'unknown'"""
    a, b = _clean_id(a), _clean_id(b)
    if not a or not b:
        return "unknown"
    if a == b or a.translate(_CONFUSABLE) == b.translate(_CONFUSABLE):
        return "match"
    if len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) <= 2:
        return "near"
    return "different"


def _find_in_extraction(ex: dict, key: str, regex, cleaner):
    """Value for `key`; if missing/invalid, search every other text field the AI returned."""
    direct = cleaner(ex.get(key))
    if direct and regex.match(direct):
        return direct
    for k, v in ex.items():
        if isinstance(v, str):
            compact = re.sub(r"[^A-Z0-9]", "", v.upper())
            m = regex.search(compact) if hasattr(regex, "search") else None
            if m:
                return m.group(0)
    return direct


PAN_SEARCH = re.compile(r"[A-Z]{5}[0-9]{4}[A-Z]")
GSTIN_SEARCH = re.compile(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]")
IFSC_SEARCH = re.compile(r"[A-Z]{4}0[A-Z0-9]{6}")


SUFFIX_MAP = [
    (r"\bPVT\b", "PRIVATE"), (r"\bPRIV\b", "PRIVATE"), (r"\bLTD\b", "LIMITED"),
    (r"\bCO\b", "COMPANY"), (r"\bCORP\b", "CORPORATION"), (r"&", " AND "),
]
LEGAL_SUFFIX_WORDS = {"PRIVATE", "LIMITED", "LLP", "COMPANY", "CORPORATION", "INC", "THE", "MS", "M", "S", "OPC"}


def _normalize_name(name) -> str:
    n = str(name or "").upper()
    n = n.replace("M/S", " ")
    for pattern, repl in SUFFIX_MAP:
        n = re.sub(pattern, repl, n)
    n = re.sub(r"[^A-Z0-9 ]", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def _core_name(name) -> str:
    return " ".join(w for w in _normalize_name(name).split() if w not in LEGAL_SUFFIX_WORDS)


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


# Name match thresholds
NAME_MATCH = 0.90     # >= 90% similar -> same entity
NAME_PARTIAL = 0.60   # 60-89% -> unclear (Pending); < 60% -> different entity


def _truthy_false(v) -> bool:
    return v is False or str(v).strip().lower() == "false"


def _check(check_id, label, status, detail, action=None, document=None, layer=None):
    detail = detail[:1].upper() + detail[1:] if detail else detail
    return {"id": check_id, "label": label, "status": status, "detail": detail,
            "vendor_action": action, "document": document, "layer": layer}


KNOWN_DOC_TYPES = {"PAN Card", "GST Certificate", "Cancelled Cheque", "Aadhaar Card", "Bank Statement"}


def _doc_quality(doc: str, ex: dict, allowed: set, checks: list) -> bool:
    """Layer 1. Returns True if the document can be used for comparison."""
    err = ex.get("read_error")
    if not ex.get("read_ok"):
        messages = {
            "missing": (f"{doc} was not uploaded.", f"Upload your {doc}."),
            "unsupported_format": (f"{doc} is not an image (JPG/PNG needed).", f"Re-upload your {doc} as a JPG or PNG."),
            "too_large": (f"{doc} image is larger than 4 MB.", f"Re-upload a smaller {doc} image (under 4 MB)."),
            "unreadable": (f"{doc} could not be read clearly.", f"Re-upload a clear, uncropped image of your {doc}."),
            "ai_unavailable": (f"{doc} could not be read automatically right now, so it needs a manual check.", None),
        }
        detail, action = messages.get(err, messages["unreadable"])
        checks.append(_check(f"{doc}_quality", f"{doc} received and readable", WARN, detail, action, doc, "document"))
        return False
    detected = ex.get("document_type_detected")
    if detected in KNOWN_DOC_TYPES and detected not in allowed:
        checks.append(_check(f"{doc}_quality", "Right document in the right place", WARN,
            f"The file uploaded as {doc} looks like a {detected}.", f"Upload your {doc} in the {doc} slot.", doc, "document"))
        return False
    if _truthy_false(ex.get("is_legible")):
        checks.append(_check(f"{doc}_quality", f"{doc} readable", WARN,
            f"The {doc} image is blurry or cropped.", f"Re-upload a clear image of your {doc}.", doc, "document"))
        return False
    checks.append(_check(f"{doc}_quality", f"{doc} received and readable", PASS, f"{doc} was read successfully.", None, doc, "document"))
    return True


def _form_vs_doc_id(checks, cid, label, doc, form_val, doc_val, what, confirmed=False):
    """Layer 3: a difference between form and document is a filling mistake -> Pending.
    confirmed=True means another document independently proves the form value is right,
    so a 1-2 character difference is the AI misreading the image, not the vendor's mistake."""
    res = compare_ids(form_val, doc_val)
    if res == "near" and confirmed:
        checks.append(_check(cid, label, INFO,
            f"The form says {_clean_id(form_val)}; the AI read {doc_val} on the {doc}. Only 1-2 characters differ and another "
            f"document confirms the form value, so this is treated as a reading slip. Admin may glance at the image.",
            None, doc, "note"))
        return
    if res == "unknown" and not doc_val:
        checks.append(_check(cid, label, WARN, f"The {what} could not be found on the {doc}.",
            f"Re-upload a clear image of your {doc}.", doc, "form_vs_document"))
    elif res == "unknown":
        checks.append(_check(cid, label, WARN, f"The {what} is missing in the form. The {doc} shows {doc_val}.",
            f"Enter the {what} in the form ({doc} shows {doc_val}).", doc, "form_vs_document"))
    elif res == "match":
        checks.append(_check(cid, label, PASS, f"{doc} shows {doc_val}, same as the form.", None, doc, "form_vs_document"))
    else:
        checks.append(_check(cid, label, WARN,
            f"The form says {_clean_id(form_val)} but the {doc} shows {doc_val}. This looks like a typing mistake.",
            f"Correct the {what} in the form so it matches your {doc} ({doc_val}).", doc, "form_vs_document"))


def _form_vs_doc_name(checks, cid, label, doc, company, doc_name):
    sim = name_similarity(doc_name, company)
    if sim >= NAME_MATCH:
        checks.append(_check(cid, label, PASS, f"{doc} shows '{doc_name}', same as the company name.", None, doc, "form_vs_document"))
    else:
        checks.append(_check(cid, label, WARN,
            f"The form says '{company}' but the {doc} shows '{doc_name}'.",
            f"Enter the company name exactly as on your {doc} ('{doc_name}').", doc, "form_vs_document"))


def _doc_vs_doc_name(checks, cid, label, doc, name_a, src_a, name_b, src_b):
    """Layer 4: names on two different documents. Different entity -> Rejected."""
    sim = name_similarity(name_a, name_b)
    if sim >= NAME_MATCH:
        checks.append(_check(cid, label, PASS, f"{src_a} and {src_b} are in the same name ('{name_a}').", None, doc, "cross_document"))
    elif sim >= NAME_PARTIAL:
        checks.append(_check(cid, label, WARN,
            f"{src_a} says '{name_a}' but {src_b} says '{name_b}'. They are similar but not the same.",
            f"Upload documents that all show the same legal name, or a letter explaining the difference.", doc, "cross_document"))
    else:
        checks.append(_check(cid, label, FAIL,
            f"{src_a} is in the name of '{name_a}' but {src_b} is in the name of '{name_b}'. These documents belong to different parties.",
            "All documents must belong to the company being registered.", doc, "cross_document"))


# ==================================================================
# STEP 2 - Rules (5 layers)
#   1. Document quality      missing / wrong / unreadable      -> Pending
#   2. Form format           PAN, GSTIN, IFSC, account format  -> Pending
#   3. Form vs document      typing mistakes                   -> Pending
#   4. Document vs document  documents of different parties    -> Rejected
#   5. Notes for the admin   do not change the decision
# ==================================================================

def run_rules(form: dict, extractions: dict) -> list:
    checks = []
    company = (form.get("company_name") or "").strip()
    entity = form.get("entity_type") or ""
    form_state = form.get("state") or ""
    form_pan = _clean_id(form.get("pan_number"))
    gst_yes = str(form.get("gst_registered") or "").lower() == "yes"
    form_gstin = _clean_id(form.get("gstin"))
    form_acc = _clean_digits(form.get("acc_number"))
    form_ifsc = _clean_ifsc(form.get("ifsc_code"))
    form_holder = (form.get("bank_holder_name") or "").strip()

    # ---------- Layer 1: documents ----------
    ex_pan = extractions.get(DOC_PAN, {}) or {}
    ex_gst = extractions.get(DOC_GST, {}) or {}
    ex_bank = extractions.get(DOC_BANK, {}) or {}
    pan_ok = _doc_quality(DOC_PAN, ex_pan, {DOC_PAN}, checks)
    gst_ok = _doc_quality(DOC_GST, ex_gst, {DOC_GST}, checks) if gst_yes else False
    bank_ok = _doc_quality(DOC_BANK, ex_bank, {DOC_BANK, "Bank Statement"}, checks)

    doc_pan = _find_in_extraction(ex_pan, "pan_number", PAN_SEARCH, _clean_id) if pan_ok else ""
    doc_pan_name = (ex_pan.get("name") or "").strip() if pan_ok else ""
    doc_gstin = _find_in_extraction(ex_gst, "gstin", GSTIN_SEARCH, _clean_id) if gst_ok else ""
    doc_gst_name = (ex_gst.get("legal_name") or "").strip() if gst_ok else ""
    doc_acc = _clean_digits(ex_bank.get("account_number")) if bank_ok else ""
    doc_ifsc = _find_in_extraction(ex_bank, "ifsc", IFSC_SEARCH, _clean_ifsc) if bank_ok else ""
    doc_holder = (ex_bank.get("account_holder_name") or "").strip() if bank_ok else ""

    # ---------- Layer 2: form format ----------
    if PAN_RE.match(form_pan):
        checks.append(_check("pan_format", "PAN format", PASS, f"{form_pan} is a valid PAN format.", None, DOC_PAN, "form"))
    else:
        checks.append(_check("pan_format", "PAN format", WARN,
            f"'{form.get('pan_number') or ''}' is not a valid PAN. A PAN has 5 letters, 4 digits and 1 letter (e.g. ABCDE1234F).",
            "Correct the PAN number in the form.", DOC_PAN, "form"))

    if gst_yes:
        if GSTIN_RE.match(form_gstin):
            checks.append(_check("gst_format", "GSTIN format", PASS, f"{form_gstin} is a valid GSTIN format.", None, DOC_GST, "form"))
            if PAN_RE.match(form_pan) and form_gstin[2:12] != form_pan:
                checks.append(_check("gst_pan_form", "GSTIN contains the PAN (form)", WARN,
                    f"Every GSTIN contains the PAN (characters 3-12). The GSTIN typed contains {form_gstin[2:12]} but the PAN typed is {form_pan}.",
                    "Check the PAN and GSTIN typed in the form.", DOC_GST, "form"))
            code = form_gstin[:2]
            gst_state = GST_STATE_CODES.get(code)
            if not gst_state:
                checks.append(_check("gst_state", "GST state code", WARN, f"'{code}' is not a valid GST state code.",
                    "Correct the GSTIN.", DOC_GST, "form"))
            elif form_state and _state_key(gst_state) != _state_key(form_state):
                checks.append(_check("gst_state", "GST state matches address", WARN,
                    f"The GSTIN is registered in {gst_state} (code {code}) but the address is in {form_state}.",
                    f"Give the GSTIN registered for {form_state}, or the address of your {gst_state} office.", DOC_GST, "form"))
        else:
            checks.append(_check("gst_format", "GSTIN format", WARN,
                f"'{form.get('gstin') or ''}' is not a valid GSTIN. A GSTIN has 15 characters (e.g. 33ABCDE1234F1Z5).",
                "Correct the GSTIN in the form.", DOC_GST, "form"))

    if not IFSC_RE.match(form_ifsc):
        checks.append(_check("ifsc_format", "IFSC format", WARN,
            f"'{form.get('ifsc_code') or ''}' is not a valid IFSC. It has 11 characters: 4 letters, a zero, then 6 letters or digits (e.g. HDFC0001234).",
            "Correct the IFSC code in the form.", DOC_BANK, "form"))
    if not ACCOUNT_RE.match(form_acc):
        checks.append(_check("acc_format", "Account number format", WARN,
            "The account number must be 9-18 digits.", "Correct the account number in the form.", DOC_BANK, "form"))

    if form_holder and company and name_similarity(form_holder, company) < NAME_MATCH:
        checks.append(_check("holder_form", "Bank account is in the company's name", WARN,
            f"The account holder typed is '{form_holder}', not '{company}'. Payments can only go to the company's own account.",
            "Give a bank account held in the company's own name.", DOC_BANK, "form"))

    # ---------- Layer 3: form vs documents (typing mistakes) ----------
    if pan_ok:
        pan_confirmed = PAN_RE.match(form_pan) is not None and gst_ok and len(doc_gstin or "") == 15 \
            and compare_ids(form_pan, doc_gstin[2:12]) == "match"
        _form_vs_doc_id(checks, "pan_match", "PAN in form matches PAN card", DOC_PAN, form_pan, doc_pan, "PAN", pan_confirmed)
        if doc_pan_name:
            _form_vs_doc_name(checks, "pan_name", "Company name matches PAN card", DOC_PAN, company, doc_pan_name)
    if gst_ok:
        gst_confirmed = GSTIN_RE.match(form_gstin) is not None and form_gstin[2:12] == form_pan \
            and pan_ok and compare_ids(form_pan, doc_pan) == "match"
        _form_vs_doc_id(checks, "gst_match", "GSTIN in form matches GST certificate", DOC_GST, form_gstin, doc_gstin, "GSTIN", gst_confirmed)
        if doc_gst_name and not doc_pan_name:
            _form_vs_doc_name(checks, "gst_name", "Company name matches GST certificate", DOC_GST, company, doc_gst_name)
    if bank_ok:
        if not doc_acc:
            checks.append(_check("acc_match", "Account number matches cheque", WARN,
                "The account number could not be found on the cheque.", "Re-upload a clear image of the cancelled cheque.", DOC_BANK, "form_vs_document"))
        elif doc_acc == form_acc:
            checks.append(_check("acc_match", "Account number matches cheque", PASS, f"Cheque shows A/c {doc_acc}, same as the form.", None, DOC_BANK, "form_vs_document"))
        else:
            checks.append(_check("acc_match", "Account number matches cheque", WARN,
                f"The form says A/c {form_acc or '(blank)'} but the cheque shows A/c {doc_acc}. Money would go to the wrong account.",
                f"Correct the account number so it matches the cheque ({doc_acc}), or upload the cheque of the account you typed.", DOC_BANK, "form_vs_document"))
        _form_vs_doc_id(checks, "ifsc_match", "IFSC matches cheque", DOC_BANK, form_ifsc, doc_ifsc, "IFSC")

    # ---------- Layer 4: documents vs each other (fraud signals) ----------
    if pan_ok and gst_ok and doc_pan and doc_gstin and len(doc_gstin) == 15:
        res = compare_ids(doc_pan, doc_gstin[2:12])
        if res == "match":
            checks.append(_check("x_pan_gst", "GST certificate belongs to the same PAN", PASS,
                f"The GSTIN {doc_gstin} contains the PAN {doc_pan} from the PAN card.", None, DOC_GST, "cross_document"))
        elif res == "near" and PAN_RE.match(form_pan) and form_gstin[2:12] == form_pan and (
                compare_ids(form_pan, doc_pan) == "match" or compare_ids(form_pan, doc_gstin[2:12]) == "match"):
            checks.append(_check("x_pan_gst", "GST certificate belongs to the same PAN", INFO,
                f"The PAN card ({doc_pan}) and the PAN inside the GSTIN ({doc_gstin[2:12]}) differ by only 1-2 characters, "
                f"and the form values agree with each other. Treated as an AI reading slip; admin may glance at the images.",
                None, DOC_GST, "note"))
        elif res == "near":
            checks.append(_check("x_pan_gst", "GST certificate belongs to the same PAN", WARN,
                f"The GSTIN on the certificate contains {doc_gstin[2:12]}, almost but not exactly the PAN card's {doc_pan}.",
                "Re-upload clearer images of the PAN card and GST certificate.", DOC_GST, "cross_document"))
        else:
            checks.append(_check("x_pan_gst", "GST certificate belongs to the same PAN", FAIL,
                f"The GST certificate is registered under PAN {doc_gstin[2:12]}, but the PAN card is {doc_pan}. These belong to different businesses.",
                "Upload the PAN card and GST certificate of the same company.", DOC_GST, "cross_document"))

    if doc_pan_name and doc_gst_name:
        _doc_vs_doc_name(checks, "x_name_pan_gst", "PAN card and GST certificate are in the same name", DOC_GST,
                         doc_pan_name, "the PAN card", doc_gst_name, "the GST certificate")

    reference_name = doc_pan_name or doc_gst_name
    reference_src = "the PAN card" if doc_pan_name else "the GST certificate"
    if doc_holder and reference_name:
        _doc_vs_doc_name(checks, "x_name_bank", "Bank account belongs to the same company", DOC_BANK,
                         doc_holder, "the cheque", reference_name, reference_src)

    # ---------- Layer 5: notes for the admin ----------
    expected = ENTITY_EXPECTED_PAN_TYPE.get(entity)
    pan_for_type = doc_pan if PAN_RE.match(doc_pan or "") else form_pan
    if expected and PAN_RE.match(pan_for_type or "") and pan_for_type[3] != expected:
        code = pan_for_type[3]
        checks.append(_check("pan_entity", "PAN type matches business type", WARN,
            f"The 4th letter of the PAN is '{code}', which means {PAN_HOLDER_TYPES.get(code, 'an unknown holder type')}. "
            f"A {entity} must have a PAN with '{expected}' ({PAN_HOLDER_TYPES[expected]}) as the 4th letter.",
            f"Select the correct business type, or upload the PAN card of the {entity} itself (4th letter '{expected}').",
            DOC_PAN, "form"))
    if not gst_yes:
        checks.append(_check("gst_na", "GST registration", INFO,
            "The vendor says they are not registered under GST (turnover below the limit or exempt). No GST certificate was needed.",
            None, DOC_GST, "note"))
    if bank_ok and _truthy_false(ex_bank.get("is_cancelled")):
        checks.append(_check("cheque_cancelled", "Cheque marked CANCELLED", INFO,
            "The cheque does not seem to be marked 'CANCELLED'. The admin may want to confirm.", None, DOC_BANK, "note"))

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


ISSUE_TEXT = {
    "x_pan_gst": "GST certificate is under a different PAN",
    "x_name_pan_gst": "PAN card and GST certificate names differ",
    "x_name_bank": "bank account is in another party's name",
    "pan_match": "PAN typed differs from the PAN card",
    "pan_name": "company name differs from the PAN card",
    "gst_match": "GSTIN typed differs from the GST certificate",
    "gst_name": "company name differs from the GST certificate",
    "acc_match": "account number differs from the cheque",
    "ifsc_match": "IFSC differs from the cheque",
    "pan_format": "PAN typed is not valid",
    "gst_format": "GSTIN typed is not valid",
    "ifsc_format": "IFSC typed is not valid",
    "acc_format": "account number typed is not valid",
    "gst_pan_form": "GSTIN and PAN typed don't match",
    "gst_state": "GST state differs from the address",
    "holder_form": "bank account not in the company's name",
    "pan_entity": "PAN type doesn't match the business type",
}


def _issue(c):
    if c["id"].startswith("x_") and c["status"] == WARN:
        return "names on the documents don't fully match" if "name" in c["id"] else "PAN on documents doesn't fully match"
    if c["id"] in ISSUE_TEXT:
        return ISSUE_TEXT[c["id"]]
    if c["id"].endswith("_quality"):
        return f"{c['document']} missing, wrong or unclear"
    return c["label"]


def _sentence(text):
    return text[:1].upper() + text[1:] if text else text


def decide(form: dict, extractions: dict, checks: list) -> dict:
    fails = [c for c in checks if c["status"] == FAIL]
    warns = [c for c in checks if c["status"] == WARN]
    passes = [c for c in checks if c["status"] == PASS]
    infos = [c for c in checks if c["status"] == INFO]
    gst_yes = str(form.get("gst_registered") or "").lower() == "yes"
    company = (form.get("company_name") or "the company").strip()

    if fails:
        decision = STATUS_REJECTED
        headline = "Rejected: " + "; ".join(dict.fromkeys(_issue(c) for c in fails[:3]))
        summary = (f"{company} was rejected because the documents do not belong to the same business. "
                   + _sentence(fails[0]["detail"])
                   + (f" {len(fails) - 1} more conflict{'s' if len(fails) > 2 else ''} found." if len(fails) > 1 else "")
                   + " This is a common sign of a fraudulent or mixed-up submission.")
    elif warns:
        decision = STATUS_PENDING
        headline = "Pending: " + "; ".join(dict.fromkeys(_issue(c) for c in warns[:3]))
        n = len({c.get("vendor_action") or c["label"] for c in warns})
        summary = (f"{company} can't be approved yet. No document clearly belongs to a different business, "
                   f"but {n} thing{'s' if n != 1 else ''} need{'' if n != 1 else 's'} to be fixed by the vendor. "
                   f"First: {_sentence(warns[0]['detail'])}")
    else:
        decision = STATUS_APPROVED
        headline = "Approved: all documents match"
        docs = "the PAN card, GST certificate and cancelled cheque" if gst_yes else "the PAN card and cancelled cheque"
        summary = f"Everything matches for {company}. The form agrees with {docs}, and they all belong to the same company."
        if gst_yes:
            summary += " The GSTIN is registered under the same PAN."
        else:
            summary += " The vendor is not GST registered, so no GST certificate was needed."
    if infos and decision != STATUS_REJECTED:
        notes = [c for c in infos if c["id"] != "gst_na"]
        if notes:
            summary += f" {len(notes)} note{'s' if len(notes) != 1 else ''} for the admin."

    actions = []
    for c in (fails if fails else warns):
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
        result = _doc_status(doc_checks)
        if bad:
            remarks = _sentence(bad[0]["detail"])
        elif result == "Not applicable":
            remarks = doc_checks[0]["detail"]
        else:
            remarks = "Everything on this document checks out."
        documents.append({
            "document": doc,
            "result": result,
            "extracted": extracted if gst_yes or doc != DOC_GST else {},
            "remarks": remarks,
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
        "engine": "VendorGate rules v3 + Groq vision extraction",
    }


def build_vendor_message(form, decision, actions, fails):
    name = form.get("contact_name") or "Vendor"
    company = form.get("company_name") or "your company"
    if decision == STATUS_APPROVED:
        return (f"Dear {name},\n\nGood news: the onboarding application for {company} has passed all verification checks "
                f"and is with our procurement team for final sign-off. You don't need to do anything.\n\nRegards,\nVendorGate Team")
    lines = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(actions)) or "  1. Please contact us for details."
    if decision == STATUS_REJECTED:
        lines = "\n".join(f"  {i+1}. {c['vendor_action']}" for i, c in enumerate(fails) if c.get("vendor_action")) or lines
    if decision == STATUS_PENDING:
        return (f"Dear {name},\n\nThank you for submitting {company}. Before we can approve it, please:\n\n"
                f"{lines}\n\nLog in to VendorGate, open the application and use 'Fix & resubmit'. It is checked again immediately.\n\nRegards,\nVendorGate Team")
    reasons = "\n".join(f"  - {_sentence(c['detail'])}" for c in fails[:3])
    return (f"Dear {name},\n\nWe could not approve the application for {company} because the documents belong to different parties:\n\n"
            f"{reasons}\n\nIf this is a mistake, please submit a fresh application with the PAN card, GST certificate and cancelled cheque "
            f"of the same company.\n\nRegards,\nVendorGate Team")


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
