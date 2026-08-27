const { MqttSource, DEFAULT_TOPIC_TEMPLATE } = require('./mqtt-source');
const { SimulationSource } = require('./simulation-source');

function createTelemetrySource({ simulator, environment = process.env, logger = console, mqttConnect }) {
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
  throw new RangeError(`Unsupported DATA_SOURCE: ${type}`);
}

module.exports = { createTelemetrySource };
