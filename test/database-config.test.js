const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  parsePersistenceInterval,
  readDatabaseConfig,
} = require('../server/db');

test('database configuration reads all required environment values explicitly', () => {
  const config = readDatabaseConfig({
    DB_HOST: 'db.local',
    DB_PORT: '3307',
    DB_USER: 'monitor',
    DB_PASSWORD: 'test-only',
    DB_NAME: 'flow_test',
    PERSISTENCE_INTERVAL_MS: '15000',
  });

  assert.deepEqual(config, {
    enabled: true,
    missing: [],
    host: 'db.local',
    port: 3307,
    user: 'monitor',
    password: 'test-only',
    database: 'flow_test',
    persistenceIntervalMs: 15000,
  });
});

test('missing connection settings disable persistence without inventing credentials', () => {
  const config = readDatabaseConfig({});

  assert.equal(config.enabled, false);
  assert.deepEqual(config.missing, ['DB_HOST', 'DB_USER', 'DB_NAME']);
  assert.equal(config.password, '');
});

test('persistence interval is bounded', () => {
  assert.equal(parsePersistenceInterval(undefined), 10000);
  assert.throws(() => parsePersistenceInterval('999'), /at least 1000/);
  assert.throws(() => parsePersistenceInterval('not-a-number'), /at least 1000/);
});

