import json
import logging

import database as db

logger = logging.getLogger(__name__)


def get_form_variant(clinic_id: int, specialty: str) -> list[dict]:
    """
    Query clinic_form_variants for this clinic/specialty combo.
    Returns ordered list of {form_field_name, label, required, field_order}.
    Falls back to default variant (clinic_id=1) if no variant found.
    """
    fields = db.query(
        """SELECT form_field_name, label, required, field_order
           FROM clinic_form_variants
           WHERE clinic_id = ? AND specialty = ?
           ORDER BY field_order""",
        (clinic_id, specialty),
    )
    if not fields:
        # Fall back to any available variant for this specialty
        fields = db.query(
            """SELECT form_field_name, label, required, field_order
               FROM clinic_form_variants
               WHERE specialty = ?
               ORDER BY field_order""",
            (specialty,),
        )
    return fields


def prefill_form(
    specialist_id: int,
    patient_id: int,
    extracted_data: dict,
    user_filled: dict | None = None,
) -> dict:
    """
    Merge extracted_data + user-supplied data into the clinic's form template.
    Returns {form_variant, clinic_id, pre_filled_form}.
    """
    if user_filled is None:
        user_filled = {}

    # Get specialist + their clinic
    specialist = db.query_one(
        "SELECT * FROM specialists WHERE id = ?", (specialist_id,)
    )
    if not specialist:
        return {"error": "Specialist not found"}

    specialty = specialist["specialty"]
    clinic_id = specialist.get("clinic_id") or 1

    # Get patient info
    patient = db.query_one("SELECT * FROM patients WHERE id = ?", (patient_id,))

    # Get form fields for this clinic/specialty
    form_fields = get_form_variant(clinic_id, specialty)

    # Build pre-filled values
    meds = extracted_data.get("medications", [])
    med_names = ", ".join(m["name"] for m in meds)
    controller_meds = ", ".join(m["name"] for m in meds if m.get("type") in ("controller", "LABA", "LAMA", "LTRA"))
    cardiac_meds = ", ".join(m["name"] for m in meds if m.get("type") in (
        "beta_blocker", "ACE_inhibitor", "CCB", "statin", "antiplatelet_anticoag", "diuretic", "nitrate"))
    topical_meds = ", ".join(m["name"] for m in meds if m.get("type") in (
        "topical_antibacterial", "keratolytic", "retinoid", "antibiotic", "systemic_retinoid", "anti_androgen"))

    test = extracted_data.get("test_results", {})
    symptoms = extracted_data.get("symptoms", {})
    diagnosis_codes = ", ".join(extracted_data.get("diagnosis", []))

    auto_values = {
        "patient_name": patient["name"] if patient else "",
        "patient_dob": patient["dob"] if patient else "",
        "patient_gender": patient["gender"] if patient else "",
        "referring_physician": "",  # Provider not passed in; UI fills
        "diagnosis": diagnosis_codes,
        "current_medications": med_names,
        # Pulmonology
        "fev1": test.get("FEV1", ""),
        "fev1_fvc": test.get("FEV1_FVC", ""),
        "peak_flow": test.get("peak_flow", ""),
        "exacerbation_frequency": symptoms.get("exacerbation_frequency", ""),
        "triggers": ", ".join(symptoms.get("triggers", [])) if isinstance(symptoms.get("triggers"), list) else symptoms.get("triggers", ""),
        "controller_medications": controller_meds,
        # Dermatology
        "acne_duration": symptoms.get("duration", ""),
        "prior_treatments": topical_meds,
        "severity": symptoms.get("severity", ""),
        "lesion_type": ", ".join(symptoms.get("lesion_types", [])) if isinstance(symptoms.get("lesion_types"), list) else "",
        "scarring": symptoms.get("scarring", ""),
        # Cardiology
        "ejection_fraction": test.get("EF", ""),
        "bp": test.get("BP", ""),
        "hr": test.get("HR", ""),
        "echo_date": test.get("echo_date", ""),
        "cardiac_meds": cardiac_meds,
        "symptoms": extracted_data.get("clinical_notes", ""),
        # Shared
        "urgency": "Routine",
    }

    # Build ordered form with values
    pre_filled = {}
    for field in form_fields:
        fname = field["form_field_name"]
        # User-supplied overrides auto
        value = user_filled.get(fname) or auto_values.get(fname, "")
        pre_filled[fname] = {
            "label": field["label"],
            "value": value,
            "required": bool(field["required"]),
            "auto_filled": bool(value and fname not in user_filled),
        }

    variant_name = f"clinic_{clinic_id}_{specialty.lower()}"
    return {
        "form_variant": variant_name,
        "clinic_id": clinic_id,
        "specialist": {"id": specialist_id, "name": specialist["name"], "email": specialist.get("email")},
        "pre_filled_form": pre_filled,
    }


def submit_referral(
    specialist_id: int,
    patient_id: int,
    from_provider_id: int,
    form_data: dict,
) -> tuple[bool, str]:
    """
    Insert referral record into DB. Returns (success, referral_id_string).
    Does NOT send email in MVP (mock only).
    """
    specialist = db.query_one("SELECT specialty FROM specialists WHERE id = ?", (specialist_id,))
    if not specialist:
        return False, "Specialist not found"

    specialty = specialist["specialty"]
    reason = form_data.get("symptoms") or form_data.get("diagnosis") or "See attached form"

    ref_id = db.execute(
        """INSERT INTO referrals
           (patient_id, from_provider_id, target_specialty, target_specialist_id, reason, status)
           VALUES (?, ?, ?, ?, ?, 'submitted')""",
        (patient_id, from_provider_id, specialty, specialist_id, reason),
    )

    referral_id_str = f"ref_{ref_id:06d}"
    logger.info(
        "Referral submitted: id=%s patient_id=%d specialist_id=%d specialty=%s",
        referral_id_str, patient_id, specialist_id, specialty,
    )
    return True, referral_id_str
