const { DEVICE_CODES, MEASUREMENT_KEYS, SENSOR_KEYS, TOTAL_KEYS } = require('../simulation/constants');
const { ALLOWED_QUALITY, assertCanonicalKeys } = require('../persistence/normalize-telemetry');

function normalizeDeviceState(state) {
  if (!DEVICE_CODES.includes(state?.device)) throw new TypeError(`Unsupported device: ${state?.device}`);
  if (!['simulation', 'mqtt', 'modbus'].includes(state.source)) throw new TypeError(`Unsupported telemetry source: ${state.source}`);
  if (!ALLOWED_QUALITY.includes(state.quality)) throw new TypeError(`Unsupported quality: ${state.quality}`);
  const timestamp = new Date(state.timestamp);
  if (Number.isNaN(timestamp.getTime())) throw new TypeError('Telemetry timestamp must be valid ISO 8601');
  const values = { ...state.measurements, ...state.totals };
  assertCanonicalKeys(values);
  const fault = state.quality === 'fault';
  for (const key of SENSOR_KEYS) {
    if (!(Number.isFinite(values[key]) || (fault && values[key] === null))) {
      throw new TypeError(`Telemetry value must be finite: ${key}`);
    }
  }
  return {
    device: state.device,
    source: state.source,
    timestamp: timestamp.toISOString(),
    scenario: state.source === 'simulation' ? state.scenario : null,
    status: state.status || (fault ? 'fault' : 'online'),
    quality: state.quality,
    measurements: Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, values[key]])),
    totals: Object.fromEntries(TOTAL_KEYS.map((key) => [key, values[key]])),
  };
}

module.exports = { normalizeDeviceState };
