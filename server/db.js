const mysql = require('mysql2/promise');

const DEFAULT_PERSISTENCE_INTERVAL_MS = 10000;
const MINIMUM_PERSISTENCE_INTERVAL_MS = 1000;

function parsePort(value) {
  const port = Number.parseInt(value ?? '3306', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('DB_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function parsePersistenceInterval(value) {
  const interval = Number.parseInt(value ?? String(DEFAULT_PERSISTENCE_INTERVAL_MS), 10);
  if (!Number.isInteger(interval) || interval < MINIMUM_PERSISTENCE_INTERVAL_MS) {
    throw new RangeError(`PERSISTENCE_INTERVAL_MS must be at least ${MINIMUM_PERSISTENCE_INTERVAL_MS}`);
  }
  return interval;
}

function readDatabaseConfig(environment = process.env) {
  const missing = ['DB_HOST', 'DB_USER', 'DB_NAME']
    .filter((key) => !environment[key]?.trim());

  return {
    enabled: missing.length === 0,
    missing,
    host: environment.DB_HOST?.trim(),
    port: parsePort(environment.DB_PORT),
    user: environment.DB_USER?.trim(),
    password: environment.DB_PASSWORD ?? '',
    database: environment.DB_NAME?.trim(),
    persistenceIntervalMs: parsePersistenceInterval(environment.PERSISTENCE_INTERVAL_MS),
  };
}

function createDatabasePool(config) {
  if (!config.enabled) {
    throw new Error(`Database configuration incomplete: ${config.missing.join(', ')}`);
  }

  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    timezone: 'Z',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
}

module.exports = {
  DEFAULT_PERSISTENCE_INTERVAL_MS,
  MINIMUM_PERSISTENCE_INTERVAL_MS,
  createDatabasePool,
  parsePersistenceInterval,
  readDatabaseConfig,
};

