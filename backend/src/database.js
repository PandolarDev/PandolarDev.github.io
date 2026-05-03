'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');
const logger = require('./utils/logger');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

function initDb() {
  const dbPath = path.resolve(__dirname, '..', config.db.path);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS outages (
      id                    TEXT PRIMARY KEY,
      provider              TEXT NOT NULL,
      provider_name         TEXT NOT NULL,
      type                  TEXT NOT NULL CHECK(type IN ('unplanned','planned','restored')),
      status                TEXT,
      state                 TEXT,
      suburb                TEXT,
      postcode              TEXT,
      lat                   REAL,
      lng                   REAL,
      customers_affected    INTEGER NOT NULL DEFAULT 0,
      cause                 TEXT,
      started_at            TEXT,
      estimated_restoration TEXT,
      last_updated          TEXT NOT NULL,
      source_url            TEXT,
      raw_data              TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outages_provider  ON outages(provider);
    CREATE INDEX IF NOT EXISTS idx_outages_type      ON outages(type);
    CREATE INDEX IF NOT EXISTS idx_outages_state     ON outages(state);
    CREATE INDEX IF NOT EXISTS idx_outages_updated   ON outages(last_updated);

    CREATE TABLE IF NOT EXISTS provider_status (
      provider        TEXT PRIMARY KEY,
      provider_name   TEXT NOT NULL,
      last_fetch_at   TEXT,
      last_success_at TEXT,
      last_error      TEXT,
      outage_count    INTEGER DEFAULT 0
    );
  `);

  logger.info('Database initialised', { path: dbPath });
  return db;
}

/* ------------------------------------------------------------------ */
/* Outage writes                                                         */
/* ------------------------------------------------------------------ */

const upsertOutage = (() => {
  let stmt;
  return (outage) => {
    if (!stmt) {
      stmt = getDb().prepare(`
        INSERT INTO outages
          (id, provider, provider_name, type, status, state, suburb, postcode,
           lat, lng, customers_affected, cause, started_at, estimated_restoration,
           last_updated, source_url, raw_data)
        VALUES
          (@id, @provider, @providerName, @type, @status, @state, @suburb, @postcode,
           @lat, @lng, @customersAffected, @cause, @startedAt, @estimatedRestoration,
           @lastUpdated, @sourceUrl, @rawData)
        ON CONFLICT(id) DO UPDATE SET
          type                  = excluded.type,
          status                = excluded.status,
          suburb                = excluded.suburb,
          postcode              = excluded.postcode,
          lat                   = excluded.lat,
          lng                   = excluded.lng,
          customers_affected    = excluded.customers_affected,
          cause                 = excluded.cause,
          started_at            = excluded.started_at,
          estimated_restoration = excluded.estimated_restoration,
          last_updated          = excluded.last_updated,
          source_url            = excluded.source_url,
          raw_data              = excluded.raw_data
      `);
    }
    return stmt.run({ ...outage, rawData: JSON.stringify(outage._raw || null) });
  };
})();

function bulkUpsertOutages(outages) {
  const upsertMany = getDb().transaction((rows) => {
    for (const row of rows) upsertOutage(row);
  });
  upsertMany(outages);
}

/**
 * Remove stale outages for a provider that were not included in the latest fetch.
 * "Restored" records are kept for 24 h before deletion.
 */
function pruneStaleOutages(provider, freshIds) {
  if (!freshIds.length) return;
  const idList = freshIds.map(() => '?').join(',');
  const restoredCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const activeCutoff   = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  getDb()
    .prepare(
      `DELETE FROM outages
       WHERE provider = ?
         AND id NOT IN (${idList})
         AND (
           (type = 'restored' AND last_updated < ?)
           OR (type != 'restored' AND last_updated < ?)
         )`
    )
    .run(provider, ...freshIds, restoredCutoff, activeCutoff);
}

/* ------------------------------------------------------------------ */
/* Outage reads                                                          */
/* ------------------------------------------------------------------ */

function queryOutages({ provider, type, state, search, limit = 500, offset = 0 } = {}) {
  const conditions = [];
  const params = [];

  if (provider) { conditions.push('provider = ?'); params.push(provider); }
  if (type)     { conditions.push('type = ?');     params.push(type); }
  if (state)    { conditions.push('state = ?');    params.push(state.toUpperCase()); }
  if (search) {
    conditions.push('(suburb LIKE ? OR postcode LIKE ? OR cause LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(
      `SELECT * FROM outages ${where}
       ORDER BY customers_affected DESC, started_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return rows.map(deserialise);
}

function getOutageById(id) {
  const row = getDb().prepare('SELECT * FROM outages WHERE id = ?').get(id);
  return row ? deserialise(row) : null;
}

function deserialise(row) {
  return {
    id: row.id,
    provider: row.provider,
    providerName: row.provider_name,
    type: row.type,
    status: row.status,
    state: row.state,
    suburb: row.suburb,
    postcode: row.postcode,
    lat: row.lat,
    lng: row.lng,
    customersAffected: row.customers_affected,
    cause: row.cause,
    startedAt: row.started_at,
    estimatedRestoration: row.estimated_restoration,
    lastUpdated: row.last_updated,
    sourceUrl: row.source_url,
  };
}

/* ------------------------------------------------------------------ */
/* Provider status                                                       */
/* ------------------------------------------------------------------ */

function upsertProviderStatus({ provider, providerName, lastFetchAt, lastSuccessAt, lastError, outageCount }) {
  getDb()
    .prepare(`
      INSERT INTO provider_status (provider, provider_name, last_fetch_at, last_success_at, last_error, outage_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        provider_name   = excluded.provider_name,
        last_fetch_at   = excluded.last_fetch_at,
        last_success_at = CASE WHEN excluded.last_success_at IS NOT NULL THEN excluded.last_success_at ELSE last_success_at END,
        last_error      = excluded.last_error,
        outage_count    = CASE WHEN excluded.last_success_at IS NOT NULL THEN excluded.outage_count ELSE outage_count END
    `)
    .run(provider, providerName, lastFetchAt, lastSuccessAt || null, lastError || null, outageCount ?? 0);
}

function getAllProviderStatuses() {
  return getDb().prepare('SELECT * FROM provider_status ORDER BY provider').all();
}

/* ------------------------------------------------------------------ */
/* Stats                                                                 */
/* ------------------------------------------------------------------ */

function getStats() {
  const db = getDb();

  const total = db.prepare("SELECT COUNT(*) as n FROM outages WHERE type != 'restored'").get().n;
  const unplanned = db.prepare("SELECT COUNT(*) as n FROM outages WHERE type = 'unplanned'").get().n;
  const planned   = db.prepare("SELECT COUNT(*) as n FROM outages WHERE type = 'planned'").get().n;
  const restored  = db.prepare("SELECT COUNT(*) as n FROM outages WHERE type = 'restored'").get().n;
  const customers = db.prepare("SELECT SUM(customers_affected) as n FROM outages WHERE type != 'restored'").get().n || 0;

  const byState = db
    .prepare(
      `SELECT state, COUNT(*) as outages, SUM(customers_affected) as customers
       FROM outages WHERE type != 'restored' AND state IS NOT NULL
       GROUP BY state ORDER BY outages DESC`
    )
    .all();

  const byProvider = db
    .prepare(
      `SELECT provider, provider_name, COUNT(*) as outages, SUM(customers_affected) as customers
       FROM outages WHERE type != 'restored'
       GROUP BY provider ORDER BY outages DESC`
    )
    .all();

  return { total, unplanned, planned, restored, customersAffected: customers, byState, byProvider };
}

module.exports = {
  initDb,
  getDb,
  bulkUpsertOutages,
  pruneStaleOutages,
  queryOutages,
  getOutageById,
  upsertProviderStatus,
  getAllProviderStatuses,
  getStats,
};
