"use client";

import { useEffect, useState } from "react";
import { Pill, Confetti } from "../ui";
import { buildPdf, downloadBlob } from "@/lib/engine/pdf.js";
import { getForm } from "@/lib/data/forms.js";
import { conditionLabel } from "@/lib/data/specialists.js";

export default function FeedbackScreen({ cascade, selected, parsed, patient, formValues, onRestart }) {
  // cascade: ordered list of recommended providers (top 5). selected is #1 used.
  const queue = cascade.slice(0, 5);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState(() => queue.map((_, i) => (i === 0 ? "sent" : "queued")));
  const [resolved, setResolved] = useState(null); // {type:'accepted'|'exhausted', idx}
  const [optIn, setOptIn] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [failReason, setFailReason] = useState("");

  // Confetti to celebrate the moment the referral is sent.
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2800);
    return () => clearTimeout(t);
  }, []);

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

  const exportPdf = () => {
    const provider = queue[resolved?.idx ?? 0]?.provider || selected?.provider;
    const form = getForm(selected?.provider?.required_form_id);
    const blocks = [];

    blocks.push({ text: "Referral Compass — eReferral", size: 18, bold: true, gap: 6 });
    if (form) blocks.push({ text: form.title, size: 12, bold: true, gap: 8 });
    blocks.push({
      text: `Routed to: ${provider?.name || "—"}${provider?.clinic ? " · " + provider.clinic : ""}`,
    });
    blocks.push({ text: `Generated: ${new Date().toLocaleString()}`, gap: 12 });

    blocks.push({ text: "Patient context", size: 13, bold: true, gap: 4 });
    blocks.push({ text: `Location (FSA): ${patient?.postal_code || "—"}` });
    blocks.push({ text: `Language preference: ${patient?.language_preference || "—"}` });
    blocks.push({
      text: `Accessibility needs: ${
        (patient?.accessibility_needs || []).map((n) => n.replace(/_/g, " ")).join(", ") ||
        "none specified"
      }`,
      gap: 12,
    });

    if (parsed) {
      blocks.push({ text: "Clinical parse", size: 13, bold: true, gap: 4 });
      blocks.push({ text: `Specialty: ${parsed.specialty_intent || "—"}` });
      blocks.push({
        text: `Conditions: ${(parsed.conditions || []).map(conditionLabel).join(", ") || "—"}`,
      });
      blocks.push({ text: `Triage: ${parsed.urgency || "—"}` });
      blocks.push({
        text: `Red flags: ${
          (parsed.red_flags || []).map((r) => r.replace(/_/g, " ")).join(", ") || "none"
        }`,
        gap: 12,
      });
    }

    blocks.push({ text: "Referral form", size: 13, bold: true, gap: 6 });
    const fields = form?.fields || [];
    if (fields.length) {
      for (const f of fields) {
        let v = formValues?.[f.key];
        if (Array.isArray(v)) v = v.join(", ");
        blocks.push({ text: `${f.label}`, bold: true, gap: 1 });
        blocks.push({ text: v && String(v).trim() ? String(v) : "—", gap: 7 });
      }
    } else if (formValues) {
      for (const [k, val] of Object.entries(formValues)) {
        blocks.push({ text: `${k}: ${Array.isArray(val) ? val.join(", ") : val}` });
      }
    }

    downloadBlob(buildPdf(blocks), "referral_compass.pdf");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {showConfetti && <Confetti />}
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
          Structured outcome features that improve future scope matching and wait-time estimates.
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
          <button className="btn-ghost" onClick={exportPdf}>⬇ Download referral PDF</button>
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
