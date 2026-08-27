const { EventEmitter } = require('node:events');
const { normalizeDeviceState } = require('./normalize-state');

class TelemetryPipeline extends EventEmitter {
  constructor({ logger = console } = {}) { super(); this.logger = logger; this.latest = new Map(); }

  accept(candidate) {
    try {
      const state = normalizeDeviceState(candidate);
      this.latest.set(state.device, state);
      this.emit('telemetry', state);
      return state;
    } catch (error) {
      this.logger.warn(`[telemetry] rejected: ${error.message}`);
      this.emit('rejected', error);
      return null;
    }
  }

  getLatest(device) { return this.latest.get(device) ?? null; }
  listLatest() { return [...this.latest.values()]; }
}

module.exports = { TelemetryPipeline };
