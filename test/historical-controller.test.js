const assert = require('node:assert/strict');
const { test } = require('node:test');
const { HistoricalController } = require('../public/js/history');

class FakeElement {
  constructor(value = '') { this.value = value; this.textContent = ''; this.disabled = false; this.hidden = false; this.dataset = {}; this.attributes = {}; this.listeners = new Map(); }
  addEventListener(type, listener) { this.listeners.set(type, [...(this.listeners.get(type) || []), listener]); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener)); }
  setAttribute(key, value) { this.attributes[key] = value; }
}

function harness(apiOverride) {
  const elements = {
    liveButton: new FakeElement(), historyButton: new FakeElement(), liveView: new FakeElement(), historyView: new FakeElement(),
    deviceSelect: new FakeElement('PCWP'), sensorSelect: new FakeElement('flow_rate'), rangeSelect: new FakeElement('1h'),
    resolution: new FakeElement(), state: new FakeElement(),
  };
  const calls = [];
  const api = apiOverride || { async getHistory(device, sensor, range) { calls.push({ device, sensor, range }); return { device, sensor, range, aggregation: '10s_avg', points: [{ timestamp: '2026-01-01T00:00:00Z', value: 4 }] }; } };
  const chart = { renders: [], render(points, sensor) { this.renders.push({ points, sensor }); } };
  return { calls, chart, controller: new HistoricalController({ api, chart, elements }), elements };
}

test('historical controls bind once, switch views, and query the current selection', async () => {
  const h = harness();
  h.controller.start(); h.controller.start();
  assert.equal(h.elements.deviceSelect.listeners.get('change').length, 1);
  await h.controller.showView('history');
  assert.equal(h.elements.liveView.hidden, true);
  assert.equal(h.elements.historyView.hidden, false);
  assert.deepEqual(h.calls[0], { device: 'PCWP', sensor: 'flow_rate', range: '1h' });
  assert.equal(h.chart.renders[0].points.length, 1);
  assert.match(h.elements.resolution.textContent, /10s_avg/);
});

test('no-data and database-unavailable states are visible', async () => {
  const empty = harness({ async getHistory() { return { sensor: 'flow_rate', aggregation: '10s_avg', points: [] }; } });
  await empty.controller.load();
  assert.equal(empty.elements.state.dataset.state, 'empty');
  assert.match(empty.elements.state.textContent, /No historical data/);

  const unavailable = harness({ async getHistory() { const error = new Error('down'); error.status = 503; throw error; } });
  await unavailable.controller.load();
  assert.equal(unavailable.elements.state.dataset.state, 'unavailable');
  assert.match(unavailable.elements.state.textContent, /database is unavailable/i);
  assert.deepEqual(unavailable.chart.renders[0].points, []);
});

test('control state is restored after request failure', async () => {
  const h = harness({ async getHistory() { throw new Error('bad request'); } });
  await h.controller.load();
  assert.ok([h.elements.deviceSelect, h.elements.sensorSelect, h.elements.rangeSelect].every((element) => element.disabled === false));
  assert.match(h.elements.state.textContent, /bad request/);
});
