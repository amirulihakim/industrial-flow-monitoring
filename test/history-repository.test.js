const assert = require('node:assert/strict');
const { test } = require('node:test');
const { HistoryRepository } = require('../server/history/history-repository');

test('history repository uses parameterized device, sensor, range, bucket, and limit values', async () => {
  const calls = [];
  const pool = { async execute(sql, parameters) { calls.push({ sql, parameters }); return [[], []]; } };
  await new HistoryRepository(pool).findAggregated({ device: 'PCWP', sensor: 'flow_rate', rangeSeconds: 3600, bucketSeconds: 10, limit: 1000 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /AVG\(r\.value\)/);
  assert.match(calls[0].sql, /INTERVAL \? SECOND/);
  assert.match(calls[0].sql, /LIMIT \?/);
  assert.doesNotMatch(calls[0].sql, /PCWP|flow_rate|3600/);
  assert.deepEqual(calls[0].parameters, [10, 10, 'PCWP', true, 'flow_rate', 3600, 1000]);
});

test('all-history bounds query and aggregation remain parameterized and omit an unbounded raw query', async () => {
  const calls = [];
  const pool = { async execute(sql, parameters) { calls.push({ sql, parameters }); return [[{ minimum_time: null, maximum_time: null }], []]; } };
  const repository = new HistoryRepository(pool);
  await repository.findBounds('SCWP2', 'temperature_out');
  await repository.findAggregated({ device: 'SCWP2', sensor: 'temperature_out', rangeSeconds: null, bucketSeconds: 60, limit: 1000 });
  assert.deepEqual(calls[0].parameters, ['SCWP2', true, 'temperature_out']);
  assert.deepEqual(calls[1].parameters, [60, 60, 'SCWP2', true, 'temperature_out', 1000]);
  assert.match(calls[1].sql, /GROUP BY bucket_time/);
  assert.doesNotMatch(calls[1].sql, /DATE_SUB/);
});
