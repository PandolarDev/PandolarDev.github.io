'use strict';

const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');

function startScheduler() {
  const { runAllScrapers, runLiveScrapers } = require('./scrapers');

  // Live outages: refresh every 5 minutes by default
  cron.schedule(config.cron.live, async () => {
    logger.info('Cron: refreshing live outages');
    await runLiveScrapers().catch((err) =>
      logger.error('Live scrape cron failed', { err: err.message })
    );
  });

  // Planned outages: refresh every 30 minutes by default
  cron.schedule(config.cron.planned, async () => {
    logger.info('Cron: refreshing planned outages');
    await runAllScrapers().catch((err) =>
      logger.error('Planned scrape cron failed', { err: err.message })
    );
  });

  logger.info('Scheduler started', {
    liveCron: config.cron.live,
    plannedCron: config.cron.planned,
  });
}

module.exports = { startScheduler };
