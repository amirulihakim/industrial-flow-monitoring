const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../server/app');
const { SENSOR_KEYS } = require('../server/simulation/constants');
const { SimulationEngine } = require('../server/simulation/simulator');

let server;
let baseUrl;

before(async () => {
  const simulator = new SimulationEngine({
    seed: 'api-test-seed',
    startTime: '2026-01-01T00:00:00.000Z',
  });
  server = createApp({ simulator }).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('GET /api/simulation exposes supported synthetic devices and scenarios', async () => {
  const response = await fetch(`${baseUrl}/api/simulation`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.source, 'simulation');
  assert.match(body.disclosure, /Synthetic telemetry/);
  assert.deepEqual(body.devices, ['PCWP', 'SCWP1', 'SCWP2']);
  assert.deepEqual(body.scenarios, [
    'normal',
    'low_flow',
    'pump_stopped',
    'high_temperature',
    'sensor_fault',
  ]);
});

test('latest-state API exposes coherent canonical telemetry and scenario', async () => {
  const response = await fetch(`${baseUrl}/api/devices/PCWP/latest`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.device, 'PCWP');
  assert.equal(body.source, 'simulation');
  assert.equal(body.scenario, 'normal');
  assert.deepEqual(Object.keys({ ...body.measurements, ...body.totals }), SENSOR_KEYS);
});

test('scenario API changes only synthetic device state and reports faults explicitly', async () => {
  const updateResponse = await fetch(`${baseUrl}/api/devices/SCWP1/scenario`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: 'sensor_fault' }),
  });
  const updated = await updateResponse.json();

  assert.equal(updateResponse.status, 200);
  assert.equal(updated.scenario, 'sensor_fault');
  assert.equal(updated.quality, 'fault');
  assert.ok(Object.values({ ...updated.measurements, ...updated.totals })
    .every((value) => value === null));

  const inspectResponse = await fetch(`${baseUrl}/api/devices/SCWP1/scenario`);
  assert.deepEqual(await inspectResponse.json(), {
    device: 'SCWP1',
    source: 'simulation',
    scenario: 'sensor_fault',
    status: 'fault',
    quality: 'fault',
  });
});

test('API rejects unknown devices and scenarios with bounded errors', async () => {
  const missingDevice = await fetch(`${baseUrl}/api/devices/UNKNOWN/latest`);
  assert.equal(missingDevice.status, 404);

  const badScenario = await fetch(`${baseUrl}/api/devices/PCWP/scenario`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: 'invalid' }),
  });
  assert.equal(badScenario.status, 400);
});

