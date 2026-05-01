'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },

  db: {
    path: process.env.DB_PATH || './data/outages.db',
  },

  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '15000', 10),
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || '3', 10),
    proxy: process.env.HTTP_PROXY || null,
  },

  cron: {
    live: process.env.CRON_LIVE || '*/5 * * * *',
    planned: process.env.CRON_PLANNED || '*/30 * * * *',
  },
};

module.exports = config;
