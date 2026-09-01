(function exposeTelemetryFormatting(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTelemetryFormatting() {
  const TELEMETRY_DISPLAY = Object.freeze({
    flow_rate: Object.freeze({ decimals: 2, unit: 'm³/h' }),
    flow_velocity: Object.freeze({ decimals: 3, unit: 'm/s' }),
    flow_percentage: Object.freeze({ decimals: 0, unit: '%' }),
    instant_heat: Object.freeze({ decimals: 3, unit: 'GJ/h' }),
    temperature_in: Object.freeze({ decimals: 1, unit: '°C' }),
    temperature_out: Object.freeze({ decimals: 1, unit: '°C' }),
    positive_total: Object.freeze({ decimals: 3, unit: 'm³' }),
    negative_total: Object.freeze({ decimals: 3, unit: 'm³' }),
    heating_total: Object.freeze({ decimals: 3, unit: 'GJ' }),
    cooling_total: Object.freeze({ decimals: 3, unit: 'GJ' }),
  });

  function formatTelemetryValue(key, value) {
    if (!Number.isFinite(value)) return '—';
    const display = TELEMETRY_DISPLAY[key];
    if (!display) return String(value);
    return `${formatTelemetryNumber(key, value)} ${display.unit}`;
  }

  function formatTelemetryNumber(key, value) {
    if (!Number.isFinite(value)) return '—';
    const display = TELEMETRY_DISPLAY[key];
    return display ? value.toFixed(display.decimals) : String(value);
  }

  function quantizeTelemetryValue(key, value) {
    if (!Number.isFinite(value)) return null;
    const display = TELEMETRY_DISPLAY[key];
    return display ? Number(value.toFixed(display.decimals)) : value;
  }

  return { TELEMETRY_DISPLAY, formatTelemetryNumber, formatTelemetryValue, quantizeTelemetryValue };
}));
