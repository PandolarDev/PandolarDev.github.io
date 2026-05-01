'use strict';

/**
 * Essential Energy — NSW rural electricity distributor
 * Outage page: https://www.essentialenergy.com.au/outages-and-faults/power-outages
 *
 * Essential Energy uses an ArcGIS FeatureServer to back their outage map.
 * Endpoint discovery: inspect network requests on the outage page and look for
 * calls to an ArcGIS FeatureServer /query endpoint returning outage features.
 *
 * The ArcGIS service URLs below were identified from network traffic on the
 * Essential Energy outage map page. Layer 0 = unplanned, Layer 1 = planned.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'essential_energy';
const NAME       = 'Essential Energy';
const SOURCE_URL = 'https://www.essentialenergy.com.au/outages-and-faults/power-outages';

// ArcGIS Feature Service — update these layer URLs if the service is relocated
const ARCGIS_BASE = 'https://portal.essentialenergy.com.au/arcgis/rest/services/Public/Outages/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class EssentialEnergyScraper extends BaseScraper {
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
      id:                   makeId(PROVIDER, a.OBJECTID || a.OutageId || a.OUTAGEID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(a),
      status:               a.Status || a.STATUS || null,
      state:                'NSW',
      suburb:               a.Suburb || a.SUBURB || a.Location || null,
      postcode:             String(a.Postcode || a.POSTCODE || '').trim() || null,
      lat:                  g.y  || null,
      lng:                  g.x  || null,
      customersAffected:    toInt(a.CustomersAffected || a.CUSTOMERS_AFFECTED || a.Customers),
      cause:                a.Cause || a.CAUSE || null,
      startedAt:            toISO(a.StartTime || a.START_TIME || a.StartDateTime),
      estimatedRestoration: toISO(a.ETR || a.EstimatedRestoreTime || a.ESTIMATED_RESTORE_TIME),
      lastUpdated:          toISO(a.LastUpdated || a.LAST_UPDATED) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 feature,
    };
  }
}

function deriveType(a) {
  const raw = String(a.OutageType || a.OUTAGE_TYPE || a.Type || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned')) return 'planned';
  return 'unplanned';
}

module.exports = new EssentialEnergyScraper();
