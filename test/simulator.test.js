const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  DEVICE_CODES,
  MEASUREMENT_KEYS,
  SENSOR_KEYS,
  TOTAL_KEYS,
} = require('../server/simulation/constants');
const { SimulationEngine } = require('../server/simulation/simulator');

const FIXED_OPTIONS = Object.freeze({
  seed: 'deterministic-test-seed',
  startTime: '2026-01-01T00:00:00.000Z',
});

function allValues(state) {
  return { ...state.measurements, ...state.totals };
}

test('all supported devices generate finite normal telemetry with canonical keys only', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);

  assert.deepEqual(simulator.listDevices(), DEVICE_CODES);

  for (const device of DEVICE_CODES) {
    const state = simulator.step(device);
    const values = allValues(state);

    assert.equal(state.device, device);
    assert.equal(state.source, 'simulation');
    assert.equal(state.scenario, 'normal');
    assert.equal(state.status, 'online');
    assert.equal(state.quality, 'good');
    assert.deepEqual(Object.keys(state.measurements), MEASUREMENT_KEYS);
    assert.deepEqual(Object.keys(state.totals), TOTAL_KEYS);
    assert.deepEqual(Object.keys(values), SENSOR_KEYS);
    assert.ok(Object.values(values).every(Number.isFinite));
  }
});

test('identical seed, start time, and steps produce identical states', () => {
  const first = new SimulationEngine(FIXED_OPTIONS);
  const second = new SimulationEngine(FIXED_OPTIONS);

  first.setScenario('SCWP1', 'high_temperature');
  second.setScenario('SCWP1', 'high_temperature');

  for (let index = 0; index < 20; index += 1) {
    assert.deepEqual(first.step('SCWP1', 0.5), second.step('SCWP1', 0.5));
  }
});

test('pump_stopped decays flow and dependent values toward zero', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  const before = simulator.getCurrentState('PCWP');
  simulator.setScenario('PCWP', 'pump_stopped');

  const firstStoppedStep = simulator.step('PCWP');
  assert.ok(firstStoppedStep.measurements.flow_rate < before.measurements.flow_rate);

  let stopped = firstStoppedStep;
  for (let index = 0; index < 60; index += 1) {
    stopped = simulator.step('PCWP');
  }

  assert.ok(stopped.measurements.flow_rate < before.measurements.flow_rate * 0.05);
  assert.ok(stopped.measurements.flow_velocity < before.measurements.flow_velocity * 0.05);
  assert.ok(stopped.measurements.flow_percentage < before.measurements.flow_percentage * 0.05);
  assert.ok(stopped.measurements.instant_heat < before.measurements.instant_heat * 0.05);
});

test('low_flow settles into a persistent condition below normal flow', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  const normalFlow = simulator.getCurrentState('SCWP1').measurements.flow_rate;
  simulator.setScenario('SCWP1', 'low_flow');

  let lowFlow;
  for (let index = 0; index < 40; index += 1) {
    lowFlow = simulator.step('SCWP1');
  }

  assert.ok(lowFlow.measurements.flow_rate < normalFlow * 0.5);

  const subsequent = simulator.step('SCWP1');
  assert.ok(subsequent.measurements.flow_rate < normalFlow * 0.5);
});

test('high_temperature produces a gradual coherent temperature excursion', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  const normal = simulator.getCurrentState('SCWP2');
  simulator.setScenario('SCWP2', 'high_temperature');

  const first = simulator.step('SCWP2');
  assert.ok(first.measurements.temperature_in > normal.measurements.temperature_in);
  assert.ok(first.measurements.temperature_in - normal.measurements.temperature_in < 0.2);

  let hot = first;
  for (let index = 0; index < 80; index += 1) {
    hot = simulator.step('SCWP2');
  }

  assert.ok(hot.measurements.temperature_in > normal.measurements.temperature_in + 5);
  assert.ok(hot.measurements.temperature_out > hot.measurements.temperature_in);
  assert.ok(hot.measurements.instant_heat > normal.measurements.instant_heat);
});

test('sensor_fault exposes explicit fault state and unavailable values', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  const fault = simulator.setScenario('PCWP', 'sensor_fault');

  assert.equal(fault.scenario, 'sensor_fault');
  assert.equal(fault.status, 'fault');
  assert.equal(fault.quality, 'fault');
  assert.deepEqual(Object.keys(allValues(fault)), SENSOR_KEYS);
  assert.ok(Object.values(allValues(fault)).every((value) => value === null));
});

test('positive totalizer never decreases during normal forward flow', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  let previous = simulator.getCurrentState('PCWP').totals.positive_total;

  for (let index = 0; index < 120; index += 1) {
    const current = simulator.step('PCWP').totals.positive_total;
    assert.ok(current >= previous);
    previous = current;
  }
});

test('flow_percentage is consistently derived from flow_rate and rated_flow', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  simulator.setScenario('SCWP2', 'low_flow');

  for (let index = 0; index < 25; index += 1) {
    const state = simulator.step('SCWP2');
    const { rated_flow: ratedFlow } = simulator.getConfiguration('SCWP2');
    const expected = (state.measurements.flow_rate / ratedFlow) * 100;
    assert.ok(Math.abs(state.measurements.flow_percentage - expected) < 0.00001);
  }
});

test('stepping or changing one device does not mutate another device', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);
  const untouchedBefore = simulator.getCurrentState('SCWP1');

  simulator.setScenario('PCWP', 'pump_stopped');
  for (let index = 0; index < 30; index += 1) simulator.step('PCWP');

  assert.deepEqual(simulator.getCurrentState('SCWP1'), untouchedBefore);
  assert.equal(simulator.getCurrentState('PCWP').scenario, 'pump_stopped');
  assert.equal(simulator.getCurrentState('SCWP1').scenario, 'normal');
});

test('unsupported inputs and invalid elapsed time are rejected', () => {
  const simulator = new SimulationEngine(FIXED_OPTIONS);

  assert.throws(() => simulator.getCurrentState('UNKNOWN'), /Unsupported device/);
  assert.throws(() => simulator.setScenario('PCWP', 'unknown'), /Unsupported scenario/);
  assert.throws(() => simulator.step('PCWP', 0), /elapsedSeconds/);
});

