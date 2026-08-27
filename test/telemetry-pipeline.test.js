const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SimulationEngine } = require('../server/simulation/simulator');
const { SimulationSource } = require('../server/telemetry/simulation-source');
const { TelemetryPipeline } = require('../server/telemetry/telemetry-pipeline');

test('simulation source remains deterministic, emits all devices, and owns one timer', async () => {
  const timers = []; const cleared = []; const simulator = new SimulationEngine({ seed: 'source-test', startTime: '2026-01-01T00:00:00Z' });
  const source = new SimulationSource({ simulator, setIntervalFunction(callback, delay) { timers.push({ callback, delay }); return 9; }, clearIntervalFunction(id) { cleared.push(id); } });
  const states = []; source.on('telemetry', (state) => states.push(state)); source.start(); source.start();
  assert.equal(timers.length, 1); assert.equal(states.length, 3); assert.ok(states.every((state) => state.source === 'simulation')); assert.equal(source.getStatus().state, 'connected');
  await source.stop(); assert.deepEqual(cleared, [9]);
});

test('normalized pipeline fans one coherent state to persistence consumers', () => {
  const accepted = []; const pipeline = new TelemetryPipeline({ logger: { warn() {} } }); pipeline.on('telemetry', (state) => accepted.push(state));
  const state = new SimulationEngine({ startTime: '2026-01-01T00:00:00Z' }).step('PCWP');
  assert.equal(pipeline.accept(state).device, 'PCWP'); assert.equal(accepted.length, 1); assert.equal(pipeline.getLatest('PCWP').source, 'simulation');
});
