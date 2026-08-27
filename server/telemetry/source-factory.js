const { MqttSource, DEFAULT_TOPIC_TEMPLATE } = require('./mqtt-source');
const { SimulationSource } = require('./simulation-source');
const { loadModbusConfig } = require('./modbus-mapping');
const { ModbusSource, UnavailableModbusSource } = require('./modbus-source');

function createTelemetrySource({ simulator, environment = process.env, logger = console, mqttConnect, modbusClientFactory }) {
  const type = (environment.DATA_SOURCE || 'simulation').toLowerCase();
  if (type === 'simulation') return new SimulationSource({ simulator });
  if (type === 'mqtt') {
    return new MqttSource({
      brokerUrl: environment.MQTT_BROKER_URL,
      username: environment.MQTT_USERNAME,
      password: environment.MQTT_PASSWORD,
      topicTemplate: environment.MQTT_TOPIC_TEMPLATE || DEFAULT_TOPIC_TEMPLATE,
      connect: mqttConnect,
      logger,
    });
  }
  if (type === 'modbus') {
    try {
      const config = loadModbusConfig(environment.MODBUS_CONFIG_PATH, environment);
      return new ModbusSource({ config, clientFactory: modbusClientFactory, logger });
    } catch (error) { return new UnavailableModbusSource(`Invalid Modbus configuration: ${error.message}`, logger); }
  }
  throw new RangeError(`Unsupported DATA_SOURCE: ${type}`);
}

module.exports = { createTelemetrySource };
