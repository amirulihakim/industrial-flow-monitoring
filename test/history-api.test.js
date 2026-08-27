const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../server/app');
const { HistoryService } = require('../server/history/history-service');

let server;
let baseUrl;

before(async () => {
  const historyService = new HistoryService({
    async findBounds() { return { minimumTimestamp: null, maximumTimestamp: null }; },
    async findAggregated() { return []; },
  });
  server = createApp({ historyService }).listen(0);
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test('historical API returns a clean empty payload and aggregation', async () => {
  const response = await fetch(`${baseUrl}/api/devices/PCWP/history?sensor=flow_rate&range=1h`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { device: 'PCWP', sensor: 'flow_rate', range: '1h', aggregation: '10s_avg', points: [] });
});

test('historical API rejects invalid devices and sensors', async () => {
  assert.equal((await fetch(`${baseUrl}/api/devices/UNKNOWN/history?sensor=flow_rate&range=1h`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/devices/PCWP/history?sensor=flow_rt&range=1h`)).status, 400);
});

test('historical API reports database unavailable without affecting the process', async () => {
  const unavailableServer = createApp().listen(0);
  await new Promise((resolve) => unavailableServer.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${unavailableServer.address().port}/api/devices/PCWP/history?sensor=flow_rate&range=1h`);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, 'PERSISTENCE_UNAVAILABLE');
  const liveResponse = await fetch(`http://127.0.0.1:${unavailableServer.address().port}/api/devices/PCWP/latest`);
  assert.equal(liveResponse.status, 200);
  await new Promise((resolve, reject) => unavailableServer.close((error) => error ? reject(error) : resolve()));
});
