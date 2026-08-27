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

test('GET /health returns the Milestone 1 health contract', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'industrial-flow-monitoring',
    milestone: 1,
  });
});

test('GET / serves the reconstruction placeholder', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /Industrial Flow Monitoring/);
  assert.match(body, /2026 reconstruction \/ refactor/i);
  assert.match(body, /not\s+connected to PT Timah Industri infrastructure/i);
});

test('GET /styles.css serves the placeholder stylesheet', async () => {
  const response = await fetch(`${baseUrl}/styles.css`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/css/);
  assert.match(await response.text(), /\.shell/);
});
