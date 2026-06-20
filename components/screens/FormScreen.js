"use client";

import { useMemo, useState } from "react";
import { Pill } from "../ui";
import { fillForm } from "@/lib/engine/formFiller.js";

// Synthetic values used by the "pull from EMR" one-click gap fill.
const EMR_SUGGESTIONS = {
  relevant_labs: "Ferritin 8 µg/L (low); CBC: Hgb 96 g/L, MCV 74 fL; FIT positive",
  safety_screen: "No pacemaker or metallic implants; eGFR 88; no claustrophobia",
  photo_attached: "yes",
  prior_endoscopy: "No prior gastroscopy or colonoscopy on record",
  medications: "See reconciled medication list (synthetic)",
  visual_acuity: "OD 20/60, OS 20/80",
  symptom_duration: "Gradual decline over ~8 months",
};

export default function FormScreen({ selected, parsed, patient, onBack, onApprove }) {
  const result = useMemo(
    () =>
      fillForm(selected.provider.required_form_id, {
        parsed,
        patient,
        emr: patient.emrAttached ? patient.emr || {} : {},
      }),
    [selected, parsed, patient]
  );

  const [values, setValues] = useState(() => ({ ...result.filled }));
  const [autoKeys, setAutoKeys] = useState(() => new Set(result.autoFilledKeys));

  if (!result) return null;
  const { form, gapNarrative } = result;

  const missing = form.fields.filter(
    (f) => f.required && isEmpty(values[f.key])
  );

  const setVal = (key, v, fromEmr = false) => {
    setValues((s) => ({ ...s, [key]: v }));
    if (fromEmr) setAutoKeys((s) => new Set(s).add(key));
  };

  const pullFromEmr = (key) => {
    const v = EMR_SUGGESTIONS[key];
    if (v !== undefined) setVal(key, v, true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
          <Pill tone="blue">{form.specialty}</Pill>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Routing to <span className="font-semibold text-slate-700">{selected.provider.name}</span>.
          Auto-filled fields are highlighted; resolve any gaps before approval.
        </p>

        {gapNarrative && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-semibold">Missing-information check: </span>
            {gapNarrative}
          </div>
        )}

        <div className="space-y-4">
          {form.fields.map((f) => {
            const empty = isEmpty(values[f.key]);
            const auto = autoKeys.has(f.key) && !empty;
            const isGap = f.required && empty;
            const canPull = EMR_SUGGESTIONS[f.key] !== undefined;
            return (
              <div
                key={f.key}
                className={`rounded-xl border p-3 ${
                  isGap
                    ? "border-rose-200 bg-rose-50/50"
                    : auto
                    ? "border-teal-200 bg-teal-50/40"
                    : "border-slate-200"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    {f.label}
                    {f.required && <span className="ml-1 text-rose-500">*</span>}
                  </label>
                  {auto && <Pill tone="teal">auto-filled</Pill>}
                  {isGap && <Pill tone="red">required · missing</Pill>}
                </div>

                <FieldInput
                  field={f}
                  value={values[f.key]}
                  onChange={(v) => setVal(f.key, v)}
                />

                {isGap && canPull && (
                  <button
                    onClick={() => pullFromEmr(f.key)}
                    className="mt-2 text-xs font-semibold text-compass-600 hover:text-compass-700"
                  >
                    + Add {f.label.toLowerCase()} from EMR
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button className="btn-ghost" onClick={onBack}>← Back to ranking</button>
          <div className="flex items-center gap-3">
            {missing.length > 0 && (
              <span className="text-xs text-rose-500">
                {missing.length} required field{missing.length > 1 ? "s" : ""} missing
              </span>
            )}
            <button
              className="btn-primary"
              disabled={missing.length > 0}
              onClick={() => onApprove(values)}
            >
              Approve & send →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <textarea
        className="input min-h-[64px] resize-y"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select className="input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === "tags") {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <input
        className="input"
        value={arr.join(", ")}
        placeholder="comma-separated"
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      />
    );
  }
  return (
    <input className="input" value={value || ""} onChange={(e) => onChange(e.target.value)} />
  );
}
