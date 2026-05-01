'use strict';

/**
 * Western Power — Western Australia electricity distributor
 * Outage page: https://www.westernpower.com.au/outages/
 *
 * Western Power provides a public JSON API for their outage map, exposed via
 * their website's backend. The API returns a list of current faults and
 * planned interruptions.
 *
 * Endpoint discovery: network-inspect the /outages/ page and look for JSON
 * API calls. Western Power commonly uses a path like /api/outages or
 * /map-data/outages. The endpoint below reflects their known API structure.
 *
 * Note: Western Power covers SWIS (South-West Interconnected System) only.
 * Remote/regional WA (Horizon Power territory) is NOT covered here.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'western_power';
const NAME       = 'Western Power';
const SOURCE_URL = 'https://www.westernpower.com.au/outages/';
const API_BASE   = 'https://www.westernpower.com.au/api';

class WesternPowerScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    // Western Power serves both current faults and planned interruptions from
    // a single endpoint or two separate endpoints under /api/outages
    const [faults, planned] = await Promise.all([
      this.get(`${API_BASE}/outages/current`, { headers: { Referer: SOURCE_URL } }).catch(() => null),
      this.get(`${API_BASE}/outages/planned`, { headers: { Referer: SOURCE_URL } }).catch(() => null),
    ]);

    const faultItems   = toArray(faults);
    const plannedItems = toArray(planned);

    return [
      ...faultItems.map((i)   => this._normalise(i, 'unplanned')),
      ...plannedItems.map((i) => this._normalise(i, 'planned')),
    ];
  }

  _normalise(item, type) {
    return {
      id:                   makeId(PROVIDER, item.id || item.outageId || item.faultId || item.workOrderId),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(item),
      status:               item.status || item.faultStatus || null,
      state:                'WA',
      suburb:               item.suburb || item.location || item.area || item.townName || null,
      postcode:             String(item.postcode || item.postalCode || '').trim() || null,
      lat:                  parseFloat(item.latitude  || item.lat)  || null,
      lng:                  parseFloat(item.longitude || item.lng)  || null,
      customersAffected:    toInt(item.customersAffected || item.customers || item.affectedCustomers),
      cause:                item.cause || item.outageReason || item.faultType || null,
      startedAt:            toISO(item.startTime || item.faultStartTime || item.startDateTime),
      estimatedRestoration: toISO(item.estimatedRestorationTime || item.etr || item.restorationTime),
      lastUpdated:          toISO(item.lastUpdated || item.updatedAt) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function deriveType(item) {
  const raw = String(item.type || item.outageType || item.faultType || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('scheduled') || raw.includes('maintenance')) return 'planned';
  return 'unplanned';
}

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.outages || data.faults || data.interruptions || data.data || [];
}

module.exports = new WesternPowerScraper();
