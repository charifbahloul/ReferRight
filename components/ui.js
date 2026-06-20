"use client";

// Small shared presentational components used across screens.

export function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-compass-600 text-white shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polygon points="16 8 11 11 8 16 13 13 16 8" fill="white" stroke="white" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="font-bold text-slate-900">Referral Compass</div>
        <div className="text-[11px] text-slate-500">AI referral co-pilot · synthetic demo</div>
      </div>
    </div>
  );
}

export function Stepper({ current, steps }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
      {steps.map((s, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                active
                  ? "bg-compass-600 text-white"
                  : done
                  ? "bg-teal-500 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={active ? "text-slate-900" : "text-slate-400"}>{s}</span>
            {n < steps.length && <span className="mx-1 text-slate-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function ScoreBar({ value, label, tone = "compass" }) {
  const pct = Math.round((value || 0) * 100);
  const color =
    tone === "teal" ? "bg-teal-500" : tone === "amber" ? "bg-amber-500" : "bg-compass-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className={`bar-fill h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-compass-100 text-compass-700",
    teal: "bg-teal-50 text-teal-600",
  };
  return <span className={`pill ${tones[tone] || tones.slate}`}>{children}</span>;
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
