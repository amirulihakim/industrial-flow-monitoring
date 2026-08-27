const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TelemetryRepository } = require('../server/persistence/telemetry-repository');

function createPool() {
  const calls = [];
  return {
    calls,
    async query(sql, parameters) {
      calls.push({ method: 'query', sql, parameters });
      return [[{ result: 1 }]];
    },
    async execute(sql, parameters) {
      calls.push({ method: 'execute', sql, parameters });
      if (/SELECT id, code/.test(sql)) {
        return [[
          { id: 1, code: 'PCWP' },
          { id: 2, code: 'SCWP1' },
          { id: 3, code: 'SCWP2' },
        ]];
      }
      return [{ affectedRows: parameters.length / 7 }];
    },
  };
}

test('repository seeds and maps all three canonical devices with parameters', async () => {
  const pool = createPool();
  const repository = new TelemetryRepository(pool);
  await repository.initialize();

  const seedCalls = pool.calls.filter((call) => /INSERT INTO devices/.test(call.sql));
  assert.equal(seedCalls.length, 3);
  assert.deepEqual(seedCalls.map((call) => call.parameters), [
    ['PCWP', 'PCWP', true],
    ['SCWP1', 'SCWP1', true],
    ['SCWP2', 'SCWP2', true],
  ]);
  assert.ok(seedCalls.every((call) => /VALUES \(\?, \?, \?\)/.test(call.sql)));
});

test('repository bulk insert uses placeholders and separate parameter values', async () => {
  const pool = createPool();
  const repository = new TelemetryRepository(pool);
  await repository.initialize();

  await repository.insertReadings([{
    device: 'PCWP',
    sensorType: 'flow_rate',
    value: 42.5,
    recordedAt: '2026-01-01 00:00:00.000',
    quality: 'good',
    source: 'simulation',
    remark: null,
  }]);

  const insert = pool.calls.at(-1);
  assert.equal(insert.method, 'execute');
  assert.match(insert.sql, /INSERT INTO sensor_readings/);
  assert.match(insert.sql, /VALUES \(\?, \?, \?, \?, \?, \?, \?\)/);
  assert.doesNotMatch(insert.sql, /flow_rate|42\.5|simulation/);
  assert.deepEqual(insert.parameters, [
    1, 'flow_rate', 42.5, '2026-01-01 00:00:00.000', 'good', 'simulation', null,
  ]);
});

