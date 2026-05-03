'use strict';

/**
 * Energex — south-east Queensland electricity distributor
 * Outage map: https://www.energex.com.au/outages/outage-finder/outage-finder-map
 *
 * Three GeoJSON FeatureCollection endpoints:
 *   ex-map-current-unplanned — active unplanned outages
 *   ex-map-current-planned   — active planned works
 *   ex-map-future-planned    — upcoming planned works
 *
 * Unplanned geometry: GeometryCollection [Point, Polygon]; use Point for lat/lng.
 * Planned geometry: Point directly.
 *
 * Date format from API: "1:41PM 03 May 2026"
 */

const BaseScraper = require('./base');
const { makeId, toInt } = require('../utils/normalize');

const PROVIDER   = 'energex';
const NAME       = 'Energex';
const SOURCE_URL = 'https://www.energex.com.au/outages/outage-finder/outage-finder-map';

const BASE    = 'https://www.energex.com.au/api/outages-map/filestore-404';
const QS      = 'SQ_SESSION_MODE=read_only_async';
const API_CURRENT_UNPLANNED = `${BASE}/ex-map-current-unplanned/filestore-proxy?${QS}`;
const API_CURRENT_PLANNED   = `${BASE}/ex-map-current-planned/filestore-proxy?${QS}`;
const API_FUTURE_PLANNED    = `${BASE}/ex-map-future-planned/filestore-proxy?${QS}`;

class EnergexScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const headers = { Referer: SOURCE_URL };
    const [unplanned, currentPlanned, futurePlanned] = await Promise.all([
      this.get(API_CURRENT_UNPLANNED, { headers }).catch(() => ({ features: [] })),
      this.get(API_CURRENT_PLANNED,   { headers }).catch(() => ({ features: [] })),
      this.get(API_FUTURE_PLANNED,    { headers }).catch(() => ({ features: [] })),
    ]);

    return [
      ...(unplanned.features    || []).map((f) => this._normalise(f, 'unplanned')),
      ...(currentPlanned.features || []).map((f) => this._normalise(f, 'planned')),
      ...(futurePlanned.features  || []).map((f) => this._normalise(f, 'planned')),
    ];
  }

  _normalise(feature, type) {
    const p = feature.properties || {};
    const [lng, lat] = extractPoint(feature.geometry);

    return {
      id:                   makeId(PROVIDER, p.EVENT_ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 deriveType(p, type),
      status:               p.STATUS || null,
      state:                'QLD',
      suburb:               p.SUBURBS || null,
      postcode:             null,
      lat:                  lat,
      lng:                  lng,
      customersAffected:    toInt(p.CUSTOMERS_AFFECTED),
      cause:                p.REASON || null,
      startedAt:            parseEnergexDate(p.START),
      estimatedRestoration: parseEnergexDate(p.EST_FIX_TIME),
      lastUpdated:          new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 feature,
    };
  }
}

function extractPoint(geometry) {
  if (!geometry) return [null, null];
  if (geometry.type === 'Point') {
    return geometry.coordinates || [null, null];
  }
  if (geometry.type === 'GeometryCollection') {
    const point = (geometry.geometries || []).find((g) => g.type === 'Point');
    return point ? (point.coordinates || [null, null]) : [null, null];
  }
  return [null, null];
}

function deriveType(props, fallback) {
  const status = String(props.STATUS || '').toLowerCase();
  if (status === 'restored' || status.includes('restor')) return 'restored';
  const t = String(props.TYPE || '').toLowerCase();
  if (t === 'planned') return 'planned';
  if (t === 'unplanned') return 'unplanned';
  return fallback;
}

// Parses "1:41PM 03 May 2026" → ISO string
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
function parseEnergexDate(str) {
  if (!str) return null;
  // e.g. "1:41PM 03 May 2026"
  const m = str.match(/(\d+):(\d+)(AM|PM)\s+(\d+)\s+(\w+)\s+(\d+)/i);
  if (!m) return null;
  let [, hh, mm, ampm, dd, mon, yyyy] = m;
  let h = parseInt(hh, 10);
  if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  const monthIdx = MONTHS[mon.toLowerCase().slice(0, 3)];
  if (monthIdx === undefined) return null;
  const d = new Date(Date.UTC(parseInt(yyyy, 10), monthIdx, parseInt(dd, 10), h, parseInt(mm, 10)));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = new EnergexScraper();
