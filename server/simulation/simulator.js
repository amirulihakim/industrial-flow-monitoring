const {
  DEVICE_CODES,
  DEVICE_CONFIGS,
  MEASUREMENT_KEYS,
  MODEL_CONFIG,
  SCENARIOS,
  SENSOR_KEYS,
  TOTAL_KEYS,
} = require('./constants');
const { createSeededRandom } = require('./random');

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function approach(current, target, maximumChange) {
  return current + clamp(target - current, -maximumChange, maximumChange);
}

function round(value, decimalPlaces = 6) {
  const multiplier = 10 ** decimalPlaces;
  return Math.round(value * multiplier) / multiplier;
}

function validateElapsedSeconds(elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    throw new RangeError('elapsedSeconds must be a finite number greater than zero');
  }
}

class SimulationEngine {
  constructor(options = {}) {
    const {
      seed = 'industrial-flow-monitoring-demo',
      startTime = new Date(),
      deviceConfigs = DEVICE_CONFIGS,
      modelConfig = MODEL_CONFIG,
    } = options;

    const parsedStartTime = new Date(startTime);
    if (Number.isNaN(parsedStartTime.getTime())) {
      throw new TypeError('startTime must be a valid date');
    }

    this.deviceConfigs = deviceConfigs;
    this.modelConfig = modelConfig;
    this.states = new Map();

    for (const device of DEVICE_CODES) {
      const config = deviceConfigs[device];
      if (!config) throw new Error(`Missing simulation configuration for ${device}`);

      const normalFlow = config.rated_flow * config.normal_flow_fraction;
      this.states.set(device, {
        scenario: 'normal',
        quality: 'good',
        status: 'online',
        timestampMs: parsedStartTime.getTime(),
        random: createSeededRandom(`${seed}:${device}`),
        flowRate: normalFlow,
        temperatureIn: config.nominal_temperature_in,
        temperatureDelta: config.nominal_temperature_delta,
        totals: { ...config.initial_totals },
      });
    }
  }

  listDevices() {
    return [...DEVICE_CODES];
  }

  listScenarios() {
    return [...SCENARIOS];
  }

  getConfiguration(device) {
    this.#requireDevice(device);
    return this.deviceConfigs[device];
  }

  setScenario(device, scenario) {
    const state = this.#requireDevice(device);
    if (!SCENARIOS.includes(scenario)) {
      throw new RangeError(`Unsupported scenario: ${scenario}`);
    }

    state.scenario = scenario;
    state.quality = scenario === 'sensor_fault' ? 'fault' : 'good';
    state.status = scenario === 'sensor_fault' ? 'fault' : 'online';
    return this.getCurrentState(device);
  }

  step(device, elapsedSeconds = 1) {
    validateElapsedSeconds(elapsedSeconds);
    const state = this.#requireDevice(device);
    const config = this.deviceConfigs[device];
    const model = this.modelConfig;
    const targets = this.#scenarioTargets(state.scenario, config);

    const maximumFlowChange = config.rated_flow
      * model.maximum_flow_change_fraction_per_second
      * elapsedSeconds;
    const flowNoise = this.#symmetricNoise(state.random)
      * config.rated_flow
      * model.flow_noise_fraction;

    state.flowRate = clamp(
      approach(state.flowRate, targets.flowRate, maximumFlowChange) + flowNoise,
      0,
      config.rated_flow,
    );

    state.temperatureIn = approach(
      state.temperatureIn,
      targets.temperatureIn,
      model.maximum_temperature_change_per_second * elapsedSeconds,
    ) + this.#symmetricNoise(state.random) * model.temperature_noise;

    state.temperatureDelta = Math.max(0, approach(
      state.temperatureDelta,
      targets.temperatureDelta,
      model.maximum_delta_change_per_second * elapsedSeconds,
    ) + this.#symmetricNoise(state.random) * model.temperature_delta_noise);

    const heat = state.flowRate * state.temperatureDelta * model.heat_demo_factor;
    const integrationScale = elapsedSeconds / model.totalizer_time_divisor;

    state.totals.positive_total += Math.max(state.flowRate, 0) * integrationScale;
    state.totals.negative_total += Math.max(-state.flowRate, 0) * integrationScale;
    state.totals.heating_total += Math.max(heat, 0) * integrationScale;
    state.totals.cooling_total += Math.max(-heat, 0) * integrationScale;
    state.timestampMs += elapsedSeconds * 1000;

    return this.getCurrentState(device);
  }

  stepAll(elapsedSeconds = 1) {
    return Object.fromEntries(
      DEVICE_CODES.map((device) => [device, this.step(device, elapsedSeconds)]),
    );
  }

  getCurrentState(device) {
    const state = this.#requireDevice(device);
    const config = this.deviceConfigs[device];

    if (state.quality === 'fault') {
      return {
        device,
        source: 'simulation',
        timestamp: new Date(state.timestampMs).toISOString(),
        scenario: state.scenario,
        status: state.status,
        quality: state.quality,
        measurements: Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, null])),
        totals: Object.fromEntries(TOTAL_KEYS.map((key) => [key, null])),
      };
    }

    const temperatureOut = state.temperatureIn + state.temperatureDelta;
    const flowPercentage = clamp((state.flowRate / config.rated_flow) * 100, 0, 100);
    const flowVelocity = state.flowRate * config.flow_to_velocity_factor;
    const instantHeat = state.flowRate
      * state.temperatureDelta
      * this.modelConfig.heat_demo_factor;

    return {
      device,
      source: 'simulation',
      timestamp: new Date(state.timestampMs).toISOString(),
      scenario: state.scenario,
      status: state.status,
      quality: state.quality,
      measurements: {
        flow_rate: round(state.flowRate),
        flow_velocity: round(flowVelocity),
        flow_percentage: round(flowPercentage),
        instant_heat: round(instantHeat),
        temperature_in: round(state.temperatureIn),
        temperature_out: round(temperatureOut),
      },
      totals: Object.fromEntries(
        TOTAL_KEYS.map((key) => [key, round(state.totals[key])]),
      ),
    };
  }

  #scenarioTargets(scenario, config) {
    const normalFlow = config.rated_flow * config.normal_flow_fraction;
    const targets = {
      flowRate: normalFlow,
      temperatureIn: config.nominal_temperature_in,
      temperatureDelta: config.nominal_temperature_delta,
    };

    if (scenario === 'low_flow') {
      targets.flowRate = config.rated_flow * this.modelConfig.low_flow_fraction;
    } else if (scenario === 'pump_stopped') {
      targets.flowRate = 0;
      targets.temperatureDelta = 0;
    } else if (scenario === 'high_temperature') {
      targets.temperatureIn += this.modelConfig.high_temperature_increase;
      targets.temperatureDelta += this.modelConfig.high_temperature_delta_increase;
    }

    return targets;
  }

  #symmetricNoise(random) {
    return (random() * 2) - 1;
  }

  #requireDevice(device) {
    if (!this.states.has(device)) {
      throw new RangeError(`Unsupported device: ${device}`);
    }
    return this.states.get(device);
  }
}

module.exports = {
  SENSOR_KEYS,
  SimulationEngine,
};

