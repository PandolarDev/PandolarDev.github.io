'use strict';

/**
 * AusNet Services — eastern/central Victoria electricity distributor
 * Outage tracker: https://outagetrackerservice.ausnetservices.com.au/
 *
 * Single combined endpoint returns all incidents (planned + unplanned).
 * Response shape: { data: [...], errors: [...], success: bool }
 *
 * Each item has fields:
 *   id, type ("Planned"/"Unplanned"), incidentStatus, cause,
 *   latitude, longitude, nmiCount, unplannedStartTime, plannedStartTime,
 *   latestEstimatedTimeToRestoration, incidentLastUpdated, details[]
 */

const BaseScraper = require('./base');
const { makeId, toInt, toISO } = require('../utils/normalize');

const PROVIDER   = 'ausnet';
const NAME       = 'AusNet Services';
const SOURCE_URL = 'https://outagetrackerservice.ausnetservices.com.au/';
const API_URL    = 'https://outagetrackerservice.ausnetservices.com.au/api/v1/outages/combinedoutage';

class AusnetScraper extends BaseScraper {
  constructor() {
    super(PROVIDER, NAME, SOURCE_URL);
  }

  async scrape() {
    const data = await this.get(API_URL, {
      headers: { Referer: 'https://outagetrackerservice.ausnetservices.com.au/' },
    });
    const items = Array.isArray(data) ? data : (data.data || []);
    return items.map((item) => this._normalise(item));
  }

  _normalise(item) {
    const isPlanned = String(item.type || '').toLowerCase() === 'planned';

    // suburb may appear in details array entries
    const suburb = (Array.isArray(item.details) && item.details.length > 0)
      ? (item.details[0].suburb || item.details[0].townName || item.details[0].location || null)
      : null;

    const startTime = isPlanned
      ? (item.plannedStartTime || item.unplannedStartTime)
      : (item.unplannedStartTime || item.plannedStartTime);

    return {
      id:                   makeId(PROVIDER, item.id || item.incident),
      provider:             PROVIDER,
      providerName:         NAME,
      type:                 deriveType(item),
      status:               item.incidentStatus || item.status || null,
      state:                'VIC',
      suburb:               suburb,
      postcode:             null,
      lat:                  parseFloat(item.latitude)  || null,
      lng:                  parseFloat(item.longitude) || null,
      customersAffected:    toInt(item.nmiCount),
      cause:                item.cause || null,
      startedAt:            toISO(startTime),
      estimatedRestoration: toISO(item.latestEstimatedTimeToRestoration || item.initialEstimatedTimeToRestoration),
      lastUpdated:          toISO(item.incidentLastUpdated) || new Date().toISOString(),
      sourceUrl:            SOURCE_URL,
      _raw:                 item,
    };
  }
}

function deriveType(item) {
  const status = String(item.incidentStatus || '').toLowerCase();
  if (status === 'restored' || status.includes('restor')) return 'restored';

  const type = String(item.type || '').toLowerCase();
  if (type === 'planned') return 'planned';
  return 'unplanned';
}

module.exports = new AusnetScraper();
