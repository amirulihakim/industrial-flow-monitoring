const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DashboardCharts, LIVE_SERIES, RollingSeries, computeYAxisBounds, computeYAxisTickStep, shouldShowTimestampTick } = require('../public/js/charts');

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

test('buffer replacement performs one non-animated update per chart', () => {
  const instances = [];
  class FakeChart {
    constructor(_canvas, config) { this.config = config; this.options = config.options; this.updates = []; instances.push(this); }
    update(mode) { this.updates.push(mode); }
  }
  const charts = new DashboardCharts({ ChartConstructor: FakeChart, documentObject: { getElementById() { return {}; } } });
  charts.initialize();
  const samples = Array.from({ length: 60 }, (_, index) => ({ timestamp: new Date(index * 1000).toISOString(), measurements: Object.fromEntries(LIVE_SERIES.map(({ key }) => [key, index + 1])) }));

  charts.replace(samples);

  assert.equal(instances.length, 6);
  assert.ok(instances.every((chart) => chart.updates.length === 1 && chart.updates[0] === 'none'));
  assert.ok([...charts.series.values()].every((series) => series.values.length === 60 && series.values[0] === 1));
  assert.ok(instances.every((chart) => chart.config.options.scales.x.grid.display === true));
  assert.equal(instances[0].config.options.plugins.tooltip.callbacks.label({ parsed: { y: 27.037 } }), '27.04 m³/h');
  assert.equal(instances[0].config.options.plugins.tooltip.callbacks.title([{ label: '12:52:34 AM' }]), '12:52:34 AM');
  assert.equal(instances[0].config.options.scales.y.ticks.callback(27.037), '27.04');
  const xTicks = instances[0].config.options.scales.x.ticks;
  const tickContext = { getLabelForValue: (value) => `time-${value}` };
  assert.equal(xTicks.autoSkip, false);
  assert.equal(xTicks.minRotation, 0);
  assert.equal(xTicks.maxRotation, 0);
  assert.equal(xTicks.callback.call(tickContext, 0, 0, [{}, {}]), '');
  assert.equal(xTicks.callback.call(tickContext, 59, 5, [{}, {}, {}, {}, {}, {}]), 'Now');
  assert.equal(instances[0].config.options.scales.y.grace, undefined);
  assert.equal(instances[0].config.options.scales.y.min, -6.08);
  assert.equal(instances[0].config.options.scales.y.max, 67.08);
  assert.ok(instances.every((chart) => chart.options.scales.y.min < 1 && chart.options.scales.y.max > 60));
});

test('flat low-precision series uses distinct formatted y-axis ticks', () => {
  const instances = [];
  class FakeChart {
    constructor(_canvas, config) { this.options = config.options; this.updates = []; instances.push(this); }
    update(mode) { this.updates.push(mode); }
  }
  const charts = new DashboardCharts({ ChartConstructor: FakeChart, documentObject: { getElementById() { return {}; } } });
  charts.initialize();
  const samples = Array.from({ length: 60 }, (_, index) => ({ timestamp: new Date(index * 1000).toISOString(), measurements: { flow_percentage: 19 } }));

  charts.replace(samples);

  const percentageChart = instances[2];
  const { min, max, ticks } = percentageChart.options.scales.y;
  assert.ok(min < 19 && max > 19);
  assert.equal(ticks.stepSize, 1);
  const labels = [18, 19, 20].map((value) => ticks.callback(value));
  assert.deepEqual(labels, ['18', '19', '20']);
  assert.equal(new Set(labels).size, labels.length);
});

test('computed y-axis bounds pad ranged and flat visible data', () => {
  const ranged = computeYAxisBounds([14.8, 14.9, 15]);
  assert.ok(Math.abs(ranged.min - 14.776) < Number.EPSILON * 16);
  assert.ok(Math.abs(ranged.max - 15.024) < Number.EPSILON * 16);
  const flat = computeYAxisBounds([15, 15]);
  assert.ok(flat.min < 15);
  assert.ok(flat.max > 15);
  assert.equal(computeYAxisBounds([null, Number.NaN, undefined]), null);
  assert.equal(computeYAxisTickStep({ min: 14.776, max: 15.024 }, 1), 0.1);
});

test('current-value colors reuse their chart series colors', () => {
  class FakeChart { constructor(_canvas, config) { this.options = config.options; } update() {} }
  const elements = new Map(LIVE_SERIES.flatMap((series) => [[series.canvasId, {}], [series.valueId, { style: {} }]]));
  const charts = new DashboardCharts({ ChartConstructor: FakeChart, documentObject: { getElementById(id) { return elements.get(id); } } });
  charts.initialize();
  for (const series of LIVE_SERIES) assert.equal(elements.get(series.valueId).style.color, series.color);
});

test('timestamp thinning always preserves the newest label without removing samples', () => {
  const visible = Array.from({ length: 60 }, (_, index) => shouldShowTimestampTick(index, 60));
  assert.equal(visible.at(-1), true);
  assert.equal(visible[0], false);
  assert.ok(visible.filter(Boolean).length <= 6);
});

test('chart-facing values are quantized without mutating source telemetry', () => {
  class FakeChart { constructor(_canvas, config) { this.options = config.options; } update() {} }
  const charts = new DashboardCharts({ ChartConstructor: FakeChart, documentObject: { getElementById() { return {}; } } });
  charts.initialize();
  const measurements = { flow_rate: 27.037, flow_velocity: 0.9564, flow_percentage: 72.736, instant_heat: 0.40667, temperature_in: 11.034, temperature_out: 12.06 };

  charts.append('2026-01-01T00:00:00.000Z', measurements);

  assert.deepEqual(Object.fromEntries([...charts.series].map(([key, series]) => [key, series.values[0]])), { flow_rate: 27.04, flow_velocity: 0.956, flow_percentage: 73, instant_heat: 0.407, temperature_in: 11, temperature_out: 12.1 });
  assert.deepEqual(measurements, { flow_rate: 27.037, flow_velocity: 0.9564, flow_percentage: 72.736, instant_heat: 0.40667, temperature_in: 11.034, temperature_out: 12.06 });
});
