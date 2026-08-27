const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { SENSOR_KEYS } = require('../server/simulation/constants');
const { MqttSource, normalizeMqttMessage, topicSubscription } = require('../server/telemetry/mqtt-source');

const values = Object.fromEntries(SENSOR_KEYS.map((key, index) => [key, index + 0.5]));

test('MQTT payload normalizes a configured topic to one canonical state', () => {
  const state = normalizeMqttMessage('timah-monitoring/SCWP1/telemetry', Buffer.from(JSON.stringify({ timestamp: '2026-01-01T00:00:00Z', values })));
  assert.equal(state.device, 'SCWP1'); assert.equal(state.source, 'mqtt'); assert.equal(state.quality, 'good');
  assert.deepEqual({ ...state.measurements, ...state.totals }, values);
  assert.equal(topicSubscription('timah-monitoring/<device>/telemetry'), 'timah-monitoring/+/telemetry');
});

test('MQTT normalization rejects malformed JSON and unknown devices', () => {
  assert.throws(() => normalizeMqttMessage('timah-monitoring/PCWP/telemetry', Buffer.from('{')), /valid JSON/);
  assert.throws(() => normalizeMqttMessage('timah-monitoring/UNKNOWN/telemetry', Buffer.from(JSON.stringify({ values }))), /Unsupported device/);
});

test('MQTT normalization rejects unknown sensors and non-finite values', () => {
  const unknown = { ...values, flow_rt: 1 }; delete unknown.flow_rate;
  assert.throws(() => normalizeMqttMessage('timah-monitoring/PCWP/telemetry', Buffer.from(JSON.stringify({ values: unknown }))), /canonical sensor/);
  const invalid = { ...values, flow_rate: 'not-a-number' };
  assert.throws(() => normalizeMqttMessage('timah-monitoring/PCWP/telemetry', Buffer.from(JSON.stringify({ values: invalid }))), /must be finite/);
});

test('MQTT source failures degrade status without throwing or stopping the process', () => {
  const warnings = [];
  const source = new MqttSource({ brokerUrl: 'mqtt://unavailable', connect() { throw new Error('broker refused'); }, logger: { warn(message) { warnings.push(message); } } });
  source.start();
  assert.equal(source.getStatus().state, 'degraded'); assert.match(source.getStatus().last_error, /broker refused/); assert.match(warnings[0], /mqtt.*unavailable/);
});

test('MQTT source subscribes once and emits normalized telemetry', async () => {
  const client = new EventEmitter(); client.subscribe = (topic, callback) => { client.topic = topic; callback(); }; client.end = (_force, callback) => callback();
  const source = new MqttSource({ brokerUrl: 'mqtt://test', connect() { return client; }, logger: { warn() {} } });
  const received = []; source.on('telemetry', (state) => received.push(state)); source.start(); client.emit('connect');
  client.emit('message', 'timah-monitoring/SCWP2/telemetry', Buffer.from(JSON.stringify({ values })));
  assert.equal(client.topic, 'timah-monitoring/+/telemetry'); assert.equal(received.length, 1); assert.equal(received[0].source, 'mqtt');
  await source.stop();
});
