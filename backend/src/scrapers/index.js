'use strict';

const logger = require('../utils/logger');

const SCRAPERS = {
  ausgrid:           require('./ausgrid'),
  essential_energy:  require('./essential-energy'),
  energex:           require('./energex'),
  ergon:             require('./ergon'),
  powercor:          require('./powercor'),
  united_energy:     require('./united-energy'),
  jemena:            require('./jemena'),
  ausnet:            require('./ausnet'),
  western_power:     require('./western-power'),
  sa_power_networks: require('./sa-power-networks'),
};

/**
 * Run all scrapers concurrently.
 * Individual failures are caught per-scraper and do not abort the others.
 */
async function runAllScrapers() {
  const results = await Promise.allSettled(
    Object.values(SCRAPERS).map((s) => s.fetch())
  );

  results.forEach((r, i) => {
    const name = Object.keys(SCRAPERS)[i];
    if (r.status === 'rejected') {
      logger.error(`runAllScrapers: ${name} failed`, { err: r.reason?.message });
    }
  });

  return results;
}

/**
 * Run only the scrapers needed for live/unplanned outage freshness.
 * Currently identical to runAllScrapers — split out so the scheduler can
 * call a lighter job for the high-frequency live-refresh cron.
 */
async function runLiveScrapers() {
  return runAllScrapers();
}

module.exports = { SCRAPERS, runAllScrapers, runLiveScrapers };
