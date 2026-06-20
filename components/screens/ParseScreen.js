"use client";

import { Pill } from "../ui";
import { conditionLabel } from "@/lib/data/specialists.js";

export default function ParseScreen({ parsed, onBack, onRank }) {
  if (!parsed) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">AI clinical parse</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block label="Suspected specialty">
            <span className="text-base font-semibold text-slate-900">
              {parsed.specialty_intent || "Unclear — please specify"}
            </span>
          </Block>

          <Block label="Estimated triage">
            <TriageBadge urgency={parsed.urgency} />
          </Block>

          <Block label="Key conditions">
            <div className="flex flex-wrap gap-1.5">
              {parsed.conditions.length === 0 && (
                <span className="text-sm text-slate-400">None detected</span>
              )}
              {parsed.conditions.map((c) => (
                <Pill key={c} tone="blue">{conditionLabel(c)}</Pill>
              ))}
            </div>
          </Block>

          <Block label="Red flags / alarm features">
            <div className="flex flex-wrap gap-1.5">
              {parsed.red_flags.length === 0 && (
                <span className="text-sm text-slate-400">None</span>
              )}
              {parsed.red_flags.map((r) => (
                <Pill key={r} tone="red">⚑ {r.replace(/_/g, " ")}</Pill>
              ))}
            </div>
          </Block>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Supporting data the receiving clinic will expect
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsed.required_form_data.length === 0 && (
              <span className="text-sm text-amber-700/70">No specific items flagged</span>
            )}
            {parsed.required_form_data.map((d) => (
              <span key={d} className="pill bg-white text-amber-800">{d}</span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button className="btn-ghost" onClick={onBack}>← Edit intake</button>
          <button className="btn-primary" onClick={onRank}>Rank specialists →</button>
        </div>
      </div>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function TriageBadge({ urgency }) {
  const map = {
    urgent: ["red", "Urgent"],
    semi_urgent: ["amber", "Semi-urgent"],
    routine: ["green", "Routine"],
  };
  const [tone, label] = map[urgency] || ["slate", urgency];
  return <Pill tone={tone}>{label}</Pill>;
}
