const assert = require('node:assert/strict');
const { test } = require('node:test');
const { RealtimeClient } = require('../public/js/realtime');

class FakeSocket {
  static instances = [];
  constructor(url) { this.url = url; this.listeners = new Map(); this.closed = false; FakeSocket.instances.push(this); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  emit(type, event = {}) { this.listeners.get(type)?.(event); }
  close() { this.closed = true; }
}

test('one realtime client creates one connection and delivers coherent messages', () => {
  FakeSocket.instances.length = 0;
  const client = new RealtimeClient({ WebSocketConstructor: FakeSocket, locationObject: { protocol: 'http:', host: 'localhost:3000' } });
  const received = []; client.onTelemetry((state) => received.push(state));
  client.start(); client.start();
  assert.equal(FakeSocket.instances.length, 1); assert.equal(FakeSocket.instances[0].url, 'ws://localhost:3000/realtime');
  const state = { type: 'telemetry', device: 'PCWP', source: 'simulation', measurements: { flow_rate: 1 } };
  FakeSocket.instances[0].emit('message', { data: JSON.stringify(state) });
  assert.deepEqual(received, [state]); assert.deepEqual(client.getLatest('PCWP'), state);
  client.stop(); assert.equal(FakeSocket.instances[0].closed, true);
});

test('realtime client reconnects with bounded exponential backoff', () => {
  FakeSocket.instances.length = 0; const scheduled = [];
  const client = new RealtimeClient({ WebSocketConstructor: FakeSocket, locationObject: { protocol: 'https:', host: 'example.test' }, minimumBackoffMs: 100, maximumBackoffMs: 250, setTimeoutFunction(callback, delay) { scheduled.push({ callback, delay }); return scheduled.length; }, clearTimeoutFunction() {} });
  client.start(); FakeSocket.instances[0].emit('close');
  assert.equal(scheduled[0].delay, 100); scheduled[0].callback(); assert.equal(FakeSocket.instances.length, 2);
  FakeSocket.instances[1].emit('close'); assert.equal(scheduled[1].delay, 200); scheduled[1].callback();
  FakeSocket.instances[2].emit('close'); assert.equal(scheduled[2].delay, 250);
  client.stop();
});
