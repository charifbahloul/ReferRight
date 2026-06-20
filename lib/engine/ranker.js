// Specialist ranking engine (AI Flow Step 4).
//
// Implements the PRD's *staged* decision process rather than a single weighted
// formula:
//   1. Scope match (required threshold)
//   2. Accessibility & patient constraints (required thresholds)
//   3. Triage & clinical fit
//   4. Wait-time optimization (primary differentiator)
//   5. Secondary tie-breakers (distance, acceptance, physician preference)
//
// Every provider carries a transparent explanation + trade-off list.

import { SPECIALISTS, conditionLabel } from "../data/specialists.js";
import { resolvePlace, distanceKm } from "../data/geo.js";

const ACCESS_LABELS = {
  wheelchair_access: "wheelchair access",
  near_transit: "transit access",
  parking: "parking",
  virtual_option: "virtual visits",
};

function scopeMatch(parsed, provider) {
  const conds = parsed.conditions || [];
  if (conds.length === 0) {
    // No specific conditions parsed — fall back to specialty match only.
    return { score: provider.specialty === parsed.specialty_intent ? 0.6 : 0, excludedHits: [], acceptedHits: [] };
  }
  const acceptedHits = conds.filter((c) => provider.accepted_conditions.includes(c));
  const excludedHits = conds.filter((c) => provider.excluded_conditions.includes(c));
  const score = acceptedHits.length / conds.length;
  return { score, excludedHits, acceptedHits };
}

function effectiveWait(provider, parsed, useLearning) {
  const urgent = parsed.urgency === "urgent" || parsed.urgency === "semi_urgent";
  const base = urgent ? provider.urgent_wait_days : provider.average_wait_days;
  if (!useLearning) return base;
  // Learning loop: blend listed wait with community-observed wait.
  const ratio = provider.observed_wait_days / provider.average_wait_days;
  return Math.round(base * ratio);
}

function waitScore(days) {
  // 7 days -> ~1.0, 90 days -> ~0.1
  return Math.max(0.05, Math.min(1, 1 - (days - 7) / 90));
}

export function rankSpecialists(parsed, patient, options = {}) {
  const { useLearning = false, preferenceIds = [] } = options;
  const patientPlace = resolvePlace(patient.postal_code);
  const wantFrench = (patient.language_preference || "").toLowerCase().startsWith("fr");
  const needs = patient.accessibility_needs || [];
  const maxKm = patient.max_travel_km || 9999;

  const candidates = SPECIALISTS
    // Stage 0: only the relevant specialty.
    .filter((p) => !parsed.specialty_intent || p.specialty === parsed.specialty_intent)
    .map((provider) => {
      const explanation = [];
      const tradeoffs = [];
      let excluded = false;
      let exclusionReason = null;

      // ---------- Stage 1: scope match (required threshold) ----------
      const scope = scopeMatch(parsed, provider);
      if (scope.excludedHits.length > 0) {
        excluded = true;
        exclusionReason = `Explicitly excludes ${scope.excludedHits
          .map(conditionLabel)
          .join(", ")}`;
      }
      if (scope.score === 0 && scope.acceptedHits.length === 0) {
        excluded = true;
        exclusionReason = exclusionReason || "Referral reason falls outside this provider's accepted scope";
      }
      if (scope.acceptedHits.length > 0) {
        explanation.push(
          `Accepts ${scope.acceptedHits.map(conditionLabel).join(", ")}`
        );
      }
      const scope_match_score = scope.score;

      // ---------- Stage 2: accessibility & patient constraints ----------
      const dist = distanceKm(patientPlace, resolvePlace(provider.fsa));
      let distance_score = dist == null ? 0.5 : Math.max(0.1, 1 - dist / 40);
      if (dist != null && dist > maxKm) {
        // Beyond patient's stated travel limit — soft exclude unless virtual.
        if (provider.virtual) {
          tradeoffs.push(`${dist} km away but offers virtual visits`);
        } else {
          excluded = true;
          exclusionReason = exclusionReason || `Beyond max travel distance (${dist} km > ${maxKm} km)`;
        }
      }

      // language
      const hasFrench = provider.languages.some((l) => l.toLowerCase() === "french");
      let language_score = 1;
      if (wantFrench) {
        language_score = hasFrench ? 1 : 0.2;
        if (hasFrench) explanation.push("French-speaking provider");
        else tradeoffs.push("No French-speaking service (patient prefers French)");
      }

      // accessibility needs
      let metNeeds = 0;
      const unmet = [];
      for (const n of needs) {
        if (provider.accessibility.includes(n)) metNeeds++;
        else unmet.push(n);
      }
      let accessibility_score = needs.length === 0 ? 1 : metNeeds / needs.length;
      if (needs.length > 0 && metNeeds === needs.length) {
        explanation.push(
          `Meets accessibility needs: ${needs.map((n) => ACCESS_LABELS[n] || n).join(", ")}`
        );
      }
      for (const n of unmet) {
        tradeoffs.push(`Missing ${ACCESS_LABELS[n] || n.replace(/_/g, " ")}`);
      }

      // A mandatory-constraint miss (language or accessibility) deprioritizes
      // but does not hard-exclude — surfaced transparently per PRD.
      const constraintMiss = (wantFrench && !hasFrench) || unmet.length > 0;

      // ---------- Stage 3: triage & clinical fit ----------
      const urgent = parsed.urgency === "urgent" || parsed.urgency === "semi_urgent";
      let triage_fit_score = 0.7;
      if (urgent) {
        // Faster urgent pathways fit better for red-flag referrals.
        triage_fit_score = Math.max(0.4, 1 - provider.urgent_wait_days / 30);
        if (provider.urgent_wait_days <= 14) {
          explanation.push(`Supports ${parsed.urgency.replace("_", "-")} triage (urgent slot ~${provider.urgent_wait_days}d)`);
        }
      } else {
        triage_fit_score = 0.85;
      }

      // ---------- Stage 4: wait-time optimization (primary) ----------
      const wait_days = effectiveWait(provider, parsed, useLearning);
      const wait_score = waitScore(wait_days);

      // ---------- Stage 5: tie-breakers ----------
      const acceptance_score = provider.acceptance_rate;
      const isPreferred = preferenceIds.includes(provider.provider_id);
      const preference_score = isPreferred ? Math.max(provider.usual_referral_score, 0.85) : provider.usual_referral_score;
      if (isPreferred) explanation.push("Your usual referral destination");

      // ---------- Composite overall score (staged weighting) ----------
      // Wait time is the primary differentiator once gates are satisfied.
      let overall =
        0.30 * wait_score +
        0.22 * scope_match_score +
        0.16 * accessibility_score +
        0.12 * language_score +
        0.10 * triage_fit_score +
        0.06 * distance_score +
        0.04 * acceptance_score;
      // small preference nudge
      overall += isPreferred ? 0.03 : 0;
      // constraint misses pull the score down so qualified options surface first
      if (constraintMiss) overall *= 0.78;
      if (excluded) overall *= 0.25;

      const tier = excluded ? "excluded" : constraintMiss ? "consider" : "recommended";

      return {
        provider,
        rank: 0,
        excluded,
        exclusionReason,
        tier,
        distance_km: dist,
        wait_days,
        overall_score: Math.round(Math.min(0.99, overall) * 100) / 100,
        scope_match_score: round2(scope_match_score),
        wait_score: round2(wait_score),
        distance_score: round2(distance_score),
        accessibility_score: round2(accessibility_score),
        language_score: round2(language_score),
        triage_fit_score: round2(triage_fit_score),
        preference_score: round2(preference_score),
        acceptance_score: round2(acceptance_score),
        explanation,
        tradeoffs,
      };
    });

  // Sort: non-excluded first, then by overall score.
  candidates.sort((a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
    return b.overall_score - a.overall_score;
  });
  candidates.forEach((c, i) => (c.rank = i + 1));
  return candidates;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
