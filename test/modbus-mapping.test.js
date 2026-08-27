const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SENSOR_KEYS } = require('../server/simulation/constants');
const { decodeRegisters, validateMapping, validateModbusConfig } = require('../server/telemetry/modbus-mapping');

function mapping(overrides = {}) {
  return { sensor: 'flow_rate', address: 10, register_count: 1, data_type: 'integer', signed: false, byte_order: 'big', word_order: 'high_first', multiplier: 1, offset: 0, ...overrides };
}

function config() {
  return { connection: { serial_port: 'MOCK', baud_rate: 9600, parity: 'none', data_bits: 8, stop_bits: 1, polling_interval_ms: 1000 }, devices: [{ device: 'PCWP', unit_id: 1, mappings: SENSOR_KEYS.map((sensor, index) => mapping({ sensor, address: 100 + index })) }] };
}

test('Modbus mapping validation accepts exactly the canonical sensor set', () => {
  const validated = validateModbusConfig(config());
  assert.equal(validated.devices[0].mappings.length, 10);
  assert.throws(() => validateMapping(mapping({ sensor: 'flow_rt' })), /Unknown canonical sensor/);
  const incomplete = config(); incomplete.devices[0].mappings.pop();
  assert.throws(() => validateModbusConfig(incomplete), /exactly the canonical sensors/);
});

test('16-bit signed and unsigned integers decode with scale and offset', () => {
  const signed = Buffer.alloc(2); signed.writeInt16BE(-100);
  assert.equal(decodeRegisters(signed, mapping({ signed: true, multiplier: 0.1, offset: 2 })), -8);
  const unsigned = Buffer.alloc(2); unsigned.writeUInt16BE(65000);
  assert.equal(decodeRegisters(unsigned, mapping()), 65000);
});

test('32-bit float decoding supports word-order and byte-order conversion', () => {
  const standard = Buffer.alloc(4); standard.writeFloatBE(12.5);
  assert.equal(decodeRegisters(standard, mapping({ register_count: 2, data_type: 'float' })), 12.5);
  const wordSwapped = Buffer.concat([standard.subarray(2, 4), standard.subarray(0, 2)]);
  assert.equal(decodeRegisters(wordSwapped, mapping({ register_count: 2, data_type: 'float', word_order: 'low_first', multiplier: 2 })), 25);
  const byteSwapped = Buffer.from([standard[1], standard[0], standard[3], standard[2]]);
  assert.equal(decodeRegisters(byteSwapped, mapping({ register_count: 2, data_type: 'float', byte_order: 'little' })), 12.5);
});

test('invalid mapping fields and non-finite decoded values are rejected', () => {
  assert.throws(() => validateMapping(mapping({ multiplier: Number.NaN })), /must be finite/);
  const nan = Buffer.alloc(4); nan.writeFloatBE(Number.NaN);
  assert.throws(() => decodeRegisters(nan, mapping({ register_count: 2, data_type: 'float' })), /must be finite/);
});
