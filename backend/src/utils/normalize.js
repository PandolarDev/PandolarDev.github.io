'use strict';

/**
 * Canonical outage object shape used across all scrapers:
 * {
 *   id: string           — "<provider>-<providerOwnId>"
 *   provider: string     — slug, e.g. "ausgrid"
 *   providerName: string — human label
 *   type: "unplanned" | "planned" | "restored"
 *   status: string       — free-text status from provider
 *   state: string        — "NSW" | "QLD" | "VIC" | "WA" | "SA"
 *   suburb: string
 *   postcode: string | null
 *   lat: number | null
 *   lng: number | null
 *   customersAffected: number
 *   cause: string | null
 *   startedAt: string    — ISO 8601
 *   estimatedRestoration: string | null — ISO 8601
 *   lastUpdated: string  — ISO 8601
 *   sourceUrl: string    — deep-link back to provider page
 * }
 */

const PROVIDER_META = {
  ausgrid: { name: 'Ausgrid', state: 'NSW' },
  essential_energy: { name: 'Essential Energy', state: 'NSW' },
  energex: { name: 'Energex', state: 'QLD' },
  ergon: { name: 'Ergon Energy', state: 'QLD' },
  powercor: { name: 'Powercor', state: 'VIC' },
  ausnet: { name: 'AusNet Services', state: 'VIC' },
  western_power: { name: 'Western Power', state: 'WA' },
  sa_power_networks: { name: 'SA Power Networks', state: 'SA' },
};

function providerMeta(slug) {
  return PROVIDER_META[slug] || { name: slug, state: null };
}

/**
 * Coerce a value to a finite number; return 0 if it cannot be parsed.
 */
function toInt(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Attempt to parse a date string/timestamp into an ISO 8601 string.
 * Returns null if unparseable.
 */
function toISO(val) {
  if (!val) return null;
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Build a canonical outage ID from provider slug + provider's own identifier.
 */
function makeId(provider, rawId) {
  return `${provider}-${String(rawId).replace(/\s+/g, '_')}`;
}

module.exports = { providerMeta, toInt, toISO, makeId, PROVIDER_META };
