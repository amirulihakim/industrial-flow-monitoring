const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SENSOR_KEYS } = require('../server/simulation/constants');
const { ModbusSource } = require('../server/telemetry/modbus-source');
const { createTelemetrySource } = require('../server/telemetry/source-factory');
const { TelemetryPipeline } = require('../server/telemetry/telemetry-pipeline');

function mapping(sensor, index) { return { sensor, address: 100 + index, register_count: 1, data_type: 'integer', signed: false, byte_order: 'big', word_order: 'high_first', multiplier: 0.5, offset: 1 }; }
function config() { return { connection: { serial_port: 'MOCK', baud_rate: 19200, parity: 'even', data_bits: 8, stop_bits: 1, polling_interval_ms: 1000 }, devices: [{ device: 'SCWP1', unit_id: 7, mappings: SENSOR_KEYS.map(mapping) }] }; }

test('Modbus source normalizes a complete mock transport poll into the shared pipeline', async () => {
  const client = { unitIds: [], async connectRTUBuffered(port, options) { this.connection = { port, options }; }, setID(id) { this.unitIds.push(id); }, async readHoldingRegisters(address) { return { data: [address] }; }, close() {} };
  const source = new ModbusSource({ config: config(), clientFactory: () => client, now: () => new Date('2026-01-01T00:00:00Z'), logger: { warn() {} } });
  const pipeline = new TelemetryPipeline({ logger: { warn() {} } }); source.on('telemetry', (state) => pipeline.accept(state));
  assert.equal(await source.pollOnce(), true);
  const state = pipeline.getLatest('SCWP1');
  assert.equal(state.source, 'modbus'); assert.equal(state.quality, 'good'); assert.equal(state.measurements.flow_rate, 51); assert.equal(state.totals.cooling_total, 55.5);
  assert.deepEqual(client.unitIds, [7]); assert.equal(source.getStatus().state, 'connected'); await source.stop();
});

test('Modbus connection failure produces degraded status without throwing', async () => {
  const warnings = [];
  const source = new ModbusSource({ config: config(), clientFactory: () => ({ async connectRTUBuffered() { throw new Error('serial unavailable'); }, close() {} }), logger: { warn(message) { warnings.push(message); } } });
  assert.equal(await source.pollOnce(), false); assert.equal(source.getStatus().state, 'degraded'); assert.match(source.getStatus().last_error, /serial unavailable/); assert.match(warnings[0], /modbus.*unavailable/);
});

test('invalid or missing Modbus configuration creates a degraded source instead of crashing startup', () => {
  const warnings = [];
  const source = createTelemetrySource({ environment: { DATA_SOURCE: 'modbus' }, logger: { warn(message) { warnings.push(message); } } });
  source.start(); assert.equal(source.getStatus().state, 'degraded'); assert.match(source.getStatus().last_error, /MODBUS_CONFIG_PATH/); assert.equal(warnings.length, 1);
});
