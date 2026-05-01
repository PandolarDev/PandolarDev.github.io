'use strict';

/**
 * Ausgrid — NSW electricity distributor (Sydney, Hunter, Central Coast)
 * Outage page: https://www.ausgrid.com.au/Outages/Current-Outages
 *
 * Ausgrid's outage map loads data from an internal REST endpoint.
 * Endpoint discovery: open DevTools Network tab on the outage page and filter
 * for XHR/Fetch calls — look for requests returning a JSON array of outage
 * objects, typically under /api/outages or similar.
 *
 * The endpoint below is the best-known path based on their Drupal CMS setup.
 * If it returns a non-JSON response, update OUTAGE_API to the actual URL found
 * via network inspection.
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER    = 'ausgrid';
const NAME        = 'Ausgrid';
const SOURCE_URL  = 'https://www.ausgrid.com.au/Outages/Current-Outages';
const OUTAGE_API  = 'https://www.ausgrid.com.au/api/outages/current';

class AusgridScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const data = await this.get(OUTAGE_API, {
      headers: { Referer: SOURCE_URL },
    });

    const items = Array.isArray(data) ? data : (data.outages || data.data || []);
    return items.map((item) => this._normalise(item));
  }

  _normalise(item) {
    const type = deriveType(item);
    return {
      id:                   makeId(PROVIDER, item.outageId || item.id || item.OutageId),
      provider:             PROVIDER,
      providerName:         NAME,
      type,
      status:               item.status || item.Status || null,
      state:                'NSW',
      suburb:               item.suburb || item.Suburb || item.location || null,
      postcode:             String(item.postcode || item.Postcode || '').trim() || null,
      lat:                  parseFloat(item.latitude  || item.lat  || item.Latitude)  || null,
      lng:                  parseFloat(item.longitude || item.lng  || item.Longitude) || null,
      customersAffected:    toInt(item.customersAffected || item.customers || item.CustomersAffected),
      cause:                item.cause || item.Cause || null,
      startedAt:            toISO(item.startTime || item.startedAt || item.StartTime),
      estimatedRestoration: toISO(item.estimatedRestoreTime || item.etr || item.EstimatedRestoreTime),
      lastUpdated:          toISO(item.lastUpdated || item.updatedAt) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function deriveType(item) {
  const raw = String(item.type || item.outageType || item.Type || '').toLowerCase();
  if (raw.includes('planned') || raw.includes('scheduled')) return 'planned';
  if (raw.includes('restor')) return 'restored';
  return 'unplanned';
}

module.exports = new AusgridScraper();
