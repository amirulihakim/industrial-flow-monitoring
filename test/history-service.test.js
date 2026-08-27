const assert = require('node:assert/strict');
const { test } = require('node:test');
const { HistoryService, HistoryUnavailableError, HistoryValidationError, asUtcIso } = require('../server/history/history-service');
const { SUPPORTED_RANGES } = require('../server/history/aggregation-policy');

function repository(overrides = {}) {
  return {
    async findBounds() { return { minimumTimestamp: null, maximumTimestamp: null }; },
    async findAggregated() { return []; },
    ...overrides,
  };
}

test('history service validates device, canonical sensor, and range before querying', async () => {
  const service = new HistoryService(repository());
  await assert.rejects(service.getHistory({ device: 'UNKNOWN', sensor: 'flow_rate', range: '1h' }), (error) => error instanceof HistoryValidationError && error.statusCode === 404);
  await assert.rejects(service.getHistory({ device: 'PCWP', sensor: 'flow_rt', range: '1h' }), HistoryValidationError);
  await assert.rejects(service.getHistory({ device: 'PCWP', sensor: 'flow_rate', range: 'hour' }), HistoryValidationError);
});

test('history service returns a clean no-data result with aggregation metadata', async () => {
  const result = await new HistoryService(repository()).getHistory({ device: 'PCWP', sensor: 'flow_rate', range: '1h' });
  assert.deepEqual(result, { device: 'PCWP', sensor: 'flow_rate', range: '1h', aggregation: '10s_avg', points: [] });
});

test('history service accepts every supported range', async () => {
  const service = new HistoryService(repository());
  for (const range of SUPPORTED_RANGES) {
    const result = await service.getHistory({ device: 'PCWP', sensor: 'flow_rate', range });
    assert.equal(result.range, range);
    assert.equal(result.points.length, 0);
    assert.ok(result.aggregation);
  }
});

test('history service converts database UTC values and enforces the result bound', async () => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({ bucket_time: new Date(index * 1000), average_value: String(index / 2) }));
  const result = await new HistoryService(repository({ async findAggregated() { return rows; } })).getHistory({ device: 'SCWP1', sensor: 'temperature_in', range: '8h' });
  assert.equal(result.points.length, 1000);
  assert.deepEqual(result.points[1], { timestamp: '1970-01-01T00:00:01.000Z', value: 0.5 });
  assert.equal(asUtcIso('2026-08-27 12:34:56.789'), '2026-08-27T12:34:56.789Z');
});

test('all range queries bounds before selecting adaptive aggregation', async () => {
  const calls = [];
  const service = new HistoryService(repository({
    async findBounds(device, sensor) { calls.push({ device, sensor }); return { minimumTimestamp: '2026-01-01T00:00:00Z', maximumTimestamp: '2026-01-02T00:00:00Z' }; },
    async findAggregated(options) { calls.push(options); return []; },
  }));
  const result = await service.getHistory({ device: 'SCWP2', sensor: 'heating_total', range: 'all' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].limit, 1000);
  assert.equal(calls[1].rangeSeconds, null);
  assert.match(result.aggregation, /^adaptive_/);
});

test('database errors become a clean unavailable error', async () => {
  const service = new HistoryService(repository({ async findAggregated() { throw new Error('ECONNREFUSED'); } }));
  await assert.rejects(service.getHistory({ device: 'PCWP', sensor: 'flow_rate', range: '1d' }), HistoryUnavailableError);
});
