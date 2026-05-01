'use strict';

/**
 * SA Power Networks — South Australia electricity distributor
 * Outage page: https://www.sapowernetworks.com.au/outages/
 *
 * SA Power Networks (SAPN) uses an ArcGIS-backed outage map. Their FeatureServer
 * is served from their own ArcGIS portal. The outage page fires requests to
 * an Esri FeatureServer; the URL pattern follows the standard ArcGIS REST API.
 *
 * Endpoint discovery: network-inspect the /outages/ page. Look for calls to
 * an ArcGIS FeatureServer under *.sapowernetworks.com.au or a hosted Esri service.
 *
 * Layer 0 = current/unplanned faults, Layer 1 = planned interruptions.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'sa_power_networks';
const NAME       = 'SA Power Networks';
const SOURCE_URL = 'https://www.sapowernetworks.com.au/outages/';

const ARCGIS_BASE     = 'https://gis.sapowernetworks.com.au/server/rest/services/Public/Outages/FeatureServer';
const LAYER_UNPLANNED = `${ARCGIS_BASE}/0/query`;
const LAYER_PLANNED   = `${ARCGIS_BASE}/1/query`;

class SAPowerNetworksScraper extends BaseScraper {
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
      id:                   makeId(PROVIDER, a.OBJECTID || a.OutageId || a.OUTAGE_ID),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(a),
      status:               a.Status || a.STATUS || null,
      state:                'SA',
      suburb:               a.Suburb || a.SUBURB || a.Location || a.LOCATION || null,
      postcode:             String(a.Postcode || a.POSTCODE || '').trim() || null,
      lat:                  g.y  || null,
      lng:                  g.x  || null,
      customersAffected:    toInt(a.CustomersAffected || a.CUSTOMERS_AFFECTED || a.Customers),
      cause:                a.Cause || a.CAUSE || a.FaultReason || null,
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

module.exports = new SAPowerNetworksScraper();
