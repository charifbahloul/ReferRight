"use client";

import { useState } from "react";
import { Pill } from "../ui";

export default function FeedbackScreen({ cascade, selected, formValues, onRestart }) {
  // cascade: ordered list of recommended providers (top 5). selected is #1 used.
  const queue = cascade.slice(0, 5);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState(() => queue.map((_, i) => (i === 0 ? "sent" : "queued")));
  const [resolved, setResolved] = useState(null); // {type:'accepted'|'exhausted', idx}
  const [optIn, setOptIn] = useState(true);
  const [outcome, setOutcome] = useState(null);
  const [failReason, setFailReason] = useState("");

  const setStatus = (idx, s) =>
    setStatuses((arr) => arr.map((v, i) => (i === idx ? s : v)));

  const decline = () => {
    setStatus(activeIdx, "declined");
    const next = activeIdx + 1;
    if (next < queue.length) {
      setStatus(next, "sent");
      setActiveIdx(next);
    } else {
      setResolved({ type: "exhausted" });
    }
  };

  const accept = () => {
    setStatus(activeIdx, "accepted");
    setResolved({ type: "accepted", idx: activeIdx });
  };

  const exportForm = () => {
    const payload = {
      provider: queue[resolved?.idx ?? 0]?.provider?.name,
      form: formValues,
      generated_at: new Date().toISOString(),
      note: "Synthetic referral — Referral Compass demo. Not for clinical use.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referral_compass_form.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Send cascade */}
      <div className="card p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Send cascade</h2>
          <Pill tone="blue">one specialist at a time · auto-fallback</Pill>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          The approved referral is sent to the top match. On decline, it automatically
          advances to the next-best — no re-work for the clinician.
        </p>

        <div className="space-y-2">
          {queue.map((r, i) => (
            <div
              key={r.provider.provider_id}
              className={`flex items-center justify-between rounded-xl border p-3 ${
                statuses[i] === "sent"
                  ? "border-compass-300 bg-compass-50"
                  : statuses[i] === "accepted"
                  ? "border-emerald-300 bg-emerald-50"
                  : statuses[i] === "declined"
                  ? "border-slate-200 bg-slate-50 opacity-60"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-sm font-bold text-slate-500 shadow-sm">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{r.provider.name}</div>
                  <div className="text-xs text-slate-500">~{r.wait_days} day wait · {r.distance_km} km</div>
                </div>
              </div>
              <StatusTag status={statuses[i]} />
            </div>
          ))}
        </div>

        {!resolved && (
          <div className="mt-4 flex items-center gap-3">
            <button className="btn-primary" onClick={accept}>✓ Specialist accepts</button>
            <button className="btn-ghost" onClick={decline}>✗ Simulate decline → next</button>
          </div>
        )}

        {resolved?.type === "accepted" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            ✓ <span className="font-semibold">{queue[resolved.idx].provider.name}</span> accepted the referral.
            {resolved.idx > 0 && ` ${resolved.idx} earlier decline${resolved.idx > 1 ? "s" : ""} handled automatically.`}
          </div>
        )}
        {resolved?.type === "exhausted" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            All ranked specialists declined. A manual-handling ticket has been created in the platform.
          </div>
        )}
      </div>

      {/* Outcome feedback / learning loop */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Outcome feedback</h2>
        <p className="mb-4 text-sm text-slate-500">
          Opt-in only · no identifiable patient data — just structured outcome features that
          improve future scope matching and wait-time estimates.
        </p>

        <div className="flex flex-wrap gap-2">
          {["accepted", "rejected", "redirected", "wrong_scope", "too_long_wait"].map((o) => (
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
            placeholder="Reason if failed (optional)"
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
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

        {outcome && (
          <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            {optIn
              ? "Thanks — recorded. The ranking engine will weight this provider's wait-time and acceptance estimates slightly more accurately next time."
              : "Outcome noted for this session only."}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button className="btn-ghost" onClick={exportForm}>⬇ Export filled form</button>
          <button className="btn-primary" onClick={onRestart}>Start new referral</button>
        </div>
      </div>
    </div>
  );
}

function StatusTag({ status }) {
  const map = {
    queued: ["slate", "queued"],
    sent: ["blue", "● sent — awaiting"],
    declined: ["red", "declined"],
    accepted: ["green", "✓ accepted"],
  };
  const [tone, label] = map[status] || ["slate", status];
  return <Pill tone={tone}>{label}</Pill>;
}
