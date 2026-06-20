"use client";

import { useEffect, useRef, useState } from "react";

// Voice-first dictation using the browser Web Speech API where available.
// Falls back gracefully (button hidden) when unsupported.

export default function MicButton({ onResult, onInterim }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      if (interim && onInterim) onInterim(interim);
      if (finalText && onResult) onResult(finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {}
    }
  };

  if (!supported) {
    return (
      <span className="text-xs text-slate-400">
        🎙️ Voice input needs Chrome/Edge — type the referral reason instead.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn ${
        listening
          ? "bg-rose-600 text-white hover:bg-rose-700"
          : "border border-compass-200 bg-compass-50 text-compass-700 hover:bg-compass-100"
      }`}
    >
      <span className={`relative grid h-4 w-4 place-items-center`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
        </svg>
        {listening && (
          <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-white" />
        )}
      </span>
      {listening ? "Listening… tap to stop" : "Dictate referral reason"}
    </button>
  );
}
