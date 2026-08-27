const {
  DEVICE_CODES,
  SENSOR_KEYS,
} = require('../simulation/constants');

const ALLOWED_QUALITY = Object.freeze(['good', 'stale', 'fault', 'simulated', 'unknown']);

function toMysqlDateTime(isoTimestamp) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) throw new TypeError('Telemetry timestamp must be valid ISO 8601');
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function assertCanonicalKeys(values) {
  const keys = Object.keys(values).sort();
  const expected = [...SENSOR_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError('Telemetry must contain exactly the canonical sensor identifiers');
  }
}

function normalizeTelemetryState(state) {
  if (!DEVICE_CODES.includes(state?.device)) throw new TypeError(`Unsupported device: ${state?.device}`);
  if (!['simulation', 'mqtt'].includes(state.source)) throw new TypeError(`Unsupported telemetry source: ${state.source}`);
  if (!ALLOWED_QUALITY.includes(state.quality)) throw new TypeError(`Unsupported quality: ${state.quality}`);

  const values = { ...state.measurements, ...state.totals };
  assertCanonicalKeys(values);
  const recordedAt = toMysqlDateTime(state.timestamp);

  if (state.quality === 'fault') {
    if (!Object.values(values).every((value) => value === null)) {
      throw new TypeError('Fault telemetry must use null values rather than fabricated measurements');
    }
    return [];
  }

  return SENSOR_KEYS.map((sensorType) => {
    const value = values[sensorType];
    if (!Number.isFinite(value)) throw new TypeError(`Telemetry value must be finite: ${sensorType}`);
    return {
      device: state.device,
      sensorType,
      value,
      recordedAt,
      quality: state.quality,
      source: state.source,
      remark: null,
    };
  });
}

module.exports = {
  ALLOWED_QUALITY,
  assertCanonicalKeys,
  normalizeTelemetryState,
  toMysqlDateTime,
};
