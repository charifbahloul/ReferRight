"use client";

import { useEffect, useState } from "react";

// Small shared presentational components used across screens.

// Professional, restrained confetti burst. Muted brand palette, fades out.
const CONFETTI_COLORS = ["#4f46e5", "#0d9488", "#0ea5e9", "#10b981", "#f59e0b", "#94a3b8"];

export function Confetti({ count = 90, duration = 2600 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const arr = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      fall: 1.4 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 60,
      rot: Math.random() * 360,
      w: 6 + Math.random() * 5,
      h: 9 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: Math.random() > 0.7,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(t);
  }, [count, duration]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.h}px`,
            background: p.color,
            borderRadius: p.round ? "50%" : "1px",
            "--drift": `${p.drift}px`,
            "--rot": `${p.rot}deg`,
            animationDuration: `${p.fall}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Full-card "analyzing" loader used between staged AI steps.
export function LoadingScreen({ title, steps = [] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const each = 1100;
    const id = setInterval(
      () => setActive((a) => (a < steps.length - 1 ? a + 1 : a)),
      each
    );
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="mx-auto max-w-md">
      <div className="card flex flex-col items-center gap-5 p-10 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-compass-600" />
        <div>
          <div className="text-base font-bold text-slate-900">{title}</div>
          {steps.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-left text-sm">
              {steps.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 transition ${
                    i < active
                      ? "text-emerald-600"
                      : i === active
                      ? "text-slate-900"
                      : "text-slate-300"
                  }`}
                >
                  <span className="w-4 text-center">
                    {i < active ? "✓" : i === active ? "•" : "○"}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

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
        <div className="text-[11px] text-slate-500">AI referral co-pilot</div>
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
