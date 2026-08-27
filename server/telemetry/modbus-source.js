const ModbusRTU = require('modbus-serial');
const { MEASUREMENT_KEYS, TOTAL_KEYS } = require('../simulation/constants');
const { decodeRegisters, validateModbusConfig } = require('./modbus-mapping');
const { TelemetrySource } = require('./telemetry-source');

function responseBuffer(response) {
  if (Buffer.isBuffer(response?.buffer)) return response.buffer;
  if (!Array.isArray(response?.data)) throw new TypeError('Modbus response must provide register data');
  const buffer = Buffer.alloc(response.data.length * 2);
  response.data.forEach((word, index) => buffer.writeUInt16BE(word, index * 2));
  return buffer;
}

class ModbusSource extends TelemetrySource {
  constructor({ config, clientFactory = () => new ModbusRTU(), logger = console, now = () => new Date(), setIntervalFunction = setInterval, clearIntervalFunction = clearInterval }) {
    super('modbus');
    this.config = validateModbusConfig(config);
    this.clientFactory = clientFactory;
    this.logger = logger;
    this.now = now;
    this.setIntervalFunction = setIntervalFunction;
    this.clearIntervalFunction = clearIntervalFunction;
    this.client = null;
    this.timer = null;
    this.polling = false;
    this.connected = false;
    this.status = { type: 'modbus', state: 'stopped', serial_port: this.config.connection.serial_port, polling_interval_ms: this.config.connection.polling_interval_ms, last_message_at: null, last_error: null };
  }

  start() {
    if (this.timer !== null) return;
    this.status = { ...this.status, state: 'connecting', last_error: null };
    void this.pollOnce();
    this.timer = this.setIntervalFunction(() => { void this.pollOnce(); }, this.config.connection.polling_interval_ms);
  }

  async pollOnce() {
    if (this.polling) return false;
    this.polling = true;
    try {
      await this.#connectIfNeeded();
      for (const deviceConfig of this.config.devices) {
        this.client.setID(deviceConfig.unit_id);
        const values = {};
        for (const mapping of deviceConfig.mappings) {
          const response = await this.client.readHoldingRegisters(mapping.address, mapping.register_count);
          values[mapping.sensor] = decodeRegisters(responseBuffer(response), mapping);
        }
        const timestamp = this.now().toISOString();
        this.emitTelemetry({
          device: deviceConfig.device, source: 'modbus', timestamp, scenario: null,
          status: 'online', quality: 'good',
          measurements: Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, values[key]])),
          totals: Object.fromEntries(TOTAL_KEYS.map((key) => [key, values[key]])),
        });
        this.status = { ...this.status, state: 'connected', last_message_at: timestamp, last_error: null };
      }
      return true;
    } catch (error) {
      await this.#disconnect();
      const shouldLog = this.status.state !== 'degraded' || this.status.last_error !== error.message;
      this.status = { ...this.status, state: 'degraded', last_error: error.message };
      if (shouldLog) this.logger.warn(`[modbus] unavailable: ${error.message}`);
      return false;
    } finally { this.polling = false; }
  }

  getStatus() { return { ...this.status }; }

  async stop() {
    if (this.timer !== null) this.clearIntervalFunction(this.timer);
    this.timer = null;
    await this.#disconnect();
    this.status = { ...this.status, state: 'stopped' };
  }

  async #connectIfNeeded() {
    if (this.connected) return;
    this.client = this.clientFactory();
    const connection = this.config.connection;
    await this.client.connectRTUBuffered(connection.serial_port, {
      baudRate: connection.baud_rate,
      parity: connection.parity,
      dataBits: connection.data_bits,
      stopBits: connection.stop_bits,
    });
    this.connected = true;
  }

  async #disconnect() {
    const client = this.client;
    this.client = null;
    this.connected = false;
    if (!client?.close) return;
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      try {
        const result = client.close(finish);
        if (result?.then) result.then(finish, finish);
        else if (client.close.length === 0) finish();
      } catch (_error) { finish(); }
    });
  }
}

class UnavailableModbusSource extends TelemetrySource {
  constructor(message, logger = console) { super('modbus'); this.message = message; this.logger = logger; }
  start() { this.logger.warn(`[modbus] unavailable: ${this.message}`); }
  getStatus() { return { type: 'modbus', state: 'degraded', last_message_at: null, last_error: this.message }; }
}

module.exports = { ModbusSource, UnavailableModbusSource, responseBuffer };
