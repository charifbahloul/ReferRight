"use client";

import { useState } from "react";
import MicButton from "../MicButton";
import { Field, Pill } from "../ui";
import { DEMO_CASES } from "@/lib/data/demoCases.js";
import { PLACES } from "@/lib/data/geo.js";

const ACCESS_OPTIONS = [
  ["wheelchair_access", "Wheelchair access"],
  ["near_transit", "Near transit"],
  ["parking", "Parking"],
  ["virtual_option", "Virtual visit OK"],
];

export default function IntakeScreen({ intake, setIntake, onParse }) {
  const [interim, setInterim] = useState("");

  const update = (patch) => setIntake((s) => ({ ...s, ...patch }));

  const toggleNeed = (key) =>
    update({
      accessibility_needs: intake.accessibility_needs.includes(key)
        ? intake.accessibility_needs.filter((n) => n !== key)
        : [...intake.accessibility_needs, key],
    });

  const loadDemo = (demo) => {
    setInterim("");
    setIntake({
      referral_reason: demo.referral_reason,
      postal_code: demo.postal_code,
      max_travel_km: demo.max_travel_km,
      language_preference: demo.language_preference,
      accessibility_needs: [...demo.accessibility_needs],
      urgency_hint: demo.urgency_hint,
      emr: demo.emr_extract,
      emrAttached: true,
      transcriptAttached: true,
      demoId: demo.id,
    });
  };

  const canParse = intake.referral_reason.trim().length > 8;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Left: the form */}
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New referral</h2>
          <Pill tone="teal">No sign-in · session-only</Pill>
        </div>

        <Field
          label="Referral reason"
          hint="Say it out loud or type it. One or two sentences is enough."
        >
          <textarea
            className="input min-h-[110px] resize-y"
            placeholder="e.g. 54-year-old woman with iron-deficiency anemia, dyspepsia and 10-lb weight loss. Needs GI."
            value={intake.referral_reason + (interim ? " " + interim : "")}
            onChange={(e) => {
              setInterim("");
              update({ referral_reason: e.target.value });
            }}
          />
          <div className="mt-2">
            <MicButton
              onInterim={setInterim}
              onResult={(text) => {
                setInterim("");
                update({
                  referral_reason: (intake.referral_reason
                    ? intake.referral_reason + " "
                    : "") + text,
                });
              }}
            />
          </div>
        </Field>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Patient location (FSA / postal)">
            <input
              className="input"
              placeholder="K1L"
              value={intake.postal_code}
              onChange={(e) => update({ postal_code: e.target.value })}
              list="fsa-list"
            />
            <datalist id="fsa-list">
              {Object.entries(PLACES).map(([fsa, p]) => (
                <option key={fsa} value={fsa}>{p.label}</option>
              ))}
            </datalist>
          </Field>

          <Field label={`Max travel distance — ${intake.max_travel_km} km`}>
            <input
              type="range"
              min="2"
              max="40"
              step="1"
              value={intake.max_travel_km}
              onChange={(e) => update({ max_travel_km: Number(e.target.value) })}
              className="w-full accent-compass-600"
            />
          </Field>

          <Field label="Language preference">
            <select
              className="input"
              value={intake.language_preference}
              onChange={(e) => update({ language_preference: e.target.value })}
            >
              <option>English</option>
              <option>French</option>
              <option>No preference</option>
            </select>
          </Field>

          <Field label="Urgency hint (optional)">
            <select
              className="input"
              value={intake.urgency_hint}
              onChange={(e) => update({ urgency_hint: e.target.value })}
            >
              <option value="">Let AI estimate</option>
              <option value="routine">Routine</option>
              <option value="semi_urgent">Semi-urgent</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>

        <Field label="Accessibility / language needs" >
          <div className="flex flex-wrap gap-2">
            {ACCESS_OPTIONS.map(([key, label]) => {
              const on = intake.accessibility_needs.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNeed(key)}
                  className={`pill border transition ${
                    on
                      ? "border-compass-300 bg-compass-50 text-compass-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {on ? "✓ " : "+ "}
                  {label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <UploadToggle
            on={intake.transcriptAttached}
            label="Scribe transcript"
            onClick={() => update({ transcriptAttached: !intake.transcriptAttached })}
          />
          <UploadToggle
            on={intake.emrAttached}
            label="EMR extract"
            onClick={() => update({ emrAttached: !intake.emrAttached })}
          />
          <span className="text-xs text-slate-400">
            Optional · synthetic sources, used only to auto-fill the form
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            🔒 Synthetic data only. Nothing is stored.
          </p>
          <button className="btn-primary" disabled={!canParse} onClick={onParse}>
            Analyze referral →
          </button>
        </div>
      </div>

      {/* Right: demo loader */}
      <div className="card h-fit p-6">
        <h3 className="text-sm font-bold text-slate-900">Load a demo case</h3>
        <p className="mt-1 text-xs text-slate-500">
          Pre-fills dictation, patient context and a synthetic EMR extract.
        </p>
        <div className="mt-4 space-y-3">
          {DEMO_CASES.map((d) => (
            <button
              key={d.id}
              onClick={() => loadDemo(d)}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-compass-300 hover:bg-compass-50/40 ${
                intake.demoId === d.id ? "border-compass-300 bg-compass-50/60" : "border-slate-200"
              }`}
            >
              <div className="text-sm font-semibold text-slate-900">{d.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{d.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadToggle({ on, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill border ${
        on ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      📎 {label}: {on ? "attached" : "off"}
    </button>
  );
}
