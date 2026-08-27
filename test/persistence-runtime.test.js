const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createPersistenceRuntime } = require('../server/persistence/runtime');
const { SimulationEngine } = require('../server/simulation/simulator');

test('missing database configuration exposes degraded status without throwing', async () => {
  const warnings = [];
  const runtime = createPersistenceRuntime({
    simulator: new SimulationEngine(),
    environment: {},
    logger: { warn(message) { warnings.push(message); } },
  });

  runtime.start();
  assert.equal(runtime.getStatus().state, 'degraded');
  assert.match(runtime.getStatus().last_error, /DB_HOST, DB_USER, DB_NAME/);
  assert.match(warnings[0], /persistence.*degraded/);
  await runtime.stop();
});

test('invalid database configuration also degrades instead of stopping startup', () => {
  const runtime = createPersistenceRuntime({
    simulator: new SimulationEngine(),
    environment: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 'invalid',
      DB_USER: 'test',
      DB_NAME: 'test',
    },
    logger: { warn() {} },
  });

  assert.equal(runtime.getStatus().state, 'degraded');
  assert.match(runtime.getStatus().last_error, /Invalid persistence configuration/);
});

