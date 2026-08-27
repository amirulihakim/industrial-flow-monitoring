const { createDatabasePool, readDatabaseConfig } = require('../db');
const { PersistenceRunner } = require('./persistence-runner');
const { TelemetryRepository } = require('./telemetry-repository');

function createUnavailableRuntime(config, logger, reason) {
  const message = reason ?? `Database configuration incomplete: ${config.missing.join(', ')}`;
  logger.warn(`[persistence] degraded: ${message}`);
  return {
    start() {},
    async stop() {},
    getStatus() {
      return {
        state: 'degraded',
        interval_ms: config.persistenceIntervalMs,
        last_success_at: null,
        last_error: message,
      };
    },
  };
}

function createPersistenceRuntime({ simulator, environment = process.env, logger = console }) {
  let config;
  try {
    config = readDatabaseConfig(environment);
  } catch (error) {
    return createUnavailableRuntime(
      { persistenceIntervalMs: null, missing: [] },
      logger,
      `Invalid persistence configuration: ${error.message}`,
    );
  }
  if (!config.enabled) return createUnavailableRuntime(config, logger);

  let pool;
  try {
    pool = createDatabasePool(config);
  } catch (error) {
    return createUnavailableRuntime(config, logger, `Database adapter unavailable: ${error.message}`);
  }
  const repository = new TelemetryRepository(pool);
  const runner = new PersistenceRunner({
    simulator,
    repository,
    intervalMs: config.persistenceIntervalMs,
    logger,
  });

  return {
    start() { runner.start(); },
    async stop() { runner.stop(); await pool.end(); },
    getStatus() { return runner.getStatus(); },
  };
}

module.exports = { createPersistenceRuntime, createUnavailableRuntime };
