"use client";

import { useMemo, useState } from "react";
import { Logo, Stepper } from "./ui";
import IntakeScreen from "./screens/IntakeScreen";
import ParseScreen from "./screens/ParseScreen";
import RankingScreen from "./screens/RankingScreen";
import FormScreen from "./screens/FormScreen";
import FeedbackScreen from "./screens/FeedbackScreen";
import { parseReferral } from "@/lib/engine/parser.js";
import { rankSpecialists } from "@/lib/engine/ranker.js";

const STEPS = ["Intake", "Parse", "Rank", "Form", "Send"];

const EMPTY_INTAKE = {
  referral_reason: "",
  postal_code: "",
  max_travel_km: 15,
  language_preference: "English",
  accessibility_needs: [],
  urgency_hint: "",
  emr: {},
  emrAttached: false,
  transcriptAttached: false,
  demoId: null,
};

export default function ReferralWizard() {
  const [step, setStep] = useState(1);
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState(null);

  // Patient context derived from intake (referral_reason carried for form fill).
  const patient = useMemo(
    () => ({
      postal_code: intake.postal_code,
      max_travel_km: intake.max_travel_km,
      language_preference: intake.language_preference,
      accessibility_needs: intake.accessibility_needs,
      referral_reason: intake.referral_reason,
      emr: intake.emr,
      emrAttached: intake.emrAttached,
    }),
    [intake]
  );

  const runParse = () => {
    const result = parseReferral(intake.referral_reason);
    // Honour an explicit urgency hint if provided.
    if (intake.urgency_hint) result.urgency = intake.urgency_hint;
    setParsed(result);
    setStep(2);
  };

  const cascade = useMemo(() => {
    if (!parsed) return [];
    return rankSpecialists(parsed, patient, { useLearning: false }).filter((r) => !r.excluded);
  }, [parsed, patient]);

  const restart = () => {
    setIntake(EMPTY_INTAKE);
    setParsed(null);
    setSelected(null);
    setFormValues(null);
    setStep(1);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <Stepper current={step} steps={STEPS} />
      </header>

      {step === 1 && (
        <IntakeScreen intake={intake} setIntake={setIntake} onParse={runParse} />
      )}
      {step === 2 && (
        <ParseScreen parsed={parsed} onBack={() => setStep(1)} onRank={() => setStep(3)} />
      )}
      {step === 3 && (
        <RankingScreen
          parsed={parsed}
          patient={patient}
          onBack={() => setStep(2)}
          onSelect={(r) => {
            setSelected(r);
            setStep(4);
          }}
        />
      )}
      {step === 4 && selected && (
        <FormScreen
          selected={selected}
          parsed={parsed}
          patient={patient}
          onBack={() => setStep(3)}
          onApprove={(values) => {
            setFormValues(values);
            setStep(5);
          }}
        />
      )}
      {step === 5 && (
        <FeedbackScreen
          cascade={cascade}
          selected={selected}
          formValues={formValues}
          onRestart={restart}
        />
      )}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Referral Compass · hackathon MVP · synthetic data only · not for clinical use ·
        human-in-the-loop, explainable, no autonomous submission
      </footer>
    </main>
  );
}
