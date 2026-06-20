// Referral reason parser (AI Flow Step 1).
//
// Deterministic, rule-based clinical-intent extractor. It is intentionally
// transparent so the demo never depends on a network call. The interface
// (text in -> structured intent out) is identical to what an LLM call would
// return, so lib/engine/parser.js can be swapped for a model later without
// touching the UI.

const SPECIALTY_KEYWORDS = {
  Gastroenterology: ["gi", "gastro", "stomach", "bowel", "colon", "abdominal", "abdomen", "anemia", "dyspepsia", "reflux", "endoscopy", "colonoscopy", "liver", "celiac", "ibd", "rectal"],
  Dermatology: ["derm", "skin", "lesion", "mole", "melanoma", "rash", "psoriasis", "eczema", "acne", "pigmented", "nevus"],
  Ophthalmology: ["eye", "vision", "ophthal", "cataract", "glaucoma", "retina", "retinal", "macular", "ocular", "floaters", "diabetic eye"],
  "Diagnostic Imaging": ["mri", "imaging", "scan", "radiology"],
};

// Phrase -> condition key. Order matters: more specific first.
const CONDITION_RULES = [
  // GI
  [["iron-deficiency anemia", "iron deficiency anemia", "iron-deficiency anaemia", "anemia", "anaemia"], "iron_deficiency_anemia"],
  [["dyspepsia", "indigestion", "epigastric"], "dyspepsia"],
  [["weight loss", "lost weight", "unintentional weight"], "weight_loss"],
  [["malignancy", "cancer", "mass", "suspicious"], "suspected_gi_malignancy"],
  [["rectal bleeding", "blood in stool", "hematochezia", "melena"], "rectal_bleeding"],
  [["dysphagia", "difficulty swallowing", "trouble swallowing"], "dysphagia"],
  [["crohn", "colitis", "ibd", "inflammatory bowel"], "ibd"],
  [["celiac", "coeliac"], "celiac"],
  [["gerd", "reflux", "heartburn"], "gerd"],
  [["chronic abdominal pain", "abdominal pain"], "chronic_abdominal_pain"],
  [["liver enzyme", "elevated alt", "elevated ast", "abnormal liver"], "abnormal_liver_enzymes"],
  [["colon cancer screen", "colorectal screen", "fit positive", "fobt"], "colon_cancer_screening"],
  // Derm
  [["melanoma"], "suspected_melanoma"],
  [["pigmented lesion", "changing mole", "irregular mole", "atypical nevus", "changing pigmented"], "suspicious_pigmented_lesion"],
  [["skin cancer screen", "mole check"], "skin_cancer_screening"],
  [["psoriasis"], "psoriasis"],
  [["eczema", "dermatitis"], "eczema"],
  [["acne"], "acne"],
  [["rosacea"], "rosacea"],
  [["rash", "hives"], "rash"],
  // Ophtho
  [["cataract"], "cataract"],
  [["glaucoma"], "glaucoma"],
  [["diabetic retinopathy", "diabetic eye"], "diabetic_retinopathy"],
  [["macular degeneration", "amd"], "macular_degeneration"],
  [["dry eye"], "dry_eye"],
  [["retinal detachment", "flashes", "floaters", "curtain"], "retinal_detachment"],
  [["red eye"], "red_eye"],
  [["refractive", "glasses prescription", "near-sighted", "far-sighted"], "refractive_error"],
  // MRI
  [["mri brain", "brain mri", "head mri"], "mri_brain"],
  [["mri lumbar", "lumbar spine", "mri spine", "spine mri", "disc herniation", "radiculopathy"], "mri_spine"],
  [["mri knee", "knee mri"], "mri_knee"],
  [["mri abdomen", "abdominal mri"], "mri_abdomen"],
  [["mri", "msk mri", "musculoskeletal"], "mri_msk"],
];

// Red-flag phrases that raise triage urgency.
const RED_FLAG_RULES = [
  [["weight loss", "lost weight"], "weight_loss"],
  [["anemia", "anaemia"], "anemia"],
  [["rectal bleeding", "blood in stool", "melena", "hematochezia"], "gi_bleeding"],
  [["dysphagia", "difficulty swallowing"], "dysphagia"],
  [["malignancy", "cancer", "mass", "suspicious"], "suspected_malignancy"],
  [["melanoma", "bleeding lesion", "ulcerated", "rapid growth", "rapidly growing"], "alarm_skin_lesion"],
  [["sudden vision", "vision loss", "flashes", "floaters", "curtain"], "acute_vision_change"],
  [["foot drop", "weakness", "neuro deficit", "saddle"], "neuro_deficit"],
  [["severe", "acute", "worsening rapidly"], "rapid_progression"],
];

// Required supporting data the receiving clinic will expect, by condition.
const REQUIRED_DATA = {
  iron_deficiency_anemia: ["CBC", "ferritin", "FIT/FOBT result"],
  suspected_gi_malignancy: ["CBC", "prior endoscopy history", "imaging"],
  weight_loss: ["weight trend", "CBC"],
  dyspepsia: ["medication list", "H. pylori status"],
  rectal_bleeding: ["CBC", "prior colonoscopy history"],
  suspicious_pigmented_lesion: ["clinical photo", "lesion measurements"],
  suspected_melanoma: ["dermoscopy photo", "lesion measurements"],
  cataract: ["visual acuity"],
  glaucoma: ["IOP", "visual fields"],
  mri_spine: ["MRI safety screen", "neuro exam findings"],
  mri_brain: ["MRI safety screen", "eGFR if contrast"],
};

function matchAny(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

export function parseReferral(reasonText) {
  const text = (reasonText || "").toLowerCase();

  // --- specialty intent (score by keyword hits) ---
  let specialty_intent = null;
  let bestScore = 0;
  for (const [specialty, kws] of Object.entries(SPECIALTY_KEYWORDS)) {
    const score = kws.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      specialty_intent = specialty;
    }
  }

  // --- conditions ---
  const conditions = [];
  for (const [phrases, key] of CONDITION_RULES) {
    if (matchAny(text, phrases) && !conditions.includes(key)) conditions.push(key);
  }
  // Clinical-intent inference: GI alarm features (anemia + weight loss, or
  // rectal bleeding/dysphagia) imply a malignancy work-up, so the referral
  // must go to a provider that accepts that scope. This is intent recognition,
  // not a diagnosis.
  if (specialty_intent === "Gastroenterology") {
    const hasAnemia = conditions.includes("iron_deficiency_anemia");
    const hasWeightLoss = conditions.includes("weight_loss");
    const alarmGi =
      (hasAnemia && hasWeightLoss) ||
      conditions.includes("rectal_bleeding") ||
      conditions.includes("dysphagia");
    if (alarmGi && !conditions.includes("suspected_gi_malignancy")) {
      conditions.push("suspected_gi_malignancy");
    }
  }

  // Filter conditions to the detected specialty's vocabulary when possible,
  // but always keep at least what we found.
  const specialtyConditions = conditions;

  // --- red flags ---
  const red_flags = [];
  for (const [phrases, key] of RED_FLAG_RULES) {
    if (matchAny(text, phrases) && !red_flags.includes(key)) red_flags.push(key);
  }

  // --- urgency ---
  let urgency = "routine";
  if (text.match(/\burgent\b|emergency|immediately|same.?day|acute/)) urgency = "urgent";
  else if (red_flags.length >= 1) urgency = "semi_urgent";
  if (red_flags.includes("neuro_deficit") || red_flags.includes("acute_vision_change") || red_flags.includes("suspected_malignancy")) {
    urgency = "urgent";
  }

  // --- required supporting data ---
  const required_form_data = [];
  for (const c of specialtyConditions) {
    for (const item of REQUIRED_DATA[c] || []) {
      if (!required_form_data.includes(item)) required_form_data.push(item);
    }
  }

  // confidence: more conditions + a clear specialty => higher
  const confidence = Math.min(
    0.98,
    0.5 + 0.12 * specialtyConditions.length + (specialty_intent ? 0.15 : 0)
  );

  return {
    specialty_intent,
    conditions: specialtyConditions,
    red_flags,
    urgency,
    required_form_data,
    confidence: Math.round(confidence * 100) / 100,
  };
}
