'use strict';

const router = require('express').Router();
const { getStats } = require('../database');

/**
 * GET /api/stats
 * Returns aggregated counts: total, by type, customers affected, by state, by provider.
 */
router.get('/', (_req, res, next) => {
  try {
    res.json({ data: getStats(), generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
