const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SENSOR_KEYS } = require('../server/simulation/constants');
const { SimulationEngine } = require('../server/simulation/simulator');
const {
  normalizeTelemetryState,
  toMysqlDateTime,
} = require('../server/persistence/normalize-telemetry');

function createNormalState() {
  const simulator = new SimulationEngine({
    seed: 'persistence-test',
    startTime: '2026-01-01T00:00:00.000Z',
  });
  return simulator.step('PCWP');
}

test('UTC timestamps convert explicitly to MySQL DATETIME(3)', () => {
  assert.equal(
    toMysqlDateTime('2026-08-27T19:34:56.789+07:00'),
    '2026-08-27 12:34:56.789',
  );
  assert.throws(() => toMysqlDateTime('invalid'), /valid ISO 8601/);
});

test('normal simulation state becomes ten canonical simulation rows', () => {
  const rows = normalizeTelemetryState(createNormalState());

  assert.equal(rows.length, 10);
  assert.deepEqual(rows.map((row) => row.sensorType), SENSOR_KEYS);
  assert.ok(rows.every((row) => row.device === 'PCWP'));
  assert.ok(rows.every((row) => row.source === 'simulation'));
  assert.ok(rows.every((row) => row.quality === 'good'));
  assert.ok(rows.every((row) => Number.isFinite(row.value)));
  assert.ok(rows.every((row) => row.recordedAt === '2026-01-01 00:00:01.000'));
});

test('unknown or missing sensor identifiers are rejected before persistence', () => {
  const state = createNormalState();
  state.measurements.flow_rt = state.measurements.flow_rate;
  delete state.measurements.flow_rate;

  assert.throws(() => normalizeTelemetryState(state), /exactly the canonical/);
});

test('fault/null telemetry is represented live but produces no database rows', () => {
  const simulator = new SimulationEngine({ startTime: '2026-01-01T00:00:00.000Z' });
  const state = simulator.setScenario('SCWP1', 'sensor_fault');

  assert.deepEqual(normalizeTelemetryState(state), []);
});

test('non-simulation and non-finite telemetry are rejected', () => {
  const wrongSource = createNormalState();
  wrongSource.source = 'unknown';
  assert.throws(() => normalizeTelemetryState(wrongSource), /simulation source only/);

  const invalidValue = createNormalState();
  invalidValue.measurements.flow_rate = Number.NaN;
  assert.throws(() => normalizeTelemetryState(invalidValue), /must be finite/);
});

