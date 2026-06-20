import re
import json
import logging

import database as db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex pattern library
# ---------------------------------------------------------------------------

ICD10_PATTERN = re.compile(r'\b([A-Z]\d{2}(?:\.\d{1,4})?)\b')

MEDICATION_PATTERNS = [
    # Pulmonology
    (re.compile(r'\b(fluticasone)\b', re.I), 'controller'),
    (re.compile(r'\b(budesonide)\b', re.I), 'controller'),
    (re.compile(r'\b(mometasone)\b', re.I), 'controller'),
    (re.compile(r'\b(beclomethasone)\b', re.I), 'controller'),
    (re.compile(r'\b(albuterol|salbutamol)\b', re.I), 'rescue'),
    (re.compile(r'\b(salmeterol|formoterol|indacaterol)\b', re.I), 'LABA'),
    (re.compile(r'\b(tiotropium|ipratropium)\b', re.I), 'LAMA'),
    (re.compile(r'\b(montelukast)\b', re.I), 'LTRA'),
    (re.compile(r'\b(prednisone|prednisolone|methylprednisolone)\b', re.I), 'oral_steroid'),
    # Dermatology
    (re.compile(r'\b(benzoyl\s*peroxide|BPO)\b', re.I), 'topical_antibacterial'),
    (re.compile(r'\b(salicylic\s*acid)\b', re.I), 'keratolytic'),
    (re.compile(r'\b(tretinoin|adapalene|tazarotene)\b', re.I), 'retinoid'),
    (re.compile(r'\b(clindamycin|erythromycin|doxycycline|minocycline)\b', re.I), 'antibiotic'),
    (re.compile(r'\b(isotretinoin|accutane)\b', re.I), 'systemic_retinoid'),
    (re.compile(r'\b(spironolactone)\b', re.I), 'anti_androgen'),
    # Cardiology
    (re.compile(r'\b(metoprolol|atenolol|bisoprolol|carvedilol)\b', re.I), 'beta_blocker'),
    (re.compile(r'\b(lisinopril|enalapril|ramipril|perindopril)\b', re.I), 'ACE_inhibitor'),
    (re.compile(r'\b(amlodipine|nifedipine|diltiazem|verapamil)\b', re.I), 'CCB'),
    (re.compile(r'\b(atorvastatin|rosuvastatin|simvastatin)\b', re.I), 'statin'),
    (re.compile(r'\b(aspirin|clopidogrel|ticagrelor|warfarin|apixaban|rivaroxaban)\b', re.I), 'antiplatelet_anticoag'),
    (re.compile(r'\b(furosemide|hydrochlorothiazide|spironolactone)\b', re.I), 'diuretic'),
    (re.compile(r'\b(nitroglycerin|isosorbide)\b', re.I), 'nitrate'),
]

# Pulmonology test values
FEV1_PATTERN = re.compile(r'FEV1\s*[:/=\s]\s*(\d{1,3})\s*%?', re.I)
FEV1_FVC_PATTERN = re.compile(r'FEV1\s*/\s*FVC\s*[:/=\s]\s*(0?\.\d{1,2}|\d{1,3}\s*%?)', re.I)
PEAK_FLOW_PATTERN = re.compile(r'peak\s*(?:flow|expiratory\s*flow|PEFR)[^:]*[:/=\s]+(\d{2,4})\s*(?:L/min|l/min)?', re.I)
SPIROMETRY_DATE_PATTERN = re.compile(r'(?:spirometry|spirometry\s*date|PFT|lung\s*function)[^(]*\(([^)]{6,20})\)', re.I)

# Exacerbation / symptoms
EXACERB_PATTERN = re.compile(
    r'(\d+(?:[–\-]\d+)?)\s*(?:episodes?|exacerbations?|attacks?|flares?|times?)?\s*(?:per|x)\s*(month|year|week)',
    re.I
)
TRIGGER_PATTERN = re.compile(
    r'(?:triggers?|precipitants?|worsened?\s+by|induced\s+by|triggered\s+by)[:\s]+([^.;]+)',
    re.I
)
NOCTURNAL_PATTERN = re.compile(r'(?:no\s+)?(?:nocturnal|night(?:time)?)\s+symptoms?', re.I)
SEVERITY_PATTERN = re.compile(r'\b(mild|moderate|severe|well[- ]controlled|poorly[- ]controlled|uncontrolled)\b', re.I)

# Dermatology
ACNE_DURATION_PATTERN = re.compile(
    r'(?:duration|for|since|over\s+the\s+last|onset)[:\s]*(\d+)\s*(month|year|week)s?',
    re.I
)
LESION_TYPE_PATTERN = re.compile(
    r'\b(comedonal|inflammatory|comedones?|papule|pustule|nodule|cyst|cystic|mixed)\b',
    re.I
)
SCARRING_PATTERN = re.compile(r'\b(scarring|scar(?:red)?|atrophic|PIH|post-inflammatory)\b', re.I)
GRADE_PATTERN = re.compile(r'grade\s*([1-4]|I{1,4})\b', re.I)
SKIN_TYPE_PATTERN = re.compile(r'\b(oily|dry|combination|sensitive|normal)\s+skin', re.I)

# Cardiology
EF_PATTERN = re.compile(r'\bEF\s*[:/=\s]\s*(\d{2,3})\s*%?', re.I)
BP_PATTERN = re.compile(r'\bBP\s*[:/=\s]\s*(\d{2,3})\s*/\s*(\d{2,3})', re.I)
HR_PATTERN = re.compile(r'\bHR\s*[:/=\s]\s*(\d{2,3})', re.I)
RR_PATTERN = re.compile(r'\bRR\s*[:/=\s]\s*(\d{1,2})', re.I)
ECHO_DATE_PATTERN = re.compile(r'echo(?:cardiogram)?\s*[(\[]?(\d{4}-\d{2}-\d{2})[)\]]?', re.I)

# Cardiac findings
LV_FUNCTION_PATTERN = re.compile(
    r'\b(normal LV function|mild LV dysfunction|moderate LV dysfunction|severe LV dysfunction|reduced EF|preserved EF)\b',
    re.I
)
WALL_MOTION_PATTERN = re.compile(
    r'(no wall motion abnormalities?|wall motion abnormalities? noted|hypokinesis|akinesis)',
    re.I
)


# ---------------------------------------------------------------------------
# ICD-10 keyword fallback (when notes don't include codes explicitly)
# ---------------------------------------------------------------------------

_KEYWORD_ICD10 = [
    (re.compile(r'\basthma\b', re.I), "J45.0"),
    (re.compile(r'\bCOPD\b', re.I), "J44.1"),
    (re.compile(r'\bGERD\b|gastro.?esophageal reflux', re.I), "K21.0"),
    (re.compile(r'\bacne\b', re.I), "L70.0"),
    (re.compile(r'\bhypertension\b|\bHTN\b', re.I), "I10"),
    (re.compile(r'\bcoronary artery disease\b|\bCAD\b', re.I), "I25.10"),
    (re.compile(r'\bchest (?:pain|discomfort)\b', re.I), "R07.9"),
    (re.compile(r'\bdiabetes\b', re.I), "E11.9"),
    (re.compile(r'\bdepression\b', re.I), "F32.9"),
    (re.compile(r'\banxiety\b', re.I), "F41.9"),
]


def _keyword_to_icd10(raw_text: str) -> list[str]:
    codes = []
    for pattern, code in _KEYWORD_ICD10:
        if pattern.search(raw_text) and code not in codes:
            codes.append(code)
    return codes


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

def extract_regex(raw_text: str) -> dict:
    """Parse visit note text with regex. Returns structured extraction dict."""
    result = {
        "diagnosis": [],
        "medications": [],
        "test_results": {},
        "symptoms": {},
        "clinical_notes": "",
    }

    # ICD-10 codes — regex match first, then keyword fallback
    found_codes = list(dict.fromkeys(ICD10_PATTERN.findall(raw_text)))
    if not found_codes:
        found_codes = _keyword_to_icd10(raw_text)
    result["diagnosis"] = found_codes

    # Medications
    seen_meds = set()
    for pattern, med_type in MEDICATION_PATTERNS:
        for match in pattern.finditer(raw_text):
            med_name = match.group(1).lower()
            if med_name not in seen_meds:
                seen_meds.add(med_name)
                result["medications"].append({"name": match.group(1), "type": med_type})

    # --- Pulmonology test values ---
    fev1 = FEV1_PATTERN.search(raw_text)
    if fev1:
        result["test_results"]["FEV1"] = f"{fev1.group(1)}%"

    fev1_fvc = FEV1_FVC_PATTERN.search(raw_text)
    if fev1_fvc:
        val = fev1_fvc.group(1).strip()
        result["test_results"]["FEV1_FVC"] = val

    peak_flow = PEAK_FLOW_PATTERN.search(raw_text)
    if peak_flow:
        result["test_results"]["peak_flow"] = f"{peak_flow.group(1)} L/min"

    # Spirometry date
    spiro_date = SPIROMETRY_DATE_PATTERN.search(raw_text)
    if spiro_date:
        result["test_results"]["spirometry_date"] = spiro_date.group(1).strip()

    # --- Cardiology test values ---
    ef = EF_PATTERN.search(raw_text)
    if ef:
        result["test_results"]["EF"] = f"{ef.group(1)}%"

    bp = BP_PATTERN.search(raw_text)
    if bp:
        result["test_results"]["BP"] = f"{bp.group(1)}/{bp.group(2)}"

    hr = HR_PATTERN.search(raw_text)
    if hr:
        result["test_results"]["HR"] = hr.group(1)

    echo_date = ECHO_DATE_PATTERN.search(raw_text)
    if echo_date:
        result["test_results"]["echo_date"] = echo_date.group(1)

    lv = LV_FUNCTION_PATTERN.search(raw_text)
    if lv:
        result["test_results"]["LV_function"] = lv.group(1)

    wall = WALL_MOTION_PATTERN.search(raw_text)
    if wall:
        result["test_results"]["wall_motion"] = wall.group(1)

    # --- Symptoms ---
    exacerb = EXACERB_PATTERN.search(raw_text)
    if exacerb:
        result["symptoms"]["exacerbation_frequency"] = f"{exacerb.group(1)} per {exacerb.group(2)}"

    trigger = TRIGGER_PATTERN.search(raw_text)
    if trigger:
        raw_triggers = trigger.group(1).strip().rstrip('.')
        result["symptoms"]["triggers"] = [t.strip() for t in re.split(r',|;|\band\b', raw_triggers) if t.strip()]

    severity = SEVERITY_PATTERN.search(raw_text)
    if severity:
        result["symptoms"]["severity"] = severity.group(1).lower()

    nocturnal = NOCTURNAL_PATTERN.search(raw_text)
    if nocturnal:
        text = nocturnal.group(0).lower()
        result["symptoms"]["nocturnal_symptoms"] = "no" if text.startswith("no") else "yes"

    # --- Dermatology ---
    duration = ACNE_DURATION_PATTERN.search(raw_text)
    if duration:
        result["symptoms"]["duration"] = f"{duration.group(1)} {duration.group(2)}s"

    lesion = LESION_TYPE_PATTERN.findall(raw_text)
    if lesion:
        result["symptoms"]["lesion_types"] = list(dict.fromkeys(l.lower() for l in lesion))

    grade = GRADE_PATTERN.search(raw_text)
    if grade:
        result["symptoms"]["acne_grade"] = grade.group(1)

    skin_type = SKIN_TYPE_PATTERN.search(raw_text)
    if skin_type:
        result["symptoms"]["skin_type"] = skin_type.group(1).lower()

    scarring = SCARRING_PATTERN.search(raw_text)
    if scarring:
        before = raw_text[max(0, scarring.start() - 30):scarring.start()].lower()
        result["symptoms"]["scarring"] = "no" if "no " in before else "yes"

    # Clinical notes: last sentence that includes a clinical impression
    impression_match = re.search(
        r'(?:overall|impression|assessment|plan|recommend)[^.]*\.',
        raw_text,
        re.I
    )
    if impression_match:
        result["clinical_notes"] = impression_match.group(0).strip()

    return result


# ---------------------------------------------------------------------------
# Claude verification (optional — stub if no API key)
# ---------------------------------------------------------------------------

def extract_with_claude(raw_text: str, extracted_dict: dict) -> tuple[dict, float]:
    """
    Optional Claude API verification of regex extraction.
    Falls back to stub (returns extracted_dict unchanged + confidence 0.85) if
    ANTHROPIC_API_KEY is not set.
    Returns (verified_data, confidence_score).
    """
    import os
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        logger.debug("ANTHROPIC_API_KEY not set — using regex stub confidence")
        return extracted_dict, 0.85

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""You are a clinical data extractor. Review this visit note and the initial regex extraction.
Correct any errors, fill obvious gaps, and return valid JSON only.

VISIT NOTE:
{raw_text}

REGEX EXTRACTION:
{json.dumps(extracted_dict, indent=2)}

Return a JSON object with keys: diagnosis, medications, test_results, symptoms, clinical_notes.
Also include a "confidence" float 0.0-1.0. Return ONLY the JSON, no explanation."""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        # Strip markdown fences if present
        text = re.sub(r'^```(?:json)?\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
        parsed = json.loads(text)
        confidence = float(parsed.pop("confidence", 0.90))
        return parsed, confidence

    except Exception as e:
        logger.warning("Claude verification failed (MRN=[MASKED]): %s", type(e).__name__)
        return extracted_dict, 0.80


# ---------------------------------------------------------------------------
# DB persistence
# ---------------------------------------------------------------------------

def save_scribe_context(
    visit_id: int | None,
    raw_text: str,
    extracted_data: dict,
    version: str = "v1_regex",
    confidence: float = 0.85,
) -> int:
    """Store extraction in scribe_context table. Returns scribe_context_id."""
    row_id = db.execute(
        """INSERT INTO scribe_context
           (visit_id, raw_content, source_type, extracted_data, extraction_version, confidence_score)
           VALUES (?, ?, 'paste', ?, ?, ?)""",
        (visit_id, raw_text, json.dumps(extracted_data), version, confidence),
    )
    logger.info("Saved scribe_context id=%d version=%s confidence=%.2f", row_id, version, confidence)
    return row_id


# ---------------------------------------------------------------------------
# Convenience: full extraction pipeline
# ---------------------------------------------------------------------------

def run_extraction(
    raw_text: str,
    visit_id: int | None = None,
    use_claude: bool = False,
) -> dict:
    """Run full extraction pipeline. Returns API-ready response dict."""
    extracted = extract_regex(raw_text)

    if use_claude:
        extracted, confidence = extract_with_claude(raw_text, extracted)
        version = "v2_claude"
    else:
        confidence = _estimate_confidence(extracted)
        version = "v1_regex"

    ctx_id = save_scribe_context(visit_id, raw_text, extracted, version, confidence)

    return {
        "success": True,
        "extracted_data": extracted,
        "confidence_score": round(confidence, 2),
        "scribe_context_id": ctx_id,
        "extraction_version": version,
    }


def _estimate_confidence(extracted: dict) -> float:
    """Heuristic: more fields found → higher confidence."""
    score = 0.5
    if extracted["diagnosis"]:
        score += 0.1
    if extracted["medications"]:
        score += 0.1
    if extracted["test_results"]:
        score += 0.15
    if extracted["symptoms"]:
        score += 0.1
    if extracted["clinical_notes"]:
        score += 0.05
    return min(score, 0.95)
