import json
import logging
import os

from flask import Flask, request, jsonify
from flask_cors import CORS

import database as db
import extract as extractor
import match as matcher
import forms as form_handler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Startup: initialize DB if it doesn't exist
# ---------------------------------------------------------------------------

if not os.path.exists(db.DB_PATH):
    logger.info("Database not found at %s — initializing from schema.sql", db.DB_PATH)
    db.init_db()
else:
    logger.info("Database found at %s", db.DB_PATH)


# ---------------------------------------------------------------------------
# Auth (minimal: bearer token check for demo)
# ---------------------------------------------------------------------------

DEMO_TOKEN = os.environ.get("DEMO_TOKEN", "demo-token-dev")


def _check_auth():
    token = request.headers.get("Authorization", "")
    if token.startswith("Bearer "):
        token = token[7:]
    return token == DEMO_TOKEN


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "1.0.0-mvp"})


@app.route("/extract", methods=["POST"])
def extract():
    """
    POST /extract
    Body: {raw_content: str, visit_id?: int, use_claude?: bool}
    Returns: {success, extracted_data, confidence_score, scribe_context_id, extraction_version}
    """
    body = request.get_json(silent=True) or {}
    raw = body.get("raw_content", "").strip()
    if not raw or len(raw) < 20:
        return jsonify({"error": "raw_content too short or missing"}), 400

    visit_id = body.get("visit_id")
    use_claude = bool(body.get("use_claude", False))

    result = extractor.run_extraction(raw, visit_id=visit_id, use_claude=use_claude)
    return jsonify(result)


@app.route("/checklist", methods=["POST"])
def checklist():
    """
    POST /checklist
    Body: {specialty: str, extracted_data: dict, scribe_context_id?: int}
    Returns: {found, missing, optional, completion_pct, blocks_submission, documentation_requirements}
    """
    body = request.get_json(silent=True) or {}
    specialty = body.get("specialty", "").strip()
    extracted = body.get("extracted_data")

    if not specialty:
        return jsonify({"error": "specialty is required"}), 400
    if not isinstance(extracted, dict):
        return jsonify({"error": "extracted_data must be a JSON object"}), 400

    ctx_id = body.get("scribe_context_id")
    result = matcher.build_checklist(specialty, extracted, ctx_id)
    return jsonify(result)


@app.route("/match", methods=["POST"])
def match():
    """
    POST /match
    Body: {specialty: str, patient_location?: str, patient_data?: {age, gender, diagnosis, language}}
    Returns: {success, eligible_specialists, ranked_list, documentation_required}
    """
    body = request.get_json(silent=True) or {}
    specialty = body.get("specialty", "").strip()
    if not specialty:
        return jsonify({"error": "specialty is required"}), 400

    patient_data = body.get("patient_data") or {}

    # Optionally enrich from DB if patient_id provided
    patient_id = body.get("patient_id")
    if patient_id and not patient_data:
        patient = db.query_one("SELECT * FROM patients WHERE id = ?", (patient_id,))
        if patient:
            patient_data = dict(patient)

    patient_location = body.get("patient_location") or patient_data.get("city") or "Toronto"

    filtered = matcher.filter_specialists(patient_data, specialty)
    ranked = matcher.rank_specialists(patient_data, filtered, patient_location)
    docs = matcher.recommend_documentation(specialty)

    return jsonify({
        "success": True,
        "eligible_specialists": len(ranked),
        "ranked_list": ranked,
        "documentation_required": docs,
    })


@app.route("/form", methods=["POST"])
def form():
    """
    POST /form
    Body: {specialist_id: int, patient_id: int, extracted_data: dict, user_filled_data?: dict}
    Returns: {success, form_variant, clinic_id, specialist, pre_filled_form}
    """
    body = request.get_json(silent=True) or {}
    specialist_id = body.get("specialist_id")
    patient_id = body.get("patient_id")
    extracted = body.get("extracted_data")

    if not specialist_id or not patient_id:
        return jsonify({"error": "specialist_id and patient_id are required"}), 400
    if not isinstance(extracted, dict):
        return jsonify({"error": "extracted_data must be a JSON object"}), 400

    user_filled = body.get("user_filled_data") or {}
    result = form_handler.prefill_form(specialist_id, patient_id, extracted, user_filled)

    if "error" in result:
        return jsonify(result), 404

    return jsonify({"success": True, **result})


@app.route("/submit-referral", methods=["POST"])
def submit_referral():
    """
    POST /submit-referral
    Body: {specialist_id: int, patient_id: int, from_provider_id: int, form_data: dict}
    Returns: {success, referral_id, status, specialist_email}
    """
    body = request.get_json(silent=True) or {}
    specialist_id = body.get("specialist_id")
    patient_id = body.get("patient_id")
    from_provider_id = body.get("from_provider_id", 1)
    form_data = body.get("form_data") or {}

    if not specialist_id or not patient_id:
        return jsonify({"error": "specialist_id and patient_id are required"}), 400

    success, referral_id = form_handler.submit_referral(
        specialist_id, patient_id, from_provider_id, form_data
    )

    if not success:
        return jsonify({"error": referral_id}), 400

    specialist = db.query_one("SELECT email FROM specialists WHERE id = ?", (specialist_id,))
    return jsonify({
        "success": True,
        "referral_id": referral_id,
        "status": "submitted",
        "specialist_email": specialist["email"] if specialist else None,
        "note": "Email notification mocked — not sent in MVP",
    })


# ---------------------------------------------------------------------------
# /log-outcome — learning loop bridge
# Accepts the frontend's string provider IDs — no integer mapping required.
# ---------------------------------------------------------------------------

@app.route("/log-outcome", methods=["POST"])
def log_outcome():
    """
    POST /log-outcome
    Body: {
      provider_id: str,        // frontend string ID e.g. "spec_gi_01"
      provider_name: str,
      specialty: str,
      outcome: str,            // "accepted"|"rejected"|"redirected"|"wrong_scope"|"too_long_wait"
      fail_reason?: str,
      opt_in: bool,            // physician opted in to community learning
      form_values?: dict,
      referral_id?: str        // if /submit-referral was called first
    }
    Returns: {success, logged}
    """
    body = request.get_json(silent=True) or {}
    outcome = body.get("outcome", "").strip()
    opt_in = bool(body.get("opt_in", False))
    provider_name = body.get("provider_name", "unknown")
    specialty = body.get("specialty", "unknown")
    fail_reason = body.get("fail_reason", "")
    referral_id_str = body.get("referral_id")

    if not outcome:
        return jsonify({"error": "outcome is required"}), 400

    if not opt_in:
        logger.info("Outcome logged session-only (opt_in=False): outcome=%s provider=%s", outcome, provider_name)
        return jsonify({"success": True, "logged": False})

    # Resolve referral_id integer if provided
    referral_db_id = None
    if referral_id_str:
        try:
            referral_db_id = int(referral_id_str.replace("ref_", ""))
        except ValueError:
            pass

    # Insert into rejection_log for non-accepted outcomes
    if outcome != "accepted":
        field_missing = None
        if outcome == "wrong_scope":
            field_missing = "scope_mismatch"
        elif outcome == "too_long_wait":
            field_missing = "wait_time"

        rejection_reason = fail_reason or outcome.replace("_", " ")

        if referral_db_id:
            db.execute(
                """INSERT INTO rejection_log (referral_id, rejection_reason, field_missing, timestamp)
                   VALUES (?, ?, ?, CURRENT_TIMESTAMP)""",
                (referral_db_id, rejection_reason, field_missing),
            )
            # Update referral status
            db.execute(
                "UPDATE referrals SET status=?, rejection_reason=?, rejection_timestamp=CURRENT_TIMESTAMP WHERE id=?",
                (outcome, rejection_reason, referral_db_id),
            )
        else:
            # No referral_id — log anonymously with provider name only
            anon_id = db.execute(
                """INSERT INTO referrals
                   (patient_id, from_provider_id, target_specialty, reason, status, rejection_reason)
                   VALUES (0, 0, ?, ?, ?, ?)""",
                (specialty, f"Frontend referral — {provider_name}", outcome, rejection_reason),
            )
            db.execute(
                """INSERT INTO rejection_log (referral_id, rejection_reason, field_missing)
                   VALUES (?, ?, ?)""",
                (anon_id, rejection_reason, field_missing),
            )

        logger.info(
            "Outcome logged: outcome=%s specialty=%s provider=%s reason=%s",
            outcome, specialty, provider_name, rejection_reason,
        )

    return jsonify({"success": True, "logged": True, "outcome": outcome})


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(e):
    logger.exception("Internal server error (patient data not logged)")
    return jsonify({"error": "Internal server error", "code": 500}), 500


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
