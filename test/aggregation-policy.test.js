const assert = require('node:assert/strict');
const { test } = require('node:test');
const { MAX_HISTORY_POINTS, RANGE_POLICIES, SUPPORTED_RANGES, adaptivePolicy } = require('../server/history/aggregation-policy');

test('all supported fixed ranges select the documented bounded aggregation', () => {
  assert.deepEqual(SUPPORTED_RANGES, ['1h', '8h', '1d', '7d', '1mo', '1y', 'all']);
  assert.deepEqual(Object.fromEntries(Object.entries(RANGE_POLICIES).map(([range, policy]) => [range, policy.aggregation])), {
    '1h': '10s_avg', '8h': '1m_avg', '1d': '5m_avg', '7d': '30m_avg', '1mo': '2h_avg', '1y': '1d_avg',
  });
  for (const policy of Object.values(RANGE_POLICIES)) assert.ok(Math.ceil(policy.rangeSeconds / policy.bucketSeconds) <= MAX_HISTORY_POINTS);
});

test('all-history aggregation adapts its bucket to the stored span', () => {
  const policy = adaptivePolicy('2025-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  assert.ok(Math.ceil((365 * 24 * 60 * 60) / policy.bucketSeconds) <= MAX_HISTORY_POINTS);
  assert.match(policy.aggregation, /^adaptive_\d+s_avg$/);
});
