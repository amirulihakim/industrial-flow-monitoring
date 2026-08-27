const { normalizeTelemetryState } = require('./normalize-telemetry');

class PersistenceRunner {
  constructor({
    simulator,
    repository,
    intervalMs,
    logger = console,
    now = () => new Date(),
    setIntervalFunction = setInterval,
    clearIntervalFunction = clearInterval,
  }) {
    this.simulator = simulator;
    this.repository = repository;
    this.intervalMs = intervalMs;
    this.logger = logger;
    this.now = now;
    this.setIntervalFunction = setIntervalFunction;
    this.clearIntervalFunction = clearIntervalFunction;
    this.timer = null;
    this.running = false;
    this.initialized = false;
    this.pendingStates = new Map();
    this.status = {
      state: 'degraded',
      interval_ms: intervalMs,
      last_success_at: null,
      last_error: 'Persistence has not connected yet.',
    };
  }

  start() {
    if (this.timer !== null) return;
    this.runOnce();
    this.timer = this.setIntervalFunction(() => this.runOnce(), this.intervalMs);
  }

  stop() {
    if (this.timer === null) return;
    this.clearIntervalFunction(this.timer);
    this.timer = null;
  }

  getStatus() {
    return { ...this.status };
  }

  accept(state) { this.pendingStates.set(state.device, state); }

  async runOnce() {
    if (this.running) return false;
    this.running = true;

    try {
      if (!this.initialized) {
        await this.repository.initialize();
        this.initialized = true;
      }

      const states = this.pendingStates.size > 0
        ? [...this.pendingStates.values()]
        : Object.values(this.simulator?.stepAll(this.intervalMs / 1000) ?? {});
      const readings = states.flatMap(normalizeTelemetryState);
      await this.repository.insertReadings(readings);
      for (const state of states) {
        if (this.pendingStates.get(state.device) === state) this.pendingStates.delete(state.device);
      }
      this.status = {
        state: 'connected',
        interval_ms: this.intervalMs,
        last_success_at: this.now().toISOString(),
        last_error: null,
      };
      return true;
    } catch (error) {
      this.initialized = false;
      this.status = {
        state: 'degraded',
        interval_ms: this.intervalMs,
        last_success_at: this.status.last_success_at,
        last_error: error.message,
      };
      this.logger.error(`[persistence] unavailable: ${error.message}`);
      return false;
    } finally {
      this.running = false;
    }
  }
}

module.exports = { PersistenceRunner };
