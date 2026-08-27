const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../server/app');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('GET /health returns the Milestone 3 health contract', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'industrial-flow-monitoring',
    milestone: 3,
  });
});

test('GET / serves the unified reconstruction dashboard', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /Industrial Flowmeter Monitoring/);
  assert.match(body, /2026 reconstruction/i);
  assert.match(body, /Synthetic telemetry for portfolio demonstration/i);
});

test('GET /styles.css serves the dashboard stylesheet', async () => {
  const response = await fetch(`${baseUrl}/styles.css`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/css/);
  assert.match(await response.text(), /\.dashboard-shell/);
});

test('GET /vendor/chart.js serves the single pinned Chart.js build', async () => {
  const response = await fetch(`${baseUrl}/vendor/chart.js`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.match(body, /Chart\.js v4\.4\.7/);
});

test('the one dashboard page contains all supported devices and six chart canvases', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  for (const device of ['PCWP', 'SCWP1', 'SCWP2']) {
    assert.match(body, new RegExp(`<option value="${device}">${device}</option>`));
  }
  assert.equal((body.match(/<canvas /g) || []).length, 6);
  assert.doesNotMatch(body, /login|profile|account/i);
});
