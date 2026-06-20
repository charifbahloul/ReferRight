/**
 * lib/api.js — backend bridge.
 * Only two calls are wired for now (Option B):
 *   - submitReferral: persists accepted referral to DB
 *   - logOutcome:     feeds the rejection/learning loop
 *
 * BASE_URL reads from NEXT_PUBLIC_API_URL in .env.local.
 * Falls back to localhost:5000 for dev.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "http://localhost:5000" : "");

async function _post(path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    // Backend is optional — never crash the UI if it's unreachable
    console.warn(`[api] ${path} failed (backend may be offline):`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Persist an accepted referral to the backend DB.
 *
 * @param {object} provider   - selected.provider from ReferralWizard
 * @param {object} formValues - approved form values from FormScreen
 * @param {object} parsed     - parseReferral() output (specialty, conditions, urgency)
 */
export async function submitReferral(provider, formValues, parsed) {
  return _post("/submit-referral", {
    specialist_id: null,           // frontend uses string IDs — backend logs by name
    patient_id: null,
    from_provider_id: null,
    form_data: {
      provider_name: provider.name,
      provider_id: provider.provider_id,
      specialty: provider.specialty,
      urgency: parsed?.urgency,
      conditions: parsed?.conditions,
      ...formValues,
    },
  });
}

/**
 * Log a referral outcome to feed the rejection learning loop.
 * Fire-and-forget — UI doesn't wait on this.
 *
 * @param {object} provider     - selected.provider
 * @param {string} outcome      - "accepted"|"rejected"|"redirected"|"wrong_scope"|"too_long_wait"
 * @param {boolean} optIn       - physician opted in to community learning
 * @param {string} failReason   - optional free-text reason
 * @param {string} referralId   - referral_id string from submitReferral response
 */
export async function logOutcome(provider, outcome, optIn, failReason = "", referralId = null) {
  return _post("/log-outcome", {
    provider_id: provider.provider_id,
    provider_name: provider.name,
    specialty: provider.specialty,
    outcome,
    fail_reason: failReason,
    opt_in: optIn,
    referral_id: referralId,
  });
}
