'use strict';

/**
 * Ausgrid — NSW electricity distributor (Sydney, Hunter, Central Coast)
 * Outage page: https://www.ausgrid.com.au/Outages/Current-Outages
 *
 * Verified endpoints (discovered via browser DevTools network inspection):
 *   Unplanned faults:     /webapi/OutageMapData/GetCurrentUnplannedOutageMarkers
 *   Current planned:      /webapi/OutageMapData/GetCurrentPlannedOutageMarkers
 *   Future planned:       /webapi/OutageMapData/GetFuturePlannedOutageMarkers
 *
 * Response shape per item:
 *   { WebId, Customers, Coords: [{lat, lng}, ...], Area, Cause, EstRestTime,
 *     OutageDisplayType, StartDateTime, Status }
 *
 * Notes:
 *   - Customers is a string e.g. "12" or "< 10"
 *   - Coords is an array (outage can span multiple addresses); use first point
 *   - Most detail fields (Cause, StartDateTime, EstRestTime) are null at the
 *     markers level; full detail is available via a separate detail endpoint
 *     if needed in future.
 */

const BaseScraper = require('./base');
const { makeId, toISO } = require('../utils/normalize');

const PROVIDER   = 'ausgrid';
const NAME       = 'Ausgrid';
const SOURCE_URL = 'https://www.ausgrid.com.au/Outages/Current-Outages';
const API_BASE   = 'https://www.ausgrid.com.au/webapi/OutageMapData';

class AusgridScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const headers = { Referer: SOURCE_URL };
    const [unplanned, currentPlanned, futurePlanned] = await Promise.all([
      this.get(`${API_BASE}/GetCurrentUnplannedOutageMarkers`, { headers }).catch(() => []),
      this.get(`${API_BASE}/GetCurrentPlannedOutageMarkers`,  { headers }).catch(() => []),
      this.get(`${API_BASE}/GetFuturePlannedOutageMarkers`,   { headers }).catch(() => []),
    ]);

    return [
      ...toArray(unplanned).map((i)        => this._normalise(i, 'unplanned')),
      ...toArray(currentPlanned).map((i)   => this._normalise(i, 'planned')),
      ...toArray(futurePlanned).map((i)    => this._normalise(i, 'planned')),
    ];
  }

  _normalise(item, type) {
    const coord = Array.isArray(item.Coords) && item.Coords.length > 0 ? item.Coords[0] : {};
    return {
      id:                   makeId(PROVIDER, item.WebId),
      provider:             PROVIDER,
      providerName:         NAME,
      type,
      status:               item.Status || null,
      state:                'NSW',
      suburb:               item.Area || null,
      postcode:             null,
      lat:                  coord.lat || null,
      lng:                  coord.lng || null,
      customersAffected:    parseCustomers(item.Customers),
      cause:                item.Cause || null,
      startedAt:            toISO(item.StartDateTime),
      estimatedRestoration: toISO(item.EstRestTime),
      lastUpdated:          new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  return [];
}

// Customers field is a string like "12" or "< 10"
function parseCustomers(val) {
  if (!val) return null;
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

module.exports = new AusgridScraper();
