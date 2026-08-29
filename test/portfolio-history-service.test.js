const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SUPPORTED_RANGES } = require('../server/history/aggregation-policy');
const { HistoryUnavailableError, HistoryValidationError } = require('../server/history/history-service');
const { PortfolioHistoryService, SyntheticHistoryService } = require('../server/history/portfolio-history-service');

const fixedNow = () => new Date('2026-08-29T12:00:00.000Z');

test('synthetic portfolio history supports every range with bounded canonical points', async () => {
  const service = new SyntheticHistoryService({ seed: 'fallback-test', now: fixedNow });
  for (const range of SUPPORTED_RANGES) {
    const result = await service.getHistory({ device: 'PCWP', sensor: 'flow_rate', range });
    assert.equal(result.source, 'simulation');
    assert.equal(result.fallback, true);
    assert.match(result.aggregation, /^synthetic_/);
    assert.ok(result.points.length > 0 && result.points.length <= 1000);
    assert.ok(result.points.every((point) => Number.isFinite(point.value) && !Number.isNaN(Date.parse(point.timestamp))));
  }
});

test('synthetic portfolio history is deterministic for the same seed and clock', async () => {
  const request = { device: 'SCWP2', sensor: 'temperature_out', range: '1d' };
  const first = await new SyntheticHistoryService({ seed: 'same', now: fixedNow }).getHistory(request);
  const second = await new SyntheticHistoryService({ seed: 'same', now: fixedNow }).getHistory(request);
  assert.deepEqual(first, second);
});

test('portfolio service falls back only when MySQL history is unavailable', async () => {
  const fallback = new SyntheticHistoryService({ now: fixedNow });
  const unavailable = new PortfolioHistoryService({ async getHistory() { throw new HistoryUnavailableError(); } }, fallback);
  assert.equal((await unavailable.getHistory({ device: 'PCWP', sensor: 'flow_rate', range: '1h' })).fallback, true);

  const empty = { device: 'PCWP', sensor: 'flow_rate', range: '1h', aggregation: '10s_avg', points: [] };
  const available = new PortfolioHistoryService({ async getHistory() { return empty; } }, fallback);
  assert.equal(await available.getHistory({}), empty);

  const invalid = new PortfolioHistoryService({ async getHistory() { throw new HistoryValidationError('bad'); } }, fallback);
  await assert.rejects(invalid.getHistory({}), HistoryValidationError);
});
