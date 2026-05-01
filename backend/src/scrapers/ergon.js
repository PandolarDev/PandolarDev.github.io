'use strict';

/**
 * Ergon Energy — regional/rural Queensland electricity distributor
 * Outage page: https://www.ergon.com.au/network/outages/outage-finder/outage-finder-map/
 *
 * Ergon and Energex are both subsidiaries of Energy Queensland and share the
 * same ArcGIS GIS infrastructure. Ergon's FeatureServer exposes outages for
 * regional/rural QLD (everything outside SEQ).
 *
 * Endpoint discovery: network-inspect the Ergon outage map page. The ArcGIS
 * service path mirrors Energex with "Ergon" in the service name.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'ergon';
const NAME       = 'Ergon Energy';
const SOURCE_URL = 'https://www.ergon.com.au/network/outages/outage-finder/outage-finder-map/';

const ARCGIS_BASE     = 'https://www.ergon.com.au/server/rest/services/Prod/Outages/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class ErgonScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const [unplanned, planned] = await Promise.all([
      this.arcgisQuery(LAYER_UNPLANNED).catch(() => []),
      this.arcgisQuery(LAYER_PLANNED).catch(() => []),
    ]);

    return [
      ...unplanned.map((f) => this._normalise(f, 'unplanned')),
      ...planned.map((f) => this._normalise(f, 'planned')),
    ];
  }

  _normalise(feature, type) {
    const a = feature.attributes || {};
    const g = feature.geometry   || {};
    return {
      id:                   makeId(PROVIDER, a.OBJECTID || a.OutageId || a.INTERRUPTION_ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(a),
      status:               a.Status || a.CREW_STATUS || null,
      state:                'QLD',
      suburb:               a.Suburb || a.SUBURB || a.LOCALITY || null,
      postcode:             String(a.Postcode || a.POSTCODE || '').trim() || null,
      lat:                  g.y  || null,
      lng:                  g.x  || null,
      customersAffected:    toInt(a.CustomersAffected || a.CUSTOMERS_AFFECTED || a.NUM_CUSTOMERS),
      cause:                a.Cause || a.FAULT_CAUSE || null,
      startedAt:            toISO(a.StartTime || a.INTERRUPTION_START || a.START_DATETIME),
      estimatedRestoration: toISO(a.ETR || a.ESTIMATED_RESTORE_TIME || a.EXPECTED_RESTORE_TIME),
      lastUpdated:          toISO(a.LastUpdated || a.LAST_UPDATE) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 feature,
    };
  }
}

function deriveType(a) {
  const raw = String(a.OutageType || a.INTERRUPTION_TYPE || a.Type || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('scheduled')) return 'planned';
  return 'unplanned';
}

module.exports = new ErgonScraper();
