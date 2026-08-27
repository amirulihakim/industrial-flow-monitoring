const DEVICE_CODES = Object.freeze(['PCWP', 'SCWP1', 'SCWP2']);

const SCENARIOS = Object.freeze([
  'normal',
  'low_flow',
  'pump_stopped',
  'high_temperature',
  'sensor_fault',
]);

const MEASUREMENT_KEYS = Object.freeze([
  'flow_rate',
  'flow_velocity',
  'flow_percentage',
  'instant_heat',
  'temperature_in',
  'temperature_out',
]);

const TOTAL_KEYS = Object.freeze([
  'positive_total',
  'negative_total',
  'heating_total',
  'cooling_total',
]);

const SENSOR_KEYS = Object.freeze([...MEASUREMENT_KEYS, ...TOTAL_KEYS]);

/*
 * RECONSTRUCTION / DEMO ASSUMPTIONS
 *
 * These values exist only to create distinct, coherent synthetic device streams.
 * They are not recovered PT Timah Industri ratings, pipe dimensions, process
 * temperatures, totalizer readings, or instrument calibration values.
 *
 * flow_to_velocity_factor is a configurable demo calibration relationship:
 *   flow_velocity = flow_rate * flow_to_velocity_factor
 * It avoids claiming a historical pipe area or fluid-unit conversion.
 */
const DEVICE_CONFIGS = Object.freeze({
  PCWP: Object.freeze({
    rated_flow: 120,
    normal_flow_fraction: 0.72,
    flow_to_velocity_factor: 0.015,
    nominal_temperature_in: 28,
    nominal_temperature_delta: 4.5,
    initial_totals: Object.freeze({
      positive_total: 1000,
      negative_total: 5,
      heating_total: 120,
      cooling_total: 20,
    }),
  }),
  SCWP1: Object.freeze({
    rated_flow: 105,
    normal_flow_fraction: 0.68,
    flow_to_velocity_factor: 0.016,
    nominal_temperature_in: 27,
    nominal_temperature_delta: 3.8,
    initial_totals: Object.freeze({
      positive_total: 800,
      negative_total: 4,
      heating_total: 90,
      cooling_total: 15,
    }),
  }),
  SCWP2: Object.freeze({
    rated_flow: 110,
    normal_flow_fraction: 0.75,
    flow_to_velocity_factor: 0.0145,
    nominal_temperature_in: 29,
    nominal_temperature_delta: 4.2,
    initial_totals: Object.freeze({
      positive_total: 900,
      negative_total: 6,
      heating_total: 105,
      cooling_total: 18,
    }),
  }),
});

const MODEL_CONFIG = Object.freeze({
  low_flow_fraction: 0.24,
  high_temperature_increase: 12,
  high_temperature_delta_increase: 4,
  maximum_flow_change_fraction_per_second: 0.035,
  flow_noise_fraction: 0.0015,
  maximum_temperature_change_per_second: 0.08,
  temperature_noise: 0.015,
  maximum_delta_change_per_second: 0.06,
  temperature_delta_noise: 0.01,
  heat_demo_factor: 0.002,
  totalizer_time_divisor: 3600,
});

module.exports = {
  DEVICE_CODES,
  DEVICE_CONFIGS,
  MEASUREMENT_KEYS,
  MODEL_CONFIG,
  SCENARIOS,
  SENSOR_KEYS,
  TOTAL_KEYS,
};

