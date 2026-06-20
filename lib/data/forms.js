// Synthetic Ocean-style referral form templates.
// Each field: { key, label, required, type, triage }
// type: text | textarea | select | tags ; triage flags a field used in triage.

export const FORM_TEMPLATES = {
  ocean_gi_v1: {
    form_id: "ocean_gi_v1",
    specialty: "Gastroenterology",
    title: "Ocean eReferral — Gastroenterology",
    fields: [
      { key: "reason_for_referral", label: "Reason for referral", required: true, type: "textarea" },
      { key: "red_flags", label: "Red flags / alarm features", required: true, type: "tags", triage: true },
      { key: "relevant_labs", label: "Relevant labs (CBC, ferritin, FIT/FOBT)", required: true, type: "textarea" },
      { key: "medications", label: "Current medications", required: true, type: "textarea" },
      { key: "prior_imaging", label: "Prior imaging", required: false, type: "textarea" },
      { key: "prior_endoscopy", label: "Prior endoscopy / colonoscopy history", required: true, type: "textarea" },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language needs", required: false, type: "tags" },
    ],
  },
  ocean_derm_v1: {
    form_id: "ocean_derm_v1",
    specialty: "Dermatology",
    title: "Ocean eReferral — Dermatology",
    fields: [
      { key: "reason_for_referral", label: "Reason for referral", required: true, type: "textarea" },
      { key: "lesion_description", label: "Lesion description (size, change, ABCDE)", required: true, type: "textarea", triage: true },
      { key: "duration", label: "Duration of concern", required: true, type: "text" },
      { key: "red_flags", label: "Red flags (rapid growth, bleeding, ulceration)", required: true, type: "tags", triage: true },
      { key: "photo_attached", label: "Dermoscopy / clinical photo attached", required: false, type: "select", options: ["yes", "no"] },
      { key: "medications", label: "Current medications", required: true, type: "textarea" },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language needs", required: false, type: "tags" },
    ],
  },
  ocean_ophtho_v1: {
    form_id: "ocean_ophtho_v1",
    specialty: "Ophthalmology",
    title: "Ocean eReferral — Ophthalmology",
    fields: [
      { key: "reason_for_referral", label: "Reason for referral", required: true, type: "textarea" },
      { key: "visual_acuity", label: "Visual acuity (if available)", required: false, type: "text" },
      { key: "symptom_duration", label: "Symptom duration & progression", required: true, type: "text", triage: true },
      { key: "red_flags", label: "Red flags (sudden vision loss, flashes/floaters, pain)", required: true, type: "tags", triage: true },
      { key: "medications", label: "Current medications", required: true, type: "textarea" },
      { key: "diabetic", label: "Diabetic?", required: false, type: "select", options: ["yes", "no", "unknown"] },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language / transport needs", required: false, type: "tags" },
    ],
  },
  ocean_mri_v1: {
    form_id: "ocean_mri_v1",
    specialty: "Diagnostic Imaging",
    title: "Ocean eRequest — MRI",
    fields: [
      { key: "reason_for_referral", label: "Clinical indication", required: true, type: "textarea" },
      { key: "body_part", label: "Body part / modality requested", required: true, type: "text", triage: true },
      { key: "red_flags", label: "Red flags (neuro deficit, trauma, suspected malignancy)", required: true, type: "tags", triage: true },
      { key: "contrast", label: "Contrast required?", required: false, type: "select", options: ["yes", "no", "radiologist to decide"] },
      { key: "safety_screen", label: "MRI safety screen (pacemaker, implants, eGFR)", required: true, type: "textarea" },
      { key: "medications", label: "Current medications", required: false, type: "textarea" },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language needs", required: false, type: "tags" },
    ],
  },

  ocean_pulm_v1: {
    form_id: "ocean_pulm_v1",
    specialty: "Pulmonology",
    title: "Ocean eReferral — Pulmonology / Respirology",
    fields: [
      { key: "reason_for_referral", label: "Reason for referral", required: true, type: "textarea" },
      { key: "red_flags", label: "Red flags / alarm features", required: true, type: "tags", triage: true },
      { key: "fev1", label: "FEV1 (%) — most recent spirometry", required: true, type: "text", triage: true },
      { key: "fev1_fvc", label: "FEV1/FVC ratio", required: true, type: "text" },
      { key: "peak_flow", label: "Peak flow (L/min)", required: false, type: "text" },
      { key: "controller_medications", label: "Current controller medications (ICS, LABA, LAMA)", required: true, type: "textarea" },
      { key: "rescue_medications", label: "Rescue medications (SABA use frequency)", required: true, type: "text" },
      { key: "exacerbation_frequency", label: "Exacerbation frequency (per month/year)", required: true, type: "text", triage: true },
      { key: "triggers", label: "Known triggers", required: false, type: "tags" },
      { key: "medications", label: "Full medication list", required: true, type: "textarea" },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language needs", required: false, type: "tags" },
    ],
  },

  ocean_cardio_v1: {
    form_id: "ocean_cardio_v1",
    specialty: "Cardiology",
    title: "Ocean eReferral — Cardiology",
    fields: [
      { key: "reason_for_referral", label: "Reason for referral", required: true, type: "textarea" },
      { key: "red_flags", label: "Red flags / alarm features", required: true, type: "tags", triage: true },
      { key: "ejection_fraction", label: "Ejection fraction (EF %)", required: true, type: "text", triage: true },
      { key: "bp", label: "Blood pressure (systolic/diastolic)", required: true, type: "text" },
      { key: "hr", label: "Heart rate (bpm)", required: false, type: "text" },
      { key: "echo_date", label: "Most recent echo date", required: false, type: "text" },
      { key: "ecg_findings", label: "ECG findings", required: true, type: "textarea" },
      { key: "cardiac_medications", label: "Current cardiac medications", required: true, type: "textarea" },
      { key: "symptoms", label: "Symptom description (chest pain, dyspnea, palpitations)", required: true, type: "textarea", triage: true },
      { key: "medications", label: "Full medication list", required: true, type: "textarea" },
      { key: "urgency", label: "Requested urgency", required: true, type: "select", options: ["routine", "semi_urgent", "urgent"], triage: true },
      { key: "patient_accessibility_needs", label: "Patient accessibility / language needs", required: false, type: "tags" },
    ],
  },
};

export function getForm(formId) {
  return FORM_TEMPLATES[formId] || null;
}
