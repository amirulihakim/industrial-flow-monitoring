const { DEVICE_CODES, SENSOR_KEYS } = require('../simulation/constants');
const { MAX_HISTORY_POINTS, SUPPORTED_RANGES, adaptivePolicy, fixedPolicy } = require('./aggregation-policy');

class HistoryValidationError extends Error {
  constructor(message, statusCode = 400) { super(message); this.name = 'HistoryValidationError'; this.statusCode = statusCode; }
}

class HistoryUnavailableError extends Error {
  constructor(message = 'Historical persistence is unavailable.') { super(message); this.name = 'HistoryUnavailableError'; }
}

function asUtcIso(value) {
  if (value instanceof Date) return value.toISOString();
  const normalized = String(value).includes('T') ? String(value) : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid database timestamp: ${value}`);
  return date.toISOString();
}

class HistoryService {
  constructor(repository) { this.repository = repository; }

  async getHistory({ device, sensor, range }) {
    if (!DEVICE_CODES.includes(device)) throw new HistoryValidationError(`Unsupported device: ${device}`, 404);
    if (!SENSOR_KEYS.includes(sensor)) throw new HistoryValidationError(`Unsupported sensor: ${sensor}`);
    if (!SUPPORTED_RANGES.includes(range)) throw new HistoryValidationError(`Unsupported range: ${range}`);

    try {
      let policy = fixedPolicy(range);
      if (range === 'all') {
        const bounds = await this.repository.findBounds(device, sensor);
        policy = adaptivePolicy(bounds.minimumTimestamp, bounds.maximumTimestamp);
      }
      const rows = await this.repository.findAggregated({
        device, sensor, rangeSeconds: policy.rangeSeconds,
        bucketSeconds: policy.bucketSeconds, limit: MAX_HISTORY_POINTS,
      });
      return {
        device, sensor, range, aggregation: policy.aggregation,
        points: rows.slice(0, MAX_HISTORY_POINTS).map((row) => ({
          timestamp: asUtcIso(row.bucket_time), value: Number(row.average_value),
        })),
      };
    } catch (error) {
      if (error instanceof HistoryValidationError) throw error;
      throw new HistoryUnavailableError();
    }
  }
}

function createUnavailableHistoryService() {
  return { async getHistory() { throw new HistoryUnavailableError(); } };
}

module.exports = { HistoryService, HistoryUnavailableError, HistoryValidationError, asUtcIso, createUnavailableHistoryService };
