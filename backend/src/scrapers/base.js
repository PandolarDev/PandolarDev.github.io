'use strict';

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { bulkUpsertOutages, pruneStaleOutages, upsertProviderStatus } = require('../database');

class BaseScraper {
  /**
   * @param {string} provider  — slug matching PROVIDER_META keys
   * @param {string} name      — human-readable provider name
   * @param {string} sourceUrl — canonical outage page URL
   */
  constructor(provider, name, sourceUrl) {
    this.provider  = provider;
    this.name      = name;
    this.sourceUrl = sourceUrl;

    this.http = axios.create({
      timeout: config.scraper.timeout,
      headers: {
        // Identify ourselves politely; some CDNs block default axios UA
        'User-Agent':
          'OutageTracker-Aggregator/1.0 (+https://github.com/pandolardev/outagetracker)',
        Accept: 'application/json, text/html, */*',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      ...(config.scraper.proxy ? { proxy: false } : {}), // proxy handled via env if needed
    });
  }

  /**
   * Override in subclass. Must return an array of canonical outage objects.
   * @returns {Promise<object[]>}
   */
  async scrape() {
    throw new Error(`${this.provider}: scrape() not implemented`);
  }

  /**
   * Fetch outages, persist to DB, update provider status.
   * @returns {Promise<object[]>} normalised outages
   */
  async fetch() {
    const fetchedAt = new Date().toISOString();
    upsertProviderStatus({
      provider: this.provider,
      providerName: this.name,
      lastFetchAt: fetchedAt,
      lastSuccessAt: null,
      lastError: null,
      outageCount: 0,
    });

    let outages = [];
    let lastError = null;

    for (let attempt = 1; attempt <= config.scraper.maxRetries; attempt++) {
      try {
        outages = await this.scrape();
        break;
      } catch (err) {
        lastError = err.message;
        logger.warn(`${this.provider}: attempt ${attempt} failed — ${err.message}`);
        if (attempt < config.scraper.maxRetries) {
          await sleep(attempt * 2000);
        }
      }
    }

    if (lastError && !outages.length) {
      upsertProviderStatus({
        provider: this.provider,
        providerName: this.name,
        lastFetchAt: fetchedAt,
        lastSuccessAt: null,
        lastError,
        outageCount: 0,
      });
      logger.error(`${this.provider}: all retries exhausted — ${lastError}`);
      return [];
    }

    if (outages.length) {
      bulkUpsertOutages(outages);
      pruneStaleOutages(this.provider, outages.map((o) => o.id));
    }

    upsertProviderStatus({
      provider: this.provider,
      providerName: this.name,
      lastFetchAt: fetchedAt,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      outageCount: outages.length,
    });

    logger.info(`${this.provider}: fetched ${outages.length} outage(s)`);
    return outages;
  }

  /**
   * Convenience wrapper around axios.get with error context.
   */
  async get(url, options = {}) {
    const res = await this.http.get(url, options);
    return res.data;
  }

  /**
   * Convenience wrapper for ArcGIS FeatureServer queries.
   * Returns the array of features from the JSON response.
   */
  async arcgisQuery(baseUrl, params = {}) {
    const defaults = {
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
      resultRecordCount: 2000,
    };
    const data = await this.get(baseUrl, { params: { ...defaults, ...params } });
    if (data.error) {
      throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`);
    }
    return data.features || [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = BaseScraper;
