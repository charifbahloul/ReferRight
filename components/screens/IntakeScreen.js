"use client";

import { useRef, useState } from "react";
import MicButton from "../MicButton";
import { Field } from "../ui";
import { DEMO_CASES } from "@/lib/data/demoCases.js";
import { PLACES } from "@/lib/data/geo.js";

const ACCESS_OPTIONS = [
  ["wheelchair_access", "Wheelchair access"],
  ["near_transit", "Near transit"],
  ["virtual_option", "Virtual visit OK"],
  ["accessible_washroom", "Accessible washroom"],
  ["asl_interpreter", "ASL / interpreter"],
];

const LANG_CHOICES = ["English", "French", "No preference", "Other"];

export default function IntakeScreen({ intake, setIntake, onParse }) {
  const [interim, setInterim] = useState("");

  const update = (patch) => setIntake((s) => ({ ...s, ...patch }));

  const toggleNeed = (key) =>
    update({
      accessibility_needs: intake.accessibility_needs.includes(key)
        ? intake.accessibility_needs.filter((n) => n !== key)
        : [...intake.accessibility_needs, key],
    });

  const onLangChoice = (val) => {
    if (val === "Other") update({ language_choice: "Other", language_preference: "" });
    else update({ language_choice: val, language_preference: val });
  };

  const loadDemo = (demo) => {
    setInterim("");
    const known = LANG_CHOICES.includes(demo.language_preference);
    setIntake({
      referral_reason: demo.referral_reason,
      postal_code: demo.postal_code,
      language_choice: known ? demo.language_preference : "Other",
      language_preference: demo.language_preference,
      accessibility_needs: [...demo.accessibility_needs],
      emr: demo.emr_extract,
      emrAttached: true,
      emrName: "emr_extract.json (demo)",
      transcriptAttached: true,
      transcriptName: "scribe_transcript.txt (demo)",
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

        {/* One row of fields under the referral reason. */}
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

          <Field label="Language preference">
            <select
              className="input"
              value={intake.language_choice}
              onChange={(e) => onLangChoice(e.target.value)}
            >
              {LANG_CHOICES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {intake.language_choice === "Other" && (
              <input
                className="input mt-2"
                placeholder="Type the language (e.g. Arabic, Punjabi, Mandarin)"
                value={intake.language_preference}
                onChange={(e) => update({ language_preference: e.target.value })}
              />
            )}
          </Field>
        </div>

        <Field label="Accessibility">
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <FileDrop
            label="Scribe transcript"
            attached={intake.transcriptAttached}
            name={intake.transcriptName}
            onFile={(name) => update({ transcriptAttached: true, transcriptName: name })}
            onSimulate={() =>
              update({
                transcriptAttached: !intake.transcriptAttached,
                transcriptName: !intake.transcriptAttached ? "scribe_transcript.txt (simulated)" : "",
              })
            }
            onClear={() => update({ transcriptAttached: false, transcriptName: "" })}
          />
          <FileDrop
            label="EMR extract"
            attached={intake.emrAttached}
            name={intake.emrName}
            onFile={(name) => update({ emrAttached: true, emrName: name })}
            onSimulate={() =>
              update({
                emrAttached: !intake.emrAttached,
                emrName: !intake.emrAttached ? "emr_extract.json (simulated)" : "",
              })
            }
            onClear={() => update({ emrAttached: false, emrName: "" })}
          />
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button className="btn-primary" disabled={!canParse} onClick={onParse}>
            Analyze referral →
          </button>
        </div>
      </div>

      {/* Right: demo loader */}
      <div className="card h-fit p-6">
        <h3 className="text-sm font-bold text-slate-900">Load a demo case</h3>
        <p className="mt-1 text-xs text-slate-500">
          Pre-fills dictation, patient context and an EMR extract.
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

// Real drag-and-drop dropzone with a "simulate attach" fallback.
function FileDrop({ label, attached, name, onFile, onSimulate, onClear }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0].name);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border border-dashed p-3 text-center transition ${
        over
          ? "border-compass-400 bg-compass-50"
          : attached
          ? "border-teal-300 bg-teal-50/50"
          : "border-slate-300 bg-slate-50 hover:border-compass-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-sm font-semibold text-slate-700">📎 {label}</div>
      {attached ? (
        <div className="mt-1 text-xs text-teal-700">
          ✓ {name || "attached"}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="ml-2 text-slate-400 underline hover:text-slate-600"
          >
            remove
          </button>
        </div>
      ) : (
        <div className="mt-1 text-xs text-slate-400">
          Drag &amp; drop a file, or click to browse
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSimulate();
            }}
            className="ml-2 font-semibold text-compass-600 underline hover:text-compass-700"
          >
            simulate
          </button>
        </div>
      )}
    </div>
  );
}
