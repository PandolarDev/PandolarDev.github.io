'use strict';

/**
 * Jemena — north-west Melbourne electricity distributor
 * Outage page: https://www.jemena.com.au/outages/electricity-outages/
 *
 * Jemena's electricity outage page loads outage data via an underlying API or
 * ArcGIS FeatureServer. Their site is a CMS-backed page (likely Umbraco/Sitefinity)
 * with an embedded interactive map.
 *
 * Endpoint discovery: open DevTools Network tab on the electricity-outages page
 * and filter for XHR/Fetch requests returning JSON outage data. Look for calls
 * to /api/outages, /umbraco/api/outages, or an Esri FeatureServer URL.
 * Update API_UNPLANNED / API_PLANNED (or ARCGIS_BASE) once identified.
 *
 * The implementation below tries a custom REST endpoint first, then falls back
 * to an ArcGIS FeatureServer pattern consistent with other Victorian distributors.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'jemena';
const NAME       = 'Jemena';
const SOURCE_URL = 'https://www.jemena.com.au/outages/electricity-outages/';

// Custom REST endpoints (CMS-backed) — update after network inspection
const API_UNPLANNED = 'https://www.jemena.com.au/api/outages/current';
const API_PLANNED   = 'https://www.jemena.com.au/api/outages/planned';

// ArcGIS fallback — used if the REST endpoints above return non-JSON
const ARCGIS_BASE     = 'https://services.arcgis.com/jemena/arcgis/rest/services/Outages_Public/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class JemenaScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    // Try the CMS REST API first; fall back to ArcGIS if it fails
    const [unplanned, planned] = await Promise.all([
      this._fetchUnplanned(),
      this._fetchPlanned(),
    ]);

    return [
      ...unplanned.map((i) => this._normalise(i, 'unplanned')),
      ...planned.map((i)   => this._normalise(i, 'planned')),
    ];
  }

  async _fetchUnplanned() {
    try {
      const data = await this.get(API_UNPLANNED, { headers: { Referer: SOURCE_URL } });
      const items = Array.isArray(data) ? data : (data.outages || data.data || []);
      if (items.length > 0) return items;
    } catch (_) { /* fall through to ArcGIS */ }

    const features = await this.arcgisQuery(LAYER_UNPLANNED).catch(() => []);
    return features.map((f) => ({ _arcgis: true, ...f.attributes, _geometry: f.geometry }));
  }

  async _fetchPlanned() {
    try {
      const data = await this.get(API_PLANNED, { headers: { Referer: SOURCE_URL } });
      const items = Array.isArray(data) ? data : (data.outages || data.data || []);
      if (items.length > 0) return items;
    } catch (_) { /* fall through to ArcGIS */ }

    const features = await this.arcgisQuery(LAYER_PLANNED).catch(() => []);
    return features.map((f) => ({ _arcgis: true, ...f.attributes, _geometry: f.geometry }));
  }

  _normalise(item, type) {
    // Handle both flat ArcGIS-merged objects and REST JSON objects
    const g = item._geometry || {};
    return {
      id:                   makeId(PROVIDER, item.id || item.outageId || item.OBJECTID || item.OUTAGE_ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(item),
      status:               item.status || item.Status || item.STATUS || null,
      state:                'VIC',
      suburb:               item.suburb || item.Suburb || item.SUBURB || item.location || item.Location || null,
      postcode:             String(item.postcode || item.Postcode || item.POSTCODE || '').trim() || null,
      lat:                  parseFloat(item.latitude  || item.lat  || item.Latitude)  || g.y || null,
      lng:                  parseFloat(item.longitude || item.lng  || item.Longitude) || g.x || null,
      customersAffected:    toInt(item.customersAffected || item.CustomersAffected || item.CUSTOMERS_AFFECTED || item.customers),
      cause:                item.cause || item.Cause || item.CAUSE || null,
      startedAt:            toISO(item.startTime || item.StartTime || item.START_TIME || item.startedAt),
      estimatedRestoration: toISO(item.etr || item.ETR || item.estimatedRestoration || item.ESTIMATED_RESTORE_TIME),
      lastUpdated:          toISO(item.lastUpdated || item.LastUpdated || item.LAST_UPDATED) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function deriveType(item) {
  const raw = String(item.type || item.Type || item.outageType || item.OUTAGE_TYPE || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('scheduled')) return 'planned';
  return 'unplanned';
}

module.exports = new JemenaScraper();
