const assert = require('node:assert/strict');
const { test } = require('node:test');
const { LIVE_SERIES, RollingSeries } = require('../public/js/charts');

test('live chart definitions use exactly the six canonical measurement keys', () => {
  assert.deepEqual(LIVE_SERIES.map(({ key }) => key), [
    'flow_rate',
    'flow_velocity',
    'flow_percentage',
    'instant_heat',
    'temperature_in',
    'temperature_out',
  ]);
});

test('rolling series stays bounded and retains null as a chart gap', () => {
  const series = new RollingSeries(60);

  for (let index = 0; index < 75; index += 1) {
    series.append(`sample-${index}`, index === 74 ? null : index);
  }

  assert.equal(series.labels.length, 60);
  assert.equal(series.values.length, 60);
  assert.equal(series.labels[0], 'sample-15');
  assert.equal(series.values.at(-1), null);

  series.reset();
  assert.deepEqual(series.labels, []);
  assert.deepEqual(series.values, []);
});

