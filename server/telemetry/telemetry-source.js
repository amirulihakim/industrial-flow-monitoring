const { EventEmitter } = require('node:events');

class TelemetrySource extends EventEmitter {
  constructor(type) {
    super();
    this.type = type;
  }

  emitTelemetry(state) { this.emit('telemetry', state); }
  getStatus() { throw new Error('TelemetrySource.getStatus() must be implemented'); }
  start() { throw new Error('TelemetrySource.start() must be implemented'); }
  async stop() {}
}

module.exports = { TelemetrySource };
