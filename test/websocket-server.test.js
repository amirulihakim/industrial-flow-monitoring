const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');
const { RealtimeWebSocketServer } = require('../server/realtime/websocket-server');
const { SimulationEngine } = require('../server/simulation/simulator');
const { TelemetryPipeline } = require('../server/telemetry/telemetry-pipeline');

test('WebSocket server broadcasts one coherent canonical device state', async () => {
  const server = http.createServer((_request, response) => response.end('ok'));
  const pipeline = new TelemetryPipeline({ logger: { warn() {} } });
  const realtime = new RealtimeWebSocketServer({ server, pipeline, logger: { error() {} } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const client = new WebSocket(`ws://127.0.0.1:${server.address().port}/realtime`); await once(client, 'open');
  const telemetry = new Promise((resolve) => client.on('message', (data) => { const message = JSON.parse(data); if (message.type === 'telemetry') resolve(message); }));
  pipeline.accept(new SimulationEngine({ startTime: '2026-01-01T00:00:00Z' }).step('PCWP'));
  const message = await telemetry;
  assert.equal(message.device, 'PCWP'); assert.equal(message.source, 'simulation'); assert.equal(Object.keys(message.measurements).length, 6); assert.equal(Object.keys(message.totals).length, 4);
  client.close(); await once(client, 'close'); await realtime.stop(); await new Promise((resolve) => server.close(resolve));
});
