const assert = require('node:assert/strict');
const { test } = require('node:test');
const { formatTelemetryValue } = require('../public/js/format');

test('telemetry display formatting applies canonical precision and units', () => {
  assert.equal(formatTelemetryValue('temperature_in', 11), '11.0 °C');
  assert.equal(formatTelemetryValue('temperature_out', 11.04), '11.0 °C');
  assert.equal(formatTelemetryValue('flow_rate', 27.037), '27.04 m³/h');
  assert.equal(formatTelemetryValue('flow_velocity', 0.9564), '0.956 m/s');
  assert.equal(formatTelemetryValue('flow_percentage', 72.736), '73 %');
  assert.equal(formatTelemetryValue('instant_heat', 0.40667), '0.407 GJ/h');
  assert.equal(formatTelemetryValue('heating_total', 0), '0.000 GJ');
  assert.equal(formatTelemetryValue('cooling_total', 190), '190.000 GJ');
  assert.equal(formatTelemetryValue('flow_rate', null), '—');
});
