import math
import logging

import database as db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Specialty requirements & checklist
# ---------------------------------------------------------------------------

def load_specialty_requirements(specialty: str) -> list[dict]:
    """Query specialty_requirements for the given specialty."""
    return db.query(
        "SELECT * FROM specialty_requirements WHERE specialty = ? ORDER BY required DESC, rejection_count DESC",
        (specialty,),
    )


def build_checklist(specialty: str, extracted_data: dict, scribe_context_id: int | None = None) -> dict:
    """
    Compare extracted_data against specialty_requirements.
    Returns checklist dict with found/missing/optional lists and completion_pct.
    """
    requirements = load_specialty_requirements(specialty)
    if not requirements:
        return {
            "found": [], "missing": [], "optional": [],
            "completion_pct": 0,
            "blocks_submission": False,
            "documentation_requirements": recommend_documentation(specialty),
        }

    found, missing, optional = [], [], []

    # Flatten extracted data into a searchable string for hint matching
    flat_text = _flatten_extracted(extracted_data).lower()

    for req in requirements:
        hints = [h.strip().lower() for h in (req["extraction_hint"] or "").split("|")]
        field_name = req["field_name"]
        required = bool(req["required"])

        value = _find_value(req["requirement_id"], extracted_data)
        if value is None:
            # Try hint-based match against flat text
            if any(h in flat_text for h in hints if h):
                value = "(detected in note)"

        if value is not None:
            found.append({
                "field": field_name,
                "value": value,
                "required": required,
                "status": "found",
                "requirement_id": req["requirement_id"],
            })
        elif required:
            missing.append({
                "field": field_name,
                "required": True,
                "status": "missing",
                "requirement_id": req["requirement_id"],
                "hint": req["extraction_hint"],
            })
        else:
            optional.append({
                "field": field_name,
                "required": False,
                "status": "optional_missing",
                "requirement_id": req["requirement_id"],
            })

    total_required = sum(1 for r in requirements if r["required"])
    required_found = sum(1 for f in found if f["required"])
    completion_pct = int((required_found / total_required * 100)) if total_required else 100

    return {
        "found": found,
        "missing": missing,
        "optional": optional,
        "completion_pct": completion_pct,
        "blocks_submission": len(missing) > 0,
        "documentation_requirements": recommend_documentation(specialty),
    }


def _flatten_extracted(data: dict) -> str:
    """Recursively flatten extracted dict into a single string for hint matching."""
    parts = []
    for v in data.values():
        if isinstance(v, str):
            parts.append(v)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    parts.append(_flatten_extracted(item))
                else:
                    parts.append(str(item))
        elif isinstance(v, dict):
            parts.append(_flatten_extracted(v))
    return " ".join(parts)


def _find_value(requirement_id: str, extracted: dict):
    """Map requirement IDs to extracted data keys. Returns value or None."""
    mapping = {
        # Pulmonology
        "pulm_fev1": ("test_results", "FEV1"),
        "pulm_fev1fvc": ("test_results", "FEV1_FVC"),
        "pulm_peak_flow": ("test_results", "peak_flow"),
        "pulm_controller": None,  # medication type check
        "pulm_exacerbation": ("symptoms", "exacerbation_frequency"),
        "pulm_triggers": ("symptoms", "triggers"),
        "pulm_nocturnal": ("symptoms", "nocturnal_symptoms"),
        "pulm_diagnosis": ("diagnosis", None),
        # Dermatology
        "derm_duration": ("symptoms", "duration"),
        "derm_severity": ("symptoms", "severity"),
        "derm_location": ("symptoms", "lesion_types"),
        "derm_scarring": ("symptoms", "scarring"),
        "derm_prior_tx": None,  # medication check — any topical/antibiotic
        "derm_diagnosis": ("diagnosis", None),
        # Cardiology
        "cardio_ef": ("test_results", "EF"),
        "cardio_bp": ("test_results", "BP"),
        "cardio_hr": ("test_results", "HR"),
        "cardio_echo_date": ("test_results", "echo_date"),
        "cardio_diagnosis": ("diagnosis", None),
        "cardio_cardiac_med": None,
        "cardio_symptoms": ("symptoms", "severity"),
    }

    if requirement_id == "pulm_controller":
        meds = extracted.get("medications", [])
        controllers = [m["name"] for m in meds if m.get("type") in ("controller", "LABA", "LAMA", "LTRA")]
        return ", ".join(controllers) if controllers else None

    if requirement_id == "derm_prior_tx":
        meds = extracted.get("medications", [])
        topicals = [m["name"] for m in meds if m.get("type") in ("topical_antibacterial", "keratolytic", "retinoid", "antibiotic")]
        return ", ".join(topicals) if topicals else None

    if requirement_id == "cardio_cardiac_med":
        meds = extracted.get("medications", [])
        cardiac = [m["name"] for m in meds if m.get("type") in (
            "beta_blocker", "ACE_inhibitor", "CCB", "statin", "antiplatelet_anticoag", "diuretic", "nitrate"
        )]
        return ", ".join(cardiac) if cardiac else None

    if requirement_id not in mapping or mapping[requirement_id] is None:
        return None

    section, key = mapping[requirement_id]
    section_data = extracted.get(section)

    if section == "diagnosis":
        codes = extracted.get("diagnosis", [])
        return ", ".join(codes) if codes else None

    if section_data is None:
        return None

    if isinstance(section_data, dict):
        val = section_data.get(key)
    elif isinstance(section_data, list):
        val = section_data
    else:
        val = section_data

    if val is None:
        return None
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) if val else None
    return str(val)


# ---------------------------------------------------------------------------
# Specialist filtering & ranking
# ---------------------------------------------------------------------------

def filter_specialists(patient_data: dict, specialty: str) -> list[dict]:
    """
    Query specialists for given specialty, apply constraint filtering.
    Returns list of eligible specialist dicts.
    """
    candidates = db.query(
        """SELECT s.*, GROUP_CONCAT(sc.constraint_type || '=' || sc.field_value, '|') AS constraints
           FROM specialists s
           LEFT JOIN specialist_constraints sc ON sc.specialist_id = s.id
           WHERE s.specialty = ?
           GROUP BY s.id""",
        (specialty,),
    )

    eligible = []
    patient_age = patient_data.get("age", 0)
    patient_gender = (patient_data.get("gender") or "").upper()
    patient_diagnosis = (patient_data.get("diagnosis") or "").upper()

    for spec in candidates:
        constraints_raw = spec.get("constraints") or ""
        constraints = {}
        for part in constraints_raw.split("|"):
            if "=" in part:
                k, v = part.split("=", 1)
                constraints[k.strip()] = v.strip()

        # Reject if not accepting
        if not spec["accepting_patients"]:
            logger.debug("Excluded specialist id=%d: not accepting patients", spec["id"])
            continue
        if constraints.get("accepting_patients") == "false":
            continue

        # Age constraints
        if "age_max" in constraints and patient_age > int(constraints["age_max"]):
            logger.debug("Excluded specialist id=%d: age_max constraint", spec["id"])
            continue
        if "age_min" in constraints and patient_age < int(constraints["age_min"]):
            logger.debug("Excluded specialist id=%d: age_min constraint", spec["id"])
            continue

        # Gender constraint
        if "gender_only" in constraints:
            allowed_gender = constraints["gender_only"].upper()
            if patient_gender and patient_gender != allowed_gender:
                logger.debug("Excluded specialist id=%d: gender_only constraint", spec["id"])
                continue

        # Condition exclusion
        if "condition_exclude" in constraints:
            excluded_cond = constraints["condition_exclude"].upper()
            if excluded_cond in patient_diagnosis:
                logger.debug("Excluded specialist id=%d: condition_exclude constraint", spec["id"])
                continue

        eligible.append(dict(spec))

    return eligible


def rank_specialists(
    patient_data: dict,
    filtered_specialists: list[dict],
    patient_location: str = "Toronto",
) -> list[dict]:
    """
    Score and rank eligible specialists.
    Weights: distance 0.4, language 0.2, availability 0.3, scope 0.1
    Returns sorted list with rank + score appended.
    """
    patient_lang = (patient_data.get("language") or "English").lower()
    patient_lat = _city_lat(patient_location)
    patient_lon = _city_lon(patient_location)

    scored = []
    for spec in filtered_specialists:
        spec_lat = spec.get("latitude") or _city_lat(spec.get("city", "Toronto"))
        spec_lon = spec.get("longitude") or _city_lon(spec.get("city", "Toronto"))
        distance_km = _haversine(patient_lat, patient_lon, spec_lat, spec_lon)

        # Distance score: 0–1, diminishes past 50km
        distance_score = max(0.0, 1.0 - (distance_km / 50.0))

        # Language match
        spec_langs = [l.strip().lower() for l in (spec.get("language") or "English").split(",")]
        language_score = 1.0 if patient_lang in spec_langs else 0.3

        # Availability score: 0–1, 0 days = 1.0, 60+ days = 0
        waitlist = spec.get("waitlist_days") or 30
        availability_score = max(0.0, 1.0 - (waitlist / 60.0))

        # Treatment scope: always 1 (passed filter)
        scope_score = 1.0

        final_score = (
            0.4 * distance_score
            + 0.2 * language_score
            + 0.3 * availability_score
            + 0.1 * scope_score
        )

        entry = {k: v for k, v in spec.items() if k != "constraints"}
        entry["distance_km"] = round(distance_km, 1)
        entry["score"] = round(final_score, 3)
        entry["score_breakdown"] = {
            "distance": round(distance_score, 2),
            "language": round(language_score, 2),
            "availability": round(availability_score, 2),
            "scope": scope_score,
        }
        scored.append(entry)

    scored.sort(key=lambda x: x["score"], reverse=True)
    for i, s in enumerate(scored, start=1):
        s["rank"] = i

    return scored


# ---------------------------------------------------------------------------
# Documentation recommendations
# ---------------------------------------------------------------------------

def recommend_documentation(specialty: str) -> list[dict]:
    """Query documentation_requirements for specialty."""
    return db.query(
        "SELECT doc_type, doc_description, required, examples FROM documentation_requirements WHERE specialty = ? ORDER BY required DESC",
        (specialty,),
    )


# ---------------------------------------------------------------------------
# Geography helpers
# ---------------------------------------------------------------------------

# Hardcoded centroids for demo (lat/lon for major Toronto-area cities)
_CITY_COORDS = {
    "toronto": (43.6532, -79.3832),
    "north york": (43.7615, -79.4111),
    "scarborough": (43.7764, -79.2318),
    "markham": (43.8561, -79.3370),
    "mississauga": (43.5890, -79.6441),
    "etobicoke": (43.6205, -79.5132),
    "york": (43.6875, -79.4770),
    "midtown": (43.6629, -79.3957),
    "downtown": (43.6532, -79.3832),
}


def _city_lat(location: str) -> float:
    return _CITY_COORDS.get(location.lower(), (43.6532, -79.3832))[0]


def _city_lon(location: str) -> float:
    return _CITY_COORDS.get(location.lower(), (43.6532, -79.3832))[1]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
