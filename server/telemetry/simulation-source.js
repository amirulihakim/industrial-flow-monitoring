const { TelemetrySource } = require('./telemetry-source');

class SimulationSource extends TelemetrySource {
  constructor({ simulator, intervalMs = 1000, setIntervalFunction = setInterval, clearIntervalFunction = clearInterval }) {
    super('simulation');
    this.simulator = simulator;
    this.intervalMs = intervalMs;
    this.setIntervalFunction = setIntervalFunction;
    this.clearIntervalFunction = clearIntervalFunction;
    this.timer = null;
    this.status = { type: 'simulation', state: 'stopped', last_message_at: null, last_error: null };
  }

  start() {
    if (this.timer !== null) return;
    this.status = { ...this.status, state: 'connected', last_error: null };
    this.tick();
    this.timer = this.setIntervalFunction(() => this.tick(), this.intervalMs);
  }

  tick() {
    const states = this.simulator.stepAll(this.intervalMs / 1000);
    for (const state of Object.values(states)) this.emitTelemetry(state);
    this.status = { ...this.status, state: 'connected', last_message_at: new Date().toISOString() };
    return states;
  }

  setScenario(device, scenario) { return this.simulator.setScenario(device, scenario); }
  getStatus() { return { ...this.status }; }

  async stop() {
    if (this.timer !== null) this.clearIntervalFunction(this.timer);
    this.timer = null;
    this.status = { ...this.status, state: 'stopped' };
  }
}

module.exports = { SimulationSource };
