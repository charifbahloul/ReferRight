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
};

export function getForm(formId) {
  return FORM_TEMPLATES[formId] || null;
}
