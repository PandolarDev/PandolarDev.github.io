'use strict';

/**
 * Powercor — western Victoria electricity distributor (CitiPower/Powercor group)
 * Outage page: https://www.powercor.com.au/power-outages-and-emergencies/live-outage-map/
 *
 * Powercor's live outage map uses an ArcGIS FeatureServer. CitiPower and
 * Powercor share the same backend GIS infrastructure with separate layers or
 * service instances for each brand.
 *
 * Endpoint discovery: network-inspect the live-outage-map page and look for
 * requests to an Esri/ArcGIS FeatureServer under *.powercor.com.au or
 * *.ausnetservices.com.au. Update the ARCGIS_BASE URL as needed.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'powercor';
const NAME       = 'Powercor';
const SOURCE_URL = 'https://www.powercor.com.au/power-outages-and-emergencies/live-outage-map/';

const ARCGIS_BASE     = 'https://services.arcgis.com/powercor/arcgis/rest/services/Outages_Public/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class PowercorScraper extends BaseScraper {
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
      id:                   makeId(PROVIDER, a.OBJECTID || a.OutageId || a.ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(a),
      status:               a.Status || a.STATUS || null,
      state:                'VIC',
      suburb:               a.Suburb || a.SUBURB || a.Location || null,
      postcode:             String(a.Postcode || a.POSTCODE || '').trim() || null,
      lat:                  g.y  || null,
      lng:                  g.x  || null,
      customersAffected:    toInt(a.CustomersAffected || a.CUSTOMERS || a.Customers),
      cause:                a.Cause || a.CAUSE || null,
      startedAt:            toISO(a.StartTime || a.START_TIME),
      estimatedRestoration: toISO(a.ETR || a.ESTIMATED_RESTORE_TIME),
      lastUpdated:          toISO(a.LastUpdated || a.UPDATED) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 feature,
    };
  }
}

function deriveType(a) {
  const raw = String(a.OutageType || a.TYPE || a.Type || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('scheduled')) return 'planned';
  return 'unplanned';
}

module.exports = new PowercorScraper();
