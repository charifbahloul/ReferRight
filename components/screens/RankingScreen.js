"use client";

import { useMemo, useState } from "react";
import { Pill } from "../ui";
import { rankSpecialists } from "@/lib/engine/ranker.js";

export default function RankingScreen({ parsed, patient, onBack, onSelect }) {
  const [useLearning, setUseLearning] = useState(false);

  const directoryRanking = useMemo(
    () => rankSpecialists(parsed, patient, { useLearning: false }),
    [parsed, patient]
  );
  const learnedRanking = useMemo(
    () => rankSpecialists(parsed, patient, { useLearning: true }),
    [parsed, patient]
  );
  const ranking = useLearning ? learnedRanking : directoryRanking;

  const recommended = ranking.filter((r) => !r.excluded);
  const excluded = ranking.filter((r) => r.excluded);

  // Map provider -> directory rank for the before/after delta.
  const dirRankById = useMemo(() => {
    const m = {};
    directoryRanking.forEach((r) => (m[r.provider.provider_id] = r.rank));
    return m;
  }, [directoryRanking]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ranked specialists</h2>
          <p className="text-sm text-slate-500">
            Staged decision: scope → accessibility → triage → <span className="font-medium text-slate-700">wait time</span> → tie-breakers.
          </p>
        </div>
        <LearningToggle on={useLearning} onChange={setUseLearning} />
      </div>

      <div className="space-y-3">
        {recommended.map((r) => (
          <SpecialistCard
            key={r.provider.provider_id}
            r={r}
            onSelect={() => onSelect(r)}
            delta={useLearning ? dirRankById[r.provider.provider_id] - r.rank : 0}
            showDelta={useLearning}
          />
        ))}
      </div>

      {excluded.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Filtered out — and why
          </div>
          <div className="space-y-2">
            {excluded.map((r) => (
              <div
                key={r.provider.provider_id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-700">{r.provider.name}</div>
                  <div className="text-xs text-slate-500">{r.provider.clinic}</div>
                </div>
                <div className="max-w-[60%] text-right text-xs text-rose-600">
                  ⚠ {r.exclusionReason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button className="btn-ghost" onClick={onBack}>← Back to parse</button>
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function scopeLabel(score) {
  if (score >= 1) return "Full match";
  if (score > 0) return "Partial match";
  return "Specialty match";
}

function accessibilityLabel(score) {
  if (score >= 1) return "All needs met";
  if (score > 0) return "Some needs met";
  return "Needs not met";
}

function LearningToggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
        on ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-slate-700">
        <span
          className={`relative h-4 w-7 rounded-full transition ${on ? "bg-teal-500" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
              on ? "left-3.5" : "left-0.5"
            }`}
          />
        </span>
        Community-learned wait times
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        {on ? "Using opt-in real-world outcomes" : "Using directory data only"}
      </div>
    </button>
  );
}

function SpecialistCard({ r, onSelect, delta, showDelta }) {
  const p = r.provider;
  const isTop = r.rank === 1;
  const consider = r.tier === "consider";

  return (
    <div
      className={`card overflow-hidden ${isTop ? "ring-2 ring-compass-500" : ""}`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        {/* left identity */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${
                isTop ? "bg-compass-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {r.rank}
            </span>
            <div>
              <div className="font-bold text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-500">{p.clinic} · {p.specialty}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {isTop && <Pill tone="blue">★ Best match</Pill>}
            {consider && <Pill tone="amber">Consider — trade-offs</Pill>}
            <Pill tone="slate">⏱ ~{r.wait_days} day wait</Pill>
            {r.distance_km != null && <Pill tone="slate">📍 {r.distance_km} km</Pill>}
            <Pill tone={r.language_score >= 1 ? "green" : "red"}>
              🗣 {p.languages.join(", ")}
            </Pill>
            <Pill tone="slate">✓ {Math.round(p.acceptance_rate * 100)}% accept</Pill>
            {showDelta && delta !== 0 && (
              <Pill tone={delta > 0 ? "teal" : "red"}>
                {delta > 0 ? `▲ up ${delta}` : `▼ down ${Math.abs(delta)}`} vs directory
              </Pill>
            )}
          </div>

          {/* explanation */}
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {r.explanation.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>{e}</span>
              </li>
            ))}
            {r.tradeoffs.map((t, i) => (
              <li key={`t-${i}`} className="flex gap-2 text-amber-600">
                <span>⚠</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* right: concrete, usable numbers (no abstract percentages) */}
        <div className="w-full shrink-0 sm:w-56">
          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-center">
            <div className="text-3xl font-bold text-slate-900">~{r.wait_days}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              days to first appointment
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            <StatRow label="Distance" value={r.distance_km != null ? `${r.distance_km} km` : "—"} />
            <StatRow label="Acceptance rate" value={`${Math.round(p.acceptance_rate * 100)}%`} />
            <StatRow label="Languages" value={p.languages.join(", ")} />
            <StatRow label="Scope" value={scopeLabel(r.scope_match_score)} />
            <StatRow
              label="Accessibility"
              value={accessibilityLabel(r.accessibility_score)}
            />
          </dl>
          <button className="btn-primary mt-4 w-full" onClick={onSelect}>
            Use & fill form →
          </button>
        </div>
      </div>
    </div>
  );
}
