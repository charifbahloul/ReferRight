// Synthetic Ottawa-area geography. Maps FSA / neighbourhood to coordinates.
// Used for travel-distance estimates only. No real patient data.

export const PLACES = {
  // FSA prefix -> { label, lat, lng }
  K1N: { label: "Lowertown / ByWard", lat: 45.4316, lng: -75.6885 },
  K1L: { label: "Vanier", lat: 45.4389, lng: -75.6632 },
  K1K: { label: "Vanier North / Overbrook", lat: 45.4452, lng: -75.6521 },
  K1C: { label: "Orléans", lat: 45.4684, lng: -75.5071 },
  K4A: { label: "Orléans East", lat: 45.4795, lng: -75.4799 },
  K2P: { label: "Centretown", lat: 45.4156, lng: -75.6964 },
  K1Y: { label: "Hintonburg", lat: 45.4012, lng: -75.7269 },
  K1H: { label: "Alta Vista", lat: 45.3884, lng: -75.6529 },
  K1G: { label: "Riverview / Hawthorne", lat: 45.4007, lng: -75.6253 },
  K2H: { label: "Nepean / Bells Corners", lat: 45.3318, lng: -75.8126 },
  K2G: { label: "Nepean Centre", lat: 45.3478, lng: -75.7449 },
  K1V: { label: "Hunt Club / South Keys", lat: 45.3618, lng: -75.6648 },
  K1T: { label: "Greenboro / Leitrim", lat: 45.3457, lng: -75.6235 },
  K2C: { label: "Carlington", lat: 45.3737, lng: -75.7283 },
  K1Z: { label: "Westboro", lat: 45.3852, lng: -75.7588 },
};

// Default centre (Ottawa downtown) used when an FSA is unknown.
const DEFAULT = { label: "Ottawa", lat: 45.4215, lng: -75.6972 };

export function resolvePlace(postal) {
  if (!postal) return DEFAULT;
  const fsa = postal.toUpperCase().replace(/\s+/g, "").slice(0, 3);
  return PLACES[fsa] || DEFAULT;
}

// Haversine distance in km.
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
