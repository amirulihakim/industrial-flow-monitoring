const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DashboardController } = require('../public/js/app');

class FakeElement {
  constructor(value = '') {
    this.value = value;
    this.textContent = '';
    this.disabled = false;
    this.dataset = {};
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener));
  }
}

function createElements() {
  return {
    deviceSelect: new FakeElement('PCWP'),
    scenarioSelect: new FakeElement('normal'),
    scenarioFeedback: new FakeElement(),
    statusPanel: new FakeElement(),
    connectionState: new FakeElement(),
    connectionMessage: new FakeElement(),
    statusDevice: new FakeElement(),
    statusScenario: new FakeElement(),
    statusSource: new FakeElement(),
    statusQuality: new FakeElement(),
    statusTimestamp: new FakeElement(),
    positiveTotal: new FakeElement(),
    negativeTotal: new FakeElement(),
    netTotal: new FakeElement(),
    heatingTotal: new FakeElement(),
    coolingTotal: new FakeElement(),
    currentValues: Object.fromEntries([
      'flow_rate', 'flow_velocity', 'flow_percentage', 'instant_heat',
      'temperature_in', 'temperature_out',
    ].map((key) => [key, new FakeElement()])),
  };
}

function createState(device = 'PCWP', overrides = {}) {
  return {
    device,
    source: 'simulation',
    timestamp: '2026-01-01T00:00:01.000Z',
    scenario: 'normal',
    status: 'online',
    quality: 'good',
    measurements: {
      flow_rate: 80,
      flow_velocity: 1.2,
      flow_percentage: 70,
      instant_heat: 1.1,
      temperature_in: 28,
      temperature_out: 32,
    },
    totals: {
      positive_total: 100,
      negative_total: 4,
      heating_total: 20,
      cooling_total: 2,
    },
    ...overrides,
  };
}

function createHarness({ apiOverrides = {} } = {}) {
  const elements = createElements();
  const calls = { latest: [], scenarios: [] };
  const charts = {
    initializeCount: 0,
    resetCount: 0,
    samples: [],
    initialize() { this.initializeCount += 1; },
    reset() { this.resetCount += 1; },
    append(timestamp, measurements) { this.samples.push({ timestamp, measurements }); },
  };
  const api = {
    async getLatest(device) { calls.latest.push(device); return createState(device); },
    async setScenario(device, scenario) { calls.scenarios.push({ device, scenario }); return createState(device, { scenario }); },
    ...apiOverrides,
  };
  const timers = [];
  const clearedTimers = [];
  const controller = new DashboardController({
    api,
    charts,
    elements,
    now: () => Date.parse('2026-01-01T00:00:02.000Z'),
    setIntervalFunction(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearIntervalFunction(timer) { clearedTimers.push(timer); },
  });
  return { api, calls, charts, clearedTimers, controller, elements, timers };
}

test('one controller owns one timer and one set of listeners across device switches', async () => {
  const harness = createHarness();
  harness.controller.start();
  harness.controller.start();
  await Promise.resolve();

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.timers[0].delay, 1000);
  assert.equal(harness.elements.deviceSelect.listeners.get('change').length, 1);
  assert.equal(harness.elements.scenarioSelect.listeners.get('change').length, 1);
  assert.equal(harness.charts.initializeCount, 1);

  await harness.controller.changeDevice('SCWP2');
  assert.equal(harness.controller.selectedDevice, 'SCWP2');
  assert.equal(harness.elements.statusDevice.textContent, 'SCWP2');
  assert.equal(harness.charts.resetCount, 1);
  assert.equal(harness.timers.length, 1);
  assert.equal(harness.calls.latest.at(-1), 'SCWP2');

  harness.controller.stop();
  assert.deepEqual(harness.clearedTimers, [1]);
  assert.equal(harness.elements.deviceSelect.listeners.get('change').length, 0);
});

test('scenario switching affects only the currently selected device', async () => {
  const harness = createHarness();
  await harness.controller.changeDevice('SCWP1');
  await harness.controller.changeScenario('low_flow');

  assert.deepEqual(harness.calls.scenarios, [{ device: 'SCWP1', scenario: 'low_flow' }]);
  assert.match(harness.elements.scenarioFeedback.textContent, /applied to SCWP1/);
  assert.equal(harness.elements.scenarioSelect.disabled, false);
});

test('fault telemetry renders gaps and unavailable values rather than zeros', async () => {
  const faultState = createState('PCWP', {
    scenario: 'sensor_fault',
    status: 'fault',
    quality: 'fault',
    measurements: Object.fromEntries(['flow_rate', 'flow_velocity', 'flow_percentage', 'instant_heat', 'temperature_in', 'temperature_out'].map((key) => [key, null])),
    totals: Object.fromEntries(['positive_total', 'negative_total', 'heating_total', 'cooling_total'].map((key) => [key, null])),
  });
  const harness = createHarness({ apiOverrides: { async getLatest() { return faultState; } } });
  await harness.controller.refresh();

  assert.equal(harness.elements.statusPanel.dataset.state, 'fault');
  assert.equal(harness.elements.positiveTotal.textContent, '—');
  assert.equal(harness.elements.netTotal.textContent, '—');
  assert.ok(Object.values(harness.elements.currentValues).every((element) => element.textContent === '—'));
  assert.equal(harness.charts.samples.at(-1).measurements.flow_rate, null);
});

test('latest-state failure creates a visible disconnected/degraded state', async () => {
  const harness = createHarness({ apiOverrides: { async getLatest() { throw new Error('backend unavailable'); } } });
  await harness.controller.refresh();

  assert.equal(harness.elements.statusPanel.dataset.state, 'disconnected');
  assert.equal(harness.elements.connectionState.textContent, 'Disconnected');
  assert.match(harness.elements.connectionMessage.textContent, /backend unavailable/);
  assert.equal(harness.elements.positiveTotal.textContent, '—');
  assert.equal(harness.charts.samples.at(-1).measurements, null);
});

test('old responses cannot overwrite a newly selected device', async () => {
  let resolvePcwp;
  const pcwpPending = new Promise((resolve) => { resolvePcwp = resolve; });
  const harness = createHarness({
    apiOverrides: {
      async getLatest(device) {
        if (device === 'PCWP') return pcwpPending;
        return createState(device);
      },
    },
  });

  const oldRefresh = harness.controller.refresh();
  await harness.controller.changeDevice('SCWP2');
  resolvePcwp(createState('PCWP'));
  await oldRefresh;

  assert.equal(harness.elements.statusDevice.textContent, 'SCWP2');
  assert.equal(harness.controller.selectedDevice, 'SCWP2');
});

