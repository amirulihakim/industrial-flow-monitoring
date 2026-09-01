const assert = require('node:assert/strict');
const { test } = require('node:test');
const { BROKER_URL, RealtimeClient, parseSnapshot } = require('../public/js/realtime');

const values = Object.freeze({ flow_rate: 80.01, flow_velocity: 1.919, flow_percentage: 72.736, instant_heat: 127.056, temperature_in: 30.48, temperature_out: 26.51, positive_total: 903.442, negative_total: 45, heating_total: 2255.512, cooling_total: 190 });
function telemetry(device, timestamp) { return Buffer.from(JSON.stringify({ device, timestamp, source: 'esp32_simulation', values })); }
function snapshot(device, rows) {
  return Buffer.from(JSON.stringify({
    device, source: 'esp32_simulation', sample_count: rows.length,
    fields: ['temperature_out', 'timestamp', 'flow_percentage', 'flow_rate', 'temperature_in', 'instant_heat', 'flow_velocity'],
    samples: rows.map((timestamp) => [26.51, timestamp, 72.736, 80.01, 30.48, 127.056, 1.919]),
  }));
}

class FakeMqttClient {
  constructor() { this.handlers = new Map(); this.subscriptions = []; this.publications = []; this.ended = false; }
  on(event, handler) { this.handlers.set(event, handler); }
  emit(event, ...args) { this.handlers.get(event)?.(...args); }
  subscribe(topic) { this.subscriptions.push(topic); }
  publish(topic, message) { this.publications.push({ topic, message }); }
  end() { this.ended = true; }
}

function harness() {
  const mqttClient = new FakeMqttClient(); const connections = [];
  const client = new RealtimeClient({ mqttLibrary: { connect(url, options) { connections.push({ url, options }); return mqttClient; } }, clientId: 'test-client' });
  client.start(); mqttClient.emit('connect');
  return { client, connections, mqttClient };
}

test('retained snapshot parsing follows the fields array', () => {
  const result = parseSnapshot(snapshot('PCWP', [1788153721]), 'amirul/timah-monitoring/PCWP/snapshot');
  assert.equal(result.samples[0].timestamp, new Date(1788153721 * 1000).toISOString());
  assert.equal(result.samples[0].measurements.flow_rate, 80.01);
  assert.equal(result.samples[0].measurements.temperature_out, 26.51);
});

test('MQTT 3.1.1 connects with browser credentials and subscribes to every snapshot and telemetry topic', () => {
  const h = harness();
  assert.equal(h.connections[0].url, BROKER_URL);
  assert.equal(h.connections[0].options.protocolVersion, 4);
  assert.equal(h.connections[0].options.username, 'timah-web');
  assert.equal(h.connections[0].options.password, 'amirulihakim');
  assert.equal(h.mqttClient.subscriptions[0].length, 6);
  assert.equal(h.mqttClient.publications.length, 0);
});

test('snapshot merges with newer live cache, deduplicates timestamps, and keeps newest 60', () => {
  const h = harness(); const batches = [];
  h.client.onBuffer((_device, samples) => batches.push(samples));
  h.mqttClient.emit('message', 'amirul/timah-monitoring/PCWP/telemetry', telemetry('PCWP', 200));
  const timestamps = [...Array(61)].map((_, index) => index + 100);
  timestamps.push(150);
  h.mqttClient.emit('message', 'amirul/timah-monitoring/PCWP/snapshot', snapshot('PCWP', timestamps));
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 60);
  assert.equal(batches[0].at(-1).unixTimestamp, 200);
  assert.equal(new Set(batches[0].map((sample) => sample.unixTimestamp)).size, 60);
  assert.ok(Number.isFinite(batches[0].at(-1).totals.positive_total), 'newer live totalizers survive snapshot merge');
});

test('device selection uses cached retained snapshot without publishing a request', () => {
  const h = harness(); const batches = [];
  h.client.onBuffer((device, samples) => batches.push({ device, samples }));
  h.mqttClient.emit('message', 'amirul/timah-monitoring/SCWP1/snapshot', snapshot('SCWP1', [10, 11, 12]));
  assert.equal(batches.length, 0, 'unselected snapshot is cached without rendering');
  h.client.selectDevice('SCWP1');
  assert.deepEqual(h.client.getSamples('SCWP1').map((sample) => sample.unixTimestamp), [10, 11, 12]);
  assert.equal(h.mqttClient.publications.length, 0);
});
