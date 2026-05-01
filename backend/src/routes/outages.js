'use strict';

const router = require('express').Router();
const { queryOutages, getOutageById } = require('../database');

/**
 * GET /api/outages
 * Query params: provider, type, state, search, limit, offset
 */
router.get('/', (req, res, next) => {
  try {
    const { provider, type, state, search } = req.query;
    const limit  = Math.min(parseInt(req.query.limit  || '500', 10), 1000);
    const offset = parseInt(req.query.offset || '0', 10);

    const validTypes = ['unplanned', 'planned', 'restored'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const outages = queryOutages({ provider, type, state, search, limit, offset });
    res.json({ data: outages, meta: { count: outages.length, limit, offset } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/outages/:id
 */
router.get('/:id', (req, res, next) => {
  try {
    const outage = getOutageById(req.params.id);
    if (!outage) return res.status(404).json({ error: 'Outage not found' });
    res.json({ data: outage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
