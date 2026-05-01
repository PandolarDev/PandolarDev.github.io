'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');

function createServer() {
  const app = express();

  app.use(cors({ origin: config.cors.origins, optionsSuccessStatus: 200 }));
  app.use(express.json());

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  app.use('/api', routes);

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use((err, _req, res, _next) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createServer };
