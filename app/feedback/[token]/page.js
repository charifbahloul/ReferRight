"use client";

import { useState } from "react";
import { Logo, Confetti } from "@/components/ui";

const OUTCOMES = ["accepted", "rejected", "redirected", "wrong_scope", "too_long_wait"];

export default function FeedbackPage() {
  const [outcome, setOutcome] = useState(null);
  const [reason, setReason] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Confetti />
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <h1 className="text-xl font-bold text-slate-900">Thank you</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">
            Your outcome has been recorded anonymously. It helps the ranking
            engine estimate wait times and scope fit more accurately for future
            referrals.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <header className="mb-6 flex justify-center">
        <Logo />
      </header>

      <div className="card p-6">
        <h1 className="text-lg font-bold text-slate-900">Report referral outcome</h1>
        <p className="mt-1 text-sm text-slate-500">
          Anonymous feedback for this referral. No patient identifiers are
          collected — only the outcome.
        </p>

        <div className="mt-5 text-sm font-medium text-slate-700">What happened?</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => setOutcome(o)}
              className={`pill border ${
                outcome === o
                  ? "border-compass-300 bg-compass-50 text-compass-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {o.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {outcome && outcome !== "accepted" && (
          <input
            className="input mt-3"
            placeholder="Reason if declined / redirected (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="h-4 w-4 accent-teal-600"
          />
          Contribute this outcome to community learning
        </label>

        <button
          className="btn-primary mt-6 w-full"
          disabled={!outcome}
          onClick={() => setSubmitted(true)}
        >
          Submit feedback
        </button>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        Referral Compass · anonymous outcome feedback
      </footer>
    </main>
  );
}
