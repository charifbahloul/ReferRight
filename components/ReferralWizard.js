"use client";

import { useEffect, useMemo, useState } from "react";
import { Logo, Stepper, LoadingScreen } from "./ui";
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
  language_choice: "English",
  language_preference: "English",
  accessibility_needs: [],
  emr: {},
  emrAttached: false,
  transcriptAttached: false,
  transcriptName: "",
  emrName: "",
  demoId: null,
};

export default function ReferralWizard() {
  const [step, setStep] = useState(1);
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState(null);
  // { title, steps, ms, next } while an AI stage is "analyzing".
  const [loading, setLoading] = useState(null);

  // Drive the timed analyzing transitions.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setStep(loading.next);
      setLoading(null);
    }, loading.ms);
    return () => clearTimeout(t);
  }, [loading]);

  // Patient context derived from intake (referral_reason carried for form fill).
  const patient = useMemo(
    () => ({
      postal_code: intake.postal_code,
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
    setParsed(result);
    setStep(2);
  };

  // Parse -> Rank : 5s of "analyzing".
  const goRank = () =>
    setLoading({
      title: "Analyzing the specialist directory…",
      steps: [
        "Matching clinical scope to provider rules",
        "Checking accessibility & language fit",
        "Estimating wait times and triage fit",
        "Ranking best-fit specialists",
      ],
      ms: 5000,
      next: 3,
    });

  // Form -> Send : 7s of "analyzing".
  const goSend = (values) => {
    setFormValues(values);
    setLoading({
      title: "Preparing and sending the referral…",
      steps: [
        "Validating required fields",
        "Compiling the eReferral package",
        "Securing transmission to the receiving clinic",
        "Queuing auto-fallback cascade",
        "Sending to the top-ranked specialist",
      ],
      ms: 7000,
      next: 5,
    });
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
    setLoading(null);
    setStep(1);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <Stepper current={loading ? loading.next : step} steps={STEPS} />
      </header>

      {loading ? (
        <LoadingScreen title={loading.title} steps={loading.steps} />
      ) : (
        <>
          {step === 1 && (
            <IntakeScreen intake={intake} setIntake={setIntake} onParse={runParse} />
          )}
          {step === 2 && (
            <ParseScreen parsed={parsed} onBack={() => setStep(1)} onRank={goRank} />
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
              onApprove={goSend}
            />
          )}
          {step === 5 && (
            <FeedbackScreen
              cascade={cascade}
              selected={selected}
              parsed={parsed}
              patient={patient}
              formValues={formValues}
              onRestart={restart}
            />
          )}
        </>
      )}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Referral Compass · AI referral co-pilot
      </footer>
    </main>
  );
}
