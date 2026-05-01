'use strict';

const router = require('express').Router();
const { getAllProviderStatuses } = require('../database');
const logger = require('../utils/logger');

/**
 * GET /api/providers
 * Returns last-fetch status for every registered provider.
 */
router.get('/', (_req, res, next) => {
  try {
    const statuses = getAllProviderStatuses();
    res.json({ data: statuses });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/providers/:provider/refresh
 * Trigger an immediate on-demand scrape for a single provider.
 */
router.post('/:provider/refresh', async (req, res, next) => {
  try {
    const { SCRAPERS } = require('../scrapers');
    const scraper = SCRAPERS[req.params.provider];
    if (!scraper) {
      return res.status(404).json({ error: `Unknown provider: ${req.params.provider}` });
    }
    logger.info(`Manual refresh requested for ${req.params.provider}`);
    const result = await scraper.fetch();
    res.json({ data: { provider: req.params.provider, count: result.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
