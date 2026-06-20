"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "../ui";
import { buildReferralPdf, downloadBlob } from "@/lib/engine/pdf.js";
import { conditionLabel } from "@/lib/data/specialists.js";
import { submitReferral } from "@/lib/api";

// Anonymous, unguessable token for the outcome-feedback link. No PII — the
// receiving clinic can use it later to report back on the referral.
function makeToken() {
  const rnd = () => Math.random().toString(36).slice(2, 8);
  return `${rnd()}${rnd()}`.slice(0, 10);
}

export default function FeedbackScreen({ cascade, selected, parsed, patient, formValues, onRestart }) {
  const provider = selected?.provider || cascade?.[0]?.provider || {};

  // Confetti to celebrate the moment the referral form is created.
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2800);
    return () => clearTimeout(t);
  }, []);

  // Persist referral to backend once on mount — fire-and-forget, never blocks UI.
  const persistedRef = useRef(false);
  const referralIdRef = useRef(null);
  useEffect(() => {
    if (persistedRef.current || !provider?.provider_id) return;
    persistedRef.current = true;
    submitReferral(provider, formValues, parsed).then((res) => {
      if (res?.referral_id) referralIdRef.current = res.referral_id;
    });
  }, []);

  const token = useMemo(() => makeToken(), []);
  const feedbackUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/feedback/${token}`;
  }, [token]);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const exportPdf = () => {
    const blob = buildReferralPdf({
      patient,
      parsed,
      formValues,
      provider,
      conditionLabel,
    });
    downloadBlob(blob, "womens_college_gi_referral.pdf");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {showConfetti && <Confetti />}

      {/* Form created */}
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Form created for {provider.name || "your specialist"}
        </h2>
        {provider.clinic && (
          <p className="mt-1 text-sm text-slate-500">{provider.clinic}</p>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
          Thank you. The referral form has been generated and is ready to download
          and send to the receiving clinic.
        </p>

        <button
          onClick={exportPdf}
          className="btn-primary mt-6 w-full px-6 py-4 text-base sm:w-auto"
        >
          ⬇ Download Referral PDF
        </button>
      </div>

      {/* Anonymous outcome-feedback link */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-slate-900">Outcome feedback link</h3>
        <p className="mt-1 text-sm text-slate-500">
          Share this anonymous link with the receiving clinic. When they report
          the outcome, it improves future wait-time and scope matching — no
          patient identifiers are attached.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={feedbackUrl}
            onFocus={(e) => e.target.select()}
            className="input flex-1 font-mono text-xs"
          />
          <button className="btn-ghost shrink-0" onClick={copyLink}>
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <button className="btn-ghost" onClick={onRestart}>
          Start new referral
        </button>
      </div>
    </div>
  );
}
