'use strict';

/**
 * United Energy — south-east Melbourne & Mornington Peninsula electricity distributor
 * Outage page: https://www.unitedenergy.com.au/outage-map/
 *
 * United Energy's outage map is a JavaScript SPA that fetches outage data from
 * an ArcGIS FeatureServer. The service is hosted on their own ArcGIS portal or
 * a shared Esri cloud instance.
 *
 * Endpoint discovery: open DevTools Network tab on the outage-map page and filter
 * for XHR/Fetch calls to a FeatureServer /query URL. Update ARCGIS_BASE if the
 * service path changes.
 *
 * Layer 0 = unplanned/current faults, Layer 1 = planned interruptions.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'united_energy';
const NAME       = 'United Energy';
const SOURCE_URL = 'https://www.unitedenergy.com.au/outage-map/';

const ARCGIS_BASE     = 'https://services.arcgis.com/unitedenergy/arcgis/rest/services/Outages_Public/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class UnitedEnergyScraper extends BaseScraper {
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
      ...planned.map((f)   => this._normalise(f, 'planned')),
    ];
  }

  _normalise(feature, type) {
    const a = feature.attributes || {};
    const g = feature.geometry   || {};
    return {
      id:                   makeId(PROVIDER, a.OBJECTID || a.OutageId || a.OUTAGE_ID || a.ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(a),
      status:               a.Status || a.STATUS || null,
      state:                'VIC',
      suburb:               a.Suburb || a.SUBURB || a.Location || a.LOCATION || null,
      postcode:             String(a.Postcode || a.POSTCODE || '').trim() || null,
      lat:                  g.y  || null,
      lng:                  g.x  || null,
      customersAffected:    toInt(a.CustomersAffected || a.CUSTOMERS_AFFECTED || a.Customers),
      cause:                a.Cause || a.CAUSE || null,
      startedAt:            toISO(a.StartTime || a.START_TIME || a.StartDateTime),
      estimatedRestoration: toISO(a.ETR || a.ESTIMATED_RESTORE_TIME || a.EstimatedRestore),
      lastUpdated:          toISO(a.LastUpdated || a.LAST_UPDATED) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 feature,
    };
  }
}

function deriveType(a) {
  const raw = String(a.OutageType || a.OUTAGE_TYPE || a.Type || a.TYPE || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('scheduled')) return 'planned';
  return 'unplanned';
}

module.exports = new UnitedEnergyScraper();
