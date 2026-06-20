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

  // Toronto FSAs (M-series)
  M5V: { label: "Downtown Toronto / Entertainment", lat: 43.6426, lng: -79.3871 },
  M5H: { label: "Financial District", lat: 43.6481, lng: -79.3795 },
  M5G: { label: "Discovery District / UHN", lat: 43.6572, lng: -79.3877 },
  M4Y: { label: "Church-Wellesley / Yonge", lat: 43.6677, lng: -79.3841 },
  M6G: { label: "Annex / Harbord Village", lat: 43.6630, lng: -79.4141 },
  M4N: { label: "Lawrence Park / Leaside", lat: 43.7247, lng: -79.3924 },
  M5P: { label: "Forest Hill", lat: 43.6947, lng: -79.4127 },
  M4C: { label: "East York / Danforth", lat: 43.6924, lng: -79.3185 },
  M1P: { label: "Scarborough / Midland", lat: 43.7640, lng: -79.2428 },
  M3B: { label: "North York / Bayview", lat: 43.7496, lng: -79.3618 },
  M2N: { label: "Willowdale / North York", lat: 43.7618, lng: -79.4113 },
  M9A: { label: "Etobicoke / Islington", lat: 43.6447, lng: -79.5300 },
  M6R: { label: "Parkdale / Roncesvalles", lat: 43.6449, lng: -79.4431 },
  M8V: { label: "Etobicoke South / Mimico", lat: 43.6056, lng: -79.5019 },
  M6H: { label: "Dufferin Grove / Dovercourt", lat: 43.6572, lng: -79.4388 },
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
