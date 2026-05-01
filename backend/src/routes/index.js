'use strict';

const router = require('express').Router();

router.use('/outages',   require('./outages'));
router.use('/providers', require('./providers'));
router.use('/stats',     require('./stats'));

module.exports = router;
