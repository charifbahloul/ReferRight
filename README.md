# Referral Compass

AI referral co-pilot for primary care. From 30–60 seconds of dictation to a ranked
referral destination and a filled, review-ready form.

> Hackathon MVP. **Synthetic data only — not for clinical use.** Human-in-the-loop,
> explainable, no autonomous submission.

## What it does

1. **Voice-first intake** — dictate the referral reason; add patient location, travel
   limit, language and accessibility needs. Optional synthetic transcript / EMR extract.
2. **AI clinical parse** — extracts suspected specialty, conditions, red flags, an
   estimated triage level, and the supporting data the receiving clinic will expect.
   It reads clinical *intent*; it does not diagnose.
3. **Staged ranking** — scope match → accessibility & patient constraints → triage fit →
   **wait time (primary)** → tie-breakers. Every card shows transparent reasons and
   trade-offs; out-of-scope providers are filtered with a stated reason.
4. **Form auto-fill + gap check** — generates a synthetic Ocean-style referral form,
   highlights auto-filled fields, flags missing required fields, and offers one-click
   "pull from EMR" gap fill.
5. **Send cascade + learning loop** — sends to the top specialist, auto-falls back on
   decline, and captures opt-in, non-identifiable outcome feedback. A toggle shows how
   community-learned wait times re-rank the same list ("before vs after learning").

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Demo cases (load from the intake screen)

- **The almost-failed GI referral** — anemia + weight loss are recognized as alarm
  features needing a malignancy work-up, so a clinic that excludes that scope is filtered
  out and a French-speaking, wheelchair-accessible GI clinic is recommended.
- **Patient-centred routing** — a slightly farther French + transit-accessible eye clinic
  outranks the closer one the patient can't actually get to.
- **The changing mole** — scope matching routes an urgent lesion to the clinic that takes
  melanoma work-ups instead of a routine derm clinic.
- **The MRI request** — routes to a centre that performs the study and flags the missing
  safety screen.

## Architecture

- **Next.js (App Router) + Tailwind** — single app, all client-side, no external services.
- **`lib/data/`** — synthetic specialist directory, Ocean-style form templates, Ottawa
  geography, demo cases.
- **`lib/engine/`** — `parser` (intent extraction), `ranker` (staged decision engine),
  `formFiller` (auto-fill + missing-field detection). Each module's interface matches what
  an LLM call would return, so a real model / Supabase backend can be swapped in without
  touching the UI.
- **`components/screens/`** — the five-screen referral wizard.

The deterministic engine means the demo runs offline with no API keys.  