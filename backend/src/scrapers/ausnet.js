'use strict';

/**
 * AusNet Services — eastern/central Victoria electricity distributor
 * Outage tracker: https://www.outagetracker.com.au/
 *
 * AusNet operates a dedicated outage tracker site at outagetracker.com.au.
 * The site is a React SPA that fetches outage data from a JSON REST API.
 *
 * Endpoint discovery: open DevTools Network tab on outagetracker.com.au and
 * inspect XHR/Fetch requests. The API base URL is typically under
 * /api/v1/ or /map/incidents with JSON responses.
 *
 * Primary endpoint: returns all active incidents as a JSON array.
 * Secondary endpoint: returns planned works (maintenance windows).
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER        = 'ausnet';
const NAME            = 'AusNet Services';
const SOURCE_URL      = 'https://www.outagetracker.com.au/';
const API_UNPLANNED   = 'https://www.outagetracker.com.au/api/v1/incidents';
const API_PLANNED     = 'https://www.outagetracker.com.au/api/v1/planned-works';

class AusnetScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const [unplanned, planned] = await Promise.all([
      this.get(API_UNPLANNED, { headers: { Referer: SOURCE_URL } }).catch(() => []),
      this.get(API_PLANNED,   { headers: { Referer: SOURCE_URL } }).catch(() => []),
    ]);

    const unplannedItems = Array.isArray(unplanned) ? unplanned : (unplanned.incidents || unplanned.data || []);
    const plannedItems   = Array.isArray(planned)   ? planned   : (planned.plannedWorks || planned.data || []);

    return [
      ...unplannedItems.map((i) => this._normalise(i, 'unplanned')),
      ...plannedItems.map((i)   => this._normalise(i, 'planned')),
    ];
  }

  _normalise(item, type) {
    return {
      id:                   makeId(PROVIDER, item.id || item.incidentId || item.outageId),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 type === 'planned' ? 'planned' : deriveType(item),
      status:               item.status || item.crewStatus || null,
      state:                'VIC',
      suburb:               item.suburb || item.location || item.area || null,
      postcode:             String(item.postcode || '').trim() || null,
      lat:                  parseFloat(item.latitude  || item.lat)  || null,
      lng:                  parseFloat(item.longitude || item.lng)  || null,
      customersAffected:    toInt(item.customersAffected || item.customers || item.affectedCustomers),
      cause:                item.cause || item.faultCause || null,
      startedAt:            toISO(item.startTime || item.startedAt || item.incidentStart),
      estimatedRestoration: toISO(item.etr || item.estimatedRestoration || item.restorationTime),
      lastUpdated:          toISO(item.lastUpdated || item.updatedAt) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function deriveType(item) {
  const raw = String(item.type || item.outageType || item.incidentType || '').toLowerCase();
  if (raw.includes('restor')) return 'restored';
  if (raw.includes('planned') || raw.includes('maintenance')) return 'planned';
  return 'unplanned';
}

module.exports = new AusnetScraper();
