'use strict';

/**
 * Ausgrid — NSW electricity distributor (Sydney, Hunter, Central Coast)
 * Outage page: https://www.ausgrid.com.au/Outages/Current-Outages
 *
 * Verified endpoints (discovered via browser DevTools network inspection):
 *   Unplanned faults:     /webapi/OutageMapData/GetCurrentUnplannedOutageMarkers
 *   Current planned:      /webapi/OutageMapData/GetCurrentPlannedOutageMarkers
 *   Future planned:       /webapi/OutageMapData/GetFuturePlannedOutageMarkers
 *   Outage detail:        /webapi/OutageMapData/GetOutage?OutageDisplayType=P&WebId={WebId}
 *
 * Markers response shape:
 *   { WebId, Customers, Coords: [{lat, lng}, ...], Area, Cause, EstRestTime,
 *     OutageDisplayType, StartDateTime, Status }
 *
 * Detail response shape:
 *   { WebId, JobId, Area, Streets, Cause, Detail, Customers,
 *     StartDateTime, EndDateTime, Status, Reason, OutageDisplayType }
 *
 * Strategy: fetch all markers for coordinates + WebIds, then fetch the detail
 * endpoint for each outage (concurrency-limited to 10) to populate the rich
 * fields that are null on the markers endpoint.
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

    const tagged = [
      ...toArray(unplanned).map(m => ({ marker: m, type: 'unplanned' })),
      ...toArray(currentPlanned).map(m => ({ marker: m, type: 'planned' })),
      ...toArray(futurePlanned).map(m => ({ marker: m, type: 'planned' })),
    ];

    // Fetch detail for each outage, max 10 concurrent requests
    const results = await pMap(tagged, async ({ marker, type }) => {
      const displayType = marker.OutageDisplayType || 'P';
      const detail = await this.get(
        `${API_BASE}/GetOutage?OutageDisplayType=${displayType}&WebId=${marker.WebId}`,
        { headers }
      ).catch(() => null);
      return this._normalise(marker, detail, type);
    }, 10);

    return results;
  }

  _normalise(marker, detail, type) {
    const coord = Array.isArray(marker.Coords) && marker.Coords.length > 0 ? marker.Coords[0] : {};
    const d = detail || {};
    return {
      id:                   makeId(PROVIDER, marker.WebId),
      provider:             PROVIDER,
      providerName:         NAME,
      type,
      status:               d.Status || marker.Status || null,
      state:                'NSW',
      suburb:               d.Area   || marker.Area   || null,
      postcode:             null,
      lat:                  coord.lat || null,
      lng:                  coord.lng || null,
      customersAffected:    parseCustomers(d.Customers || marker.Customers),
      cause:                d.Cause  || marker.Cause  || null,
      startedAt:            toISO(d.StartDateTime || marker.StartDateTime),
      estimatedRestoration: toISO(d.EndDateTime   || marker.EstRestTime),
      lastUpdated:          new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 { marker, detail },
    };
  }
}

function toArray(data) {
  return Array.isArray(data) ? data : [];
}

// Handles "12", "< 10", "less than 10", etc.
function parseCustomers(val) {
  if (!val) return null;
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

// Concurrency-limited async map
async function pMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

module.exports = new AusgridScraper();

