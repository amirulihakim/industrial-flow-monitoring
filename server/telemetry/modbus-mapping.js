const fs = require('node:fs');
const path = require('node:path');
const { DEVICE_CODES, SENSOR_KEYS } = require('../simulation/constants');

const BYTE_ORDERS = Object.freeze(['big', 'little']);
const WORD_ORDERS = Object.freeze(['high_first', 'low_first']);
const DATA_TYPES = Object.freeze(['integer', 'float']);

function assertInteger(value, label, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new TypeError(`${label} must be an integer from ${minimum} to ${maximum}`);
}

function validateMapping(mapping) {
  if (!SENSOR_KEYS.includes(mapping?.sensor)) throw new TypeError(`Unknown canonical sensor: ${mapping?.sensor}`);
  assertInteger(mapping.address, `${mapping.sensor}.address`, 0, 65535);
  assertInteger(mapping.register_count, `${mapping.sensor}.register_count`, 1, 2);
  if (!DATA_TYPES.includes(mapping.data_type)) throw new TypeError(`${mapping.sensor}.data_type must be integer or float`);
  if (mapping.data_type === 'float' && mapping.register_count !== 2) throw new TypeError(`${mapping.sensor} float requires register_count=2`);
  if (mapping.data_type === 'integer' && typeof mapping.signed !== 'boolean') throw new TypeError(`${mapping.sensor}.signed must be boolean for integer data`);
  if (!BYTE_ORDERS.includes(mapping.byte_order)) throw new TypeError(`${mapping.sensor}.byte_order must be big or little`);
  if (!WORD_ORDERS.includes(mapping.word_order)) throw new TypeError(`${mapping.sensor}.word_order must be high_first or low_first`);
  if (!Number.isFinite(mapping.multiplier)) throw new TypeError(`${mapping.sensor}.multiplier must be finite`);
  if (mapping.offset !== undefined && !Number.isFinite(mapping.offset)) throw new TypeError(`${mapping.sensor}.offset must be finite when provided`);
  return Object.freeze({ ...mapping, offset: mapping.offset ?? 0 });
}

function validateModbusConfig(config) {
  if (!config || typeof config !== 'object') throw new TypeError('Modbus configuration must be an object');
  const connection = config.connection || {};
  if (typeof connection.serial_port !== 'string' || !connection.serial_port.trim()) throw new TypeError('connection.serial_port is required');
  assertInteger(connection.baud_rate, 'connection.baud_rate', 1, 4000000);
  if (!['none', 'even', 'odd'].includes(connection.parity)) throw new TypeError('connection.parity must be none, even, or odd');
  if (![7, 8].includes(connection.data_bits)) throw new TypeError('connection.data_bits must be 7 or 8');
  if (![1, 2].includes(connection.stop_bits)) throw new TypeError('connection.stop_bits must be 1 or 2');
  assertInteger(connection.polling_interval_ms, 'connection.polling_interval_ms', 250, 3600000);
  if (!Array.isArray(config.devices) || config.devices.length === 0) throw new TypeError('At least one Modbus device mapping is required');
  const seenDevices = new Set();
  const devices = config.devices.map((entry) => {
    if (!DEVICE_CODES.includes(entry?.device)) throw new TypeError(`Unsupported device: ${entry?.device}`);
    if (seenDevices.has(entry.device)) throw new TypeError(`Duplicate Modbus device: ${entry.device}`);
    seenDevices.add(entry.device);
    assertInteger(entry.unit_id, `${entry.device}.unit_id`, 1, 247);
    if (!Array.isArray(entry.mappings)) throw new TypeError(`${entry.device}.mappings must be an array`);
    const mappings = entry.mappings.map(validateMapping);
    const sensors = mappings.map(({ sensor }) => sensor);
    if (new Set(sensors).size !== sensors.length) throw new TypeError(`${entry.device} contains duplicate sensor mappings`);
    const missing = SENSOR_KEYS.filter((key) => !sensors.includes(key));
    if (missing.length > 0 || sensors.length !== SENSOR_KEYS.length) throw new TypeError(`${entry.device} must map exactly the canonical sensors; missing: ${missing.join(', ')}`);
    return Object.freeze({ device: entry.device, unit_id: entry.unit_id, mappings: Object.freeze(mappings) });
  });
  return Object.freeze({ connection: Object.freeze({ ...connection }), devices: Object.freeze(devices) });
}

function loadModbusConfig(configPath, environment = process.env) {
  if (!configPath) throw new TypeError('MODBUS_CONFIG_PATH is required when DATA_SOURCE=modbus');
  const resolvedPath = path.resolve(configPath);
  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const connection = { ...parsed.connection };
  if (environment.MODBUS_SERIAL_PORT) connection.serial_port = environment.MODBUS_SERIAL_PORT;
  if (environment.MODBUS_BAUD_RATE) connection.baud_rate = Number(environment.MODBUS_BAUD_RATE);
  if (environment.MODBUS_PARITY) connection.parity = environment.MODBUS_PARITY;
  if (environment.MODBUS_DATA_BITS) connection.data_bits = Number(environment.MODBUS_DATA_BITS);
  if (environment.MODBUS_STOP_BITS) connection.stop_bits = Number(environment.MODBUS_STOP_BITS);
  if (environment.MODBUS_POLLING_INTERVAL_MS) connection.polling_interval_ms = Number(environment.MODBUS_POLLING_INTERVAL_MS);
  if (environment.MODBUS_UNIT_ID) {
    if (parsed.devices?.length !== 1) throw new TypeError('MODBUS_UNIT_ID override requires exactly one configured device');
    parsed.devices[0].unit_id = Number(environment.MODBUS_UNIT_ID);
  }
  return validateModbusConfig({ ...parsed, connection });
}

function orderedBuffer(buffer, mapping) {
  if (!Buffer.isBuffer(buffer) || buffer.length !== mapping.register_count * 2) throw new TypeError(`${mapping.sensor} returned an unexpected register buffer length`);
  const words = Array.from({ length: mapping.register_count }, (_, index) => Buffer.from(buffer.subarray(index * 2, index * 2 + 2)));
  if (mapping.byte_order === 'little') for (const word of words) word.reverse();
  if (mapping.word_order === 'low_first') words.reverse();
  return Buffer.concat(words);
}

function decodeRegisters(buffer, mappingCandidate) {
  const mapping = validateMapping(mappingCandidate);
  const ordered = orderedBuffer(buffer, mapping);
  let raw;
  if (mapping.data_type === 'float') raw = ordered.readFloatBE(0);
  else if (mapping.register_count === 1) raw = mapping.signed ? ordered.readInt16BE(0) : ordered.readUInt16BE(0);
  else raw = mapping.signed ? ordered.readInt32BE(0) : ordered.readUInt32BE(0);
  const value = (raw * mapping.multiplier) + mapping.offset;
  if (!Number.isFinite(value)) throw new TypeError(`Decoded telemetry value must be finite: ${mapping.sensor}`);
  return value;
}

module.exports = { BYTE_ORDERS, DATA_TYPES, WORD_ORDERS, decodeRegisters, loadModbusConfig, validateMapping, validateModbusConfig };
