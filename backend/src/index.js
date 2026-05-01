'use strict';

const config = require('./config');
const logger = require('./utils/logger');
const { initDb } = require('./database');
const { createServer } = require('./server');
const { startScheduler } = require('./scheduler');

async function main() {
  initDb();

  const { runAllScrapers } = require('./scrapers');
  logger.info('Running initial scrape on startup…');
  await runAllScrapers().catch((err) => logger.error('Initial scrape failed', { err: err.message }));

  startScheduler();

  const app = createServer();
  app.listen(config.port, () => {
    logger.info(`OutageTracker API listening on port ${config.port}`, { env: config.nodeEnv });
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
