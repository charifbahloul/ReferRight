// Synthetic demo patients + dictation scripts that map to the PRD demos.
// EMR extract intentionally omits a key field so the gap detector fires.

export const DEMO_CASES = [
  {
    id: "demo_gi",
    title: "The almost-failed GI referral",
    subtitle: "Iron-deficiency anemia + alarm features · Vanier",
    pitch:
      "Instead of asking the physician to know every specialist's hidden scope rules, the system reads the clinical intent and matches it to the right door.",
    referral_reason:
      "54-year-old woman with iron-deficiency anemia, dyspepsia, and a 10-pound unintentional weight loss. Needs GI assessment.",
    postal_code: "K1L",
    max_travel_km: 15,
    language_preference: "French",
    accessibility_needs: ["wheelchair_access", "near_transit"],
    urgency_hint: "semi_urgent",
    emr_extract: {
      age: 54,
      sex: "F",
      medications: "Pantoprazole 40 mg daily; Ferrous fumarate 300 mg daily",
      labs: "Hemoglobin 96 g/L (low); MCV 74 fL (low)", // ferritin intentionally missing
      prior_endoscopy: "No prior gastroscopy or colonoscopy on record",
      prior_imaging: "Abdominal ultrasound (2024): unremarkable",
    },
  },
  {
    id: "demo_oph",
    title: "Patient-centred routing",
    subtitle: "Cataracts · Orléans · cannot drive · prefers French",
    pitch:
      "The fastest referral is not always the best referral. The best referral is the one the patient can actually complete.",
    referral_reason:
      "Older patient with worsening cataracts and declining night vision. Lives in Orléans, cannot drive, prefers French.",
    postal_code: "K4A",
    max_travel_km: 25,
    language_preference: "French",
    accessibility_needs: ["near_transit"],
    urgency_hint: "routine",
    emr_extract: {
      age: 71,
      sex: "M",
      medications: "Amlodipine 5 mg daily; Atorvastatin 20 mg daily",
      visual_acuity: "OD 20/60, OS 20/80",
      diabetic: "no",
    },
  },
  {
    id: "demo_derm",
    title: "The changing mole",
    subtitle: "Suspicious pigmented lesion · Centretown",
    pitch:
      "A routine derm clinic would have bounced this. Scope matching routes it to the lesion clinic that takes urgent melanoma work-ups.",
    referral_reason:
      "Patient with a changing pigmented lesion on the back — irregular border, recent darkening and occasional bleeding over 2 months. Concerned about melanoma.",
    postal_code: "K2P",
    max_travel_km: 20,
    language_preference: "English",
    accessibility_needs: [],
    urgency_hint: "urgent",
    emr_extract: {
      age: 47,
      sex: "M",
      medications: "None",
      // lesion_description present but photo not attached -> gap
      lesion_description:
        "7 mm pigmented lesion, asymmetric, irregular border, two-tone brown/black",
    },
  },
  {
    id: "demo_mri",
    title: "The MRI request",
    subtitle: "Suspected lumbar radiculopathy · Nepean",
    pitch:
      "Routing the request to a centre that actually does this study — with the safety screen flagged before it bounces.",
    referral_reason:
      "Persistent low back pain radiating down the left leg with new foot drop. Requesting MRI lumbar spine to rule out disc herniation.",
    postal_code: "K2H",
    max_travel_km: 20,
    language_preference: "English",
    accessibility_needs: ["wheelchair_access"],
    urgency_hint: "semi_urgent",
    emr_extract: {
      age: 39,
      sex: "M",
      medications: "Naproxen 500 mg BID; Gabapentin 300 mg TID",
      body_part: "Lumbar spine",
      // safety_screen intentionally missing -> gap
    },
  },
];

export function getDemoCase(id) {
  return DEMO_CASES.find((d) => d.id === id) || null;
}
