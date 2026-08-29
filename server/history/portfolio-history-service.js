const { DEVICE_CODES, SENSOR_KEYS } = require('../simulation/constants');
const { SimulationEngine } = require('../simulation/simulator');
const { RANGE_POLICIES, SUPPORTED_RANGES } = require('./aggregation-policy');
const { HistoryUnavailableError, HistoryValidationError } = require('./history-service');

const ALL_FALLBACK_POLICY = Object.freeze({
  rangeSeconds: 2 * 365 * 24 * 60 * 60,
  bucketSeconds: 24 * 60 * 60,
  aggregation: 'synthetic_1d_sample',
});

class SyntheticHistoryService {
  constructor({ seed = 'portfolio-history-fallback', now = () => new Date(Math.floor(Date.now() / 60000) * 60000) } = {}) {
    this.seed = seed;
    this.now = now;
  }

  async getHistory({ device, sensor, range }) {
    if (!DEVICE_CODES.includes(device)) throw new HistoryValidationError(`Unsupported device: ${device}`, 404);
    if (!SENSOR_KEYS.includes(sensor)) throw new HistoryValidationError(`Unsupported sensor: ${sensor}`);
    if (!SUPPORTED_RANGES.includes(range)) throw new HistoryValidationError(`Unsupported range: ${range}`);
    const fixed = RANGE_POLICIES[range];
    const policy = fixed
      ? { ...fixed, aggregation: `synthetic_${fixed.aggregation.replace('_avg', '_sample')}` }
      : ALL_FALLBACK_POLICY;
    const end = this.now();
    const startMs = end.getTime() - (policy.rangeSeconds * 1000);
    const simulator = new SimulationEngine({ seed: this.seed, startTime: new Date(startMs) });
    const pointCount = Math.min(1000, Math.ceil(policy.rangeSeconds / policy.bucketSeconds));
    const points = [];
    for (let index = 0; index < pointCount; index += 1) {
      const state = simulator.step(device, policy.bucketSeconds);
      const values = { ...state.measurements, ...state.totals };
      points.push({ timestamp: state.timestamp, value: values[sensor] });
    }
    return {
      device,
      sensor,
      range,
      aggregation: policy.aggregation,
      source: 'simulation',
      fallback: true,
      notice: 'Synthetic portfolio history shown because MySQL persistence is unavailable.',
      points,
    };
  }
}

class PortfolioHistoryService {
  constructor(primary, fallback = new SyntheticHistoryService()) { this.primary = primary; this.fallback = fallback; }
  async getHistory(request) {
    try { return await this.primary.getHistory(request); }
    catch (error) {
      if (!(error instanceof HistoryUnavailableError)) throw error;
      return this.fallback.getHistory(request);
    }
  }
}

module.exports = { ALL_FALLBACK_POLICY, PortfolioHistoryService, SyntheticHistoryService };
