const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DashboardController } = require('../public/js/app');

class FakeElement {
  constructor(value = '') { this.value = value; this.textContent = ''; this.disabled = false; this.dataset = {}; this.listeners = new Map(); }
  addEventListener(type, listener) { this.listeners.set(type, [...(this.listeners.get(type) || []), listener]); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener)); }
}

function createElements() {
  const elements = Object.fromEntries(['scenarioFeedback', 'statusPanel', 'connectionState', 'connectionMessage', 'statusDevice', 'statusScenario', 'statusSource', 'statusQuality', 'statusTimestamp', 'positiveTotal', 'negativeTotal', 'netTotal', 'heatingTotal', 'coolingTotal', 'sourceBannerTitle', 'sourceBannerText'].map((key) => [key, new FakeElement()]));
  elements.deviceSelect = new FakeElement('PCWP'); elements.scenarioSelect = new FakeElement('normal');
  elements.currentValues = Object.fromEntries(['flow_rate', 'flow_velocity', 'flow_percentage', 'instant_heat', 'temperature_in', 'temperature_out'].map((key) => [key, new FakeElement()]));
  return elements;
}

function createState(device = 'PCWP', overrides = {}) {
  return { device, source: 'simulation', timestamp: '2026-01-01T00:00:01.000Z', scenario: 'normal', status: 'online', quality: 'good', measurements: { flow_rate: 80, flow_velocity: 1.2, flow_percentage: 70, instant_heat: 1.1, temperature_in: 28, temperature_out: 32 }, totals: { positive_total: 100, negative_total: 4, heating_total: 20, cooling_total: 2 }, ...overrides };
}

function createHarness() {
  const elements = createElements(); const calls = { scenarios: [] };
  const charts = { initializeCount: 0, resetCount: 0, samples: [], initialize() { this.initializeCount += 1; }, reset() { this.resetCount += 1; }, append(timestamp, measurements) { this.samples.push({ timestamp, measurements }); } };
  const realtime = { starts: 0, stops: 0, telemetry: new Set(), statuses: new Set(), latest: new Map(), start() { this.starts += 1; }, stop() { this.stops += 1; }, onTelemetry(listener) { this.telemetry.add(listener); return () => this.telemetry.delete(listener); }, onStatus(listener) { this.statuses.add(listener); return () => this.statuses.delete(listener); }, getLatest(device) { return this.latest.get(device) || null; }, emit(state) { this.latest.set(state.device, state); for (const listener of this.telemetry) listener(state); }, emitStatus(status) { for (const listener of this.statuses) listener(status); } };
  const api = { async getLatest(device) { return createState(device); }, async setScenario(device, scenario) { calls.scenarios.push({ device, scenario }); return createState(device, { scenario }); } };
  const timers = []; const cleared = []; let nowMs = Date.parse('2026-01-01T00:00:02.000Z');
  const controller = new DashboardController({ api, realtime, charts, elements, now: () => nowMs, setIntervalFunction(callback, delay) { timers.push({ callback, delay }); return 1; }, clearIntervalFunction(id) { cleared.push(id); } });
  return { calls, charts, cleared, controller, elements, realtime, timers, advanceTime(milliseconds) { nowMs += milliseconds; } };
}

test('one controller owns one WebSocket client and one listener set across device switches', () => {
  const h = createHarness(); h.controller.start(); h.controller.start();
  assert.equal(h.realtime.starts, 1); assert.equal(h.realtime.telemetry.size, 1); assert.equal(h.realtime.statuses.size, 1);
  assert.equal(h.timers.length, 1); assert.equal(h.timers[0].delay, 1000);
  h.controller.changeDevice('SCWP2');
  assert.equal(h.controller.selectedDevice, 'SCWP2'); assert.equal(h.charts.resetCount, 1); assert.equal(h.realtime.starts, 1);
  h.controller.stop(); assert.equal(h.realtime.stops, 1); assert.equal(h.realtime.telemetry.size, 0); assert.deepEqual(h.cleared, [1]);
});

test('realtime state updates without latest-state polling', () => {
  const h = createHarness(); h.controller.start(); h.realtime.emit(createState('PCWP'));
  assert.equal(h.elements.statusDevice.textContent, 'PCWP'); assert.equal(h.elements.statusPanel.dataset.state, 'online'); assert.equal(h.charts.samples.length, 1);
});

test('scenario switching affects only the selected simulation device', async () => {
  const h = createHarness(); h.controller.changeDevice('SCWP1'); await h.controller.changeScenario('low_flow');
  assert.deepEqual(h.calls.scenarios, [{ device: 'SCWP1', scenario: 'low_flow' }]); assert.match(h.elements.scenarioFeedback.textContent, /SCWP1/);
});

test('fault telemetry renders chart gaps and unavailable values', () => {
  const h = createHarness(); const nulls = Object.fromEntries(['flow_rate', 'flow_velocity', 'flow_percentage', 'instant_heat', 'temperature_in', 'temperature_out'].map((key) => [key, null]));
  h.controller.handleTelemetry(createState('PCWP', { scenario: 'sensor_fault', status: 'fault', quality: 'fault', measurements: nulls, totals: { positive_total: null, negative_total: null, heating_total: null, cooling_total: null } }));
  assert.equal(h.elements.statusPanel.dataset.state, 'fault'); assert.equal(h.elements.positiveTotal.textContent, '—'); assert.equal(h.charts.samples.at(-1).measurements.flow_rate, null);
});

test('disconnected and stale realtime states are visible', () => {
  const h = createHarness(); h.controller.start(); h.realtime.emitStatus({ state: 'disconnected', message: 'socket closed' });
  assert.equal(h.elements.statusPanel.dataset.state, 'disconnected'); assert.match(h.elements.connectionMessage.textContent, /socket closed/);
  h.realtime.emit(createState('PCWP', { timestamp: '2025-12-31T23:59:00.000Z' }));
  assert.equal(h.elements.statusPanel.dataset.state, 'online', 'a newly received sample is live even if its source clock is behind');
  h.advanceTime(5001); h.controller.checkStale();
  assert.equal(h.elements.statusPanel.dataset.state, 'stale');
});

test('old-device realtime events cannot overwrite the newly selected device', () => {
  const h = createHarness(); h.controller.changeDevice('SCWP2'); h.controller.handleTelemetry(createState('PCWP'));
  assert.equal(h.elements.statusDevice.textContent, 'SCWP2'); assert.equal(h.charts.samples.length, 0);
  h.controller.handleTelemetry(createState('SCWP2')); assert.equal(h.charts.samples.length, 1);
});
