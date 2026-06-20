// Form auto-fill + missing-information detection (AI Flow Steps 5 & 6.4).
//
// Pulls structured values from: parsed referral intent, patient context, and
// the optional synthetic EMR extract. Returns filled fields plus the required
// fields that are still empty (so the console can prompt only for those).

import { getForm } from "../data/forms.js";
import { conditionLabel } from "../data/specialists.js";
import { resolvePlace } from "../data/geo.js";

const ACCESS_LABELS = {
  wheelchair_access: "wheelchair access",
  near_transit: "transit access",
  parking: "parking",
};

export function fillForm(formId, { parsed, patient, emr = {} }) {
  const form = getForm(formId);
  if (!form) return null;

  const place = resolvePlace(patient.postal_code);
  const filled = {};
  const autoFilledKeys = new Set();

  const set = (key, value) => {
    if (value === undefined || value === null || value === "") return;
    filled[key] = value;
    autoFilledKeys.add(key);
  };

  // Build accessibility/language note
  const accNeeds = (patient.accessibility_needs || []).map((n) => ACCESS_LABELS[n] || n.replace(/_/g, " "));
  const langNote = patient.language_preference ? `Prefers ${patient.language_preference}` : null;
  const accLine = [langNote, ...accNeeds].filter(Boolean).join("; ");

  // Common fields across templates
  set("reason_for_referral", patient.referral_reason || "");
  set(
    "red_flags",
    (parsed.red_flags || []).map((r) => r.replace(/_/g, " "))
  );
  set("urgency", parsed.urgency);
  if (accLine) set("patient_accessibility_needs", [accLine]);
  set("medications", emr.medications);

  // Specialty-specific mapping
  if (formId === "ocean_gi_v1") {
    set("relevant_labs", emr.labs);
    set("prior_imaging", emr.prior_imaging);
    set("prior_endoscopy", emr.prior_endoscopy);
  }
  if (formId === "ocean_derm_v1") {
    set("lesion_description", emr.lesion_description);
    set("photo_attached", emr.photo_attached);
  }
  if (formId === "ocean_ophtho_v1") {
    set("visual_acuity", emr.visual_acuity);
    set("diabetic", emr.diabetic);
    set("symptom_duration", emr.symptom_duration);
  }
  if (formId === "ocean_mri_v1") {
    set("body_part", emr.body_part);
    set("safety_screen", emr.safety_screen);
    set("contrast", emr.contrast);
  }

  // ---- missing required field detection ----
  const missing_required = form.fields
    .filter((f) => f.required && !filled[f.key])
    .map((f) => ({ key: f.key, label: f.label }));

  // ---- clinical gap narrative (PRD 6.4) ----
  const expectedData = parsed.required_form_data || [];
  const gapNarrative = buildGapNarrative(form.specialty, parsed, filled, expectedData);

  return {
    form,
    filled,
    autoFilledKeys: Array.from(autoFilledKeys),
    missing_required,
    gapNarrative,
  };
}

function buildGapNarrative(specialty, parsed, filled, expectedData) {
  if (expectedData.length === 0) return null;
  const condList = (parsed.conditions || []).map(conditionLabel).join(", ");
  // Heuristic: ferritin / safety screen / photo are common silent gaps.
  const labText = (filled.relevant_labs || "").toLowerCase();
  const missingItems = [];
  for (const item of expectedData) {
    const probe = item.toLowerCase();
    const present =
      labText.includes(probe.split(" ")[0]) ||
      JSON.stringify(filled).toLowerCase().includes(probe.split(" ")[0]);
    if (!present) missingItems.push(item);
  }
  if (missingItems.length === 0) return null;
  return `This ${specialty} referral (${condList}) typically requires ${expectedData.join(
    ", "
  )}. Missing from the current record: ${missingItems.join(", ")}.`;
}
