const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PersistenceRunner } = require('../server/persistence/persistence-runner');
const { SimulationEngine } = require('../server/simulation/simulator');

function createSimulator() {
  return new SimulationEngine({
    seed: 'runner-test',
    startTime: '2026-01-01T00:00:00.000Z',
  });
}

test('runner owns one timer and prevents overlapping persistence cycles', async () => {
  let releaseInsert;
  const pendingInsert = new Promise((resolve) => { releaseInsert = resolve; });
  const repository = {
    initializeCalls: 0,
    insertCalls: 0,
    async initialize() { this.initializeCalls += 1; },
    async insertReadings() { this.insertCalls += 1; await pendingInsert; },
  };
  const timers = [];
  const cleared = [];
  const runner = new PersistenceRunner({
    simulator: createSimulator(),
    repository,
    intervalMs: 10000,
    logger: { error() {} },
    setIntervalFunction(callback, delay) { timers.push({ callback, delay }); return 7; },
    clearIntervalFunction(timer) { cleared.push(timer); },
  });

  runner.start();
  runner.start();
  await Promise.resolve();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 10000);
  assert.equal(await runner.runOnce(), false);

  releaseInsert();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(repository.insertCalls, 1);
  runner.stop();
  assert.deepEqual(cleared, [7]);
});

test('database failure degrades persistence without throwing or stopping simulation', async () => {
  const simulator = createSimulator();
  const before = simulator.getCurrentState('PCWP');
  const messages = [];
  const runner = new PersistenceRunner({
    simulator,
    repository: {
      async initialize() { throw new Error('database offline'); },
      async insertReadings() { throw new Error('must not run'); },
    },
    intervalMs: 10000,
    logger: { error(message) { messages.push(message); } },
  });

  assert.equal(await runner.runOnce(), false);
  assert.equal(runner.getStatus().state, 'degraded');
  assert.match(runner.getStatus().last_error, /database offline/);
  assert.match(messages[0], /persistence.*database offline/);

  const live = simulator.step('PCWP');
  assert.equal(live.device, 'PCWP');
  assert.ok(live.measurements.flow_rate !== before.measurements.flow_rate);
});

test('successful persistence writes three devices times ten canonical readings', async () => {
  const captured = [];
  const runner = new PersistenceRunner({
    simulator: createSimulator(),
    repository: {
      async initialize() {},
      async insertReadings(readings) { captured.push(...readings); },
    },
    intervalMs: 5000,
    now: () => new Date('2026-01-01T00:01:00.000Z'),
  });

  assert.equal(await runner.runOnce(), true);
  assert.equal(captured.length, 30);
  assert.ok(captured.every((reading) => reading.source === 'simulation'));
  assert.equal(runner.getStatus().state, 'connected');
  assert.equal(runner.getStatus().last_success_at, '2026-01-01T00:01:00.000Z');
});

