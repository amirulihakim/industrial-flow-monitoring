const mqtt = require('mqtt');
const { DEVICE_CODES, MEASUREMENT_KEYS, SENSOR_KEYS, TOTAL_KEYS } = require('../simulation/constants');
const { assertCanonicalKeys } = require('../persistence/normalize-telemetry');
const { TelemetrySource } = require('./telemetry-source');

const DEFAULT_TOPIC_TEMPLATE = 'timah-monitoring/<device>/telemetry';

function topicSubscription(template) {
  if ((template.match(/<device>/g) || []).length !== 1) throw new TypeError('MQTT_TOPIC_TEMPLATE must contain exactly one <device> placeholder');
  return template.replace('<device>', '+');
}

function deviceFromTopic(topic, template) {
  const escaped = template.split('<device>').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const match = new RegExp(`^${escaped[0]}([^/]+)${escaped[1]}$`).exec(topic);
  return match?.[1] ?? null;
}

function normalizeMqttMessage(topic, payload, { topicTemplate = DEFAULT_TOPIC_TEMPLATE, now = () => new Date() } = {}) {
  const device = deviceFromTopic(topic, topicTemplate);
  if (!DEVICE_CODES.includes(device)) throw new TypeError(`Unsupported device: ${device}`);
  let body;
  try { body = JSON.parse(payload.toString()); } catch (_error) { throw new TypeError('MQTT payload must be valid JSON'); }
  if (!body || typeof body.values !== 'object' || Array.isArray(body.values)) throw new TypeError('MQTT payload must contain a values object');
  assertCanonicalKeys(body.values);
  for (const key of SENSOR_KEYS) {
    if (!Number.isFinite(body.values[key])) throw new TypeError(`Telemetry value must be finite: ${key}`);
  }
  const timestamp = new Date(body.timestamp ?? now());
  if (Number.isNaN(timestamp.getTime())) throw new TypeError('Telemetry timestamp must be valid ISO 8601');
  const quality = body.quality ?? 'good';
  if (quality !== 'good') throw new TypeError('MQTT numeric telemetry quality must be good');
  return {
    device, source: 'mqtt', timestamp: timestamp.toISOString(), scenario: null,
    status: body.status ?? 'online', quality,
    measurements: Object.fromEntries(MEASUREMENT_KEYS.map((key) => [key, body.values[key]])),
    totals: Object.fromEntries(TOTAL_KEYS.map((key) => [key, body.values[key]])),
  };
}

class MqttSource extends TelemetrySource {
  constructor({ brokerUrl, username, password, topicTemplate = DEFAULT_TOPIC_TEMPLATE, connect = mqtt.connect, logger = console, now = () => new Date() }) {
    super('mqtt');
    this.config = { brokerUrl, username, password, topicTemplate };
    this.connect = connect;
    this.logger = logger;
    this.now = now;
    this.client = null;
    this.status = { type: 'mqtt', state: 'stopped', topic: topicSubscription(topicTemplate), last_message_at: null, last_error: null };
  }

  start() {
    if (this.client) return;
    if (!this.config.brokerUrl) { this.#degrade('MQTT_BROKER_URL is required when DATA_SOURCE=mqtt'); return; }
    this.status = { ...this.status, state: 'connecting', last_error: null };
    try {
      this.client = this.connect(this.config.brokerUrl, {
        username: this.config.username || undefined,
        password: this.config.password || undefined,
        reconnectPeriod: 1000,
        connectTimeout: 10000,
      });
    } catch (error) { this.#degrade(error.message); return; }
    this.client.on('connect', () => {
      this.client.subscribe(this.status.topic, (error) => {
        if (error) this.#degrade(`Subscription failed: ${error.message}`);
        else this.status = { ...this.status, state: 'connected', last_error: null };
      });
    });
    this.client.on('message', (topic, payload) => {
      try {
        const state = normalizeMqttMessage(topic, payload, { topicTemplate: this.config.topicTemplate, now: this.now });
        this.status = { ...this.status, state: 'connected', last_message_at: state.timestamp, last_error: null };
        this.emitTelemetry(state);
      } catch (error) { this.logger.warn(`[mqtt] rejected message: ${error.message}`); this.emit('rejected', error); }
    });
    this.client.on('reconnect', () => { this.status = { ...this.status, state: 'connecting' }; });
    this.client.on('offline', () => { this.#degrade('MQTT broker is offline'); });
    this.client.on('error', (error) => { this.#degrade(error.message); });
  }

  getStatus() { return { ...this.status }; }

  async stop() {
    const client = this.client;
    this.client = null;
    if (client) await new Promise((resolve) => client.end(false, resolve));
    this.status = { ...this.status, state: 'stopped' };
  }

  #degrade(message) {
    this.status = { ...this.status, state: 'degraded', last_error: message };
    this.logger.warn(`[mqtt] unavailable: ${message}`);
  }
}

module.exports = { DEFAULT_TOPIC_TEMPLATE, MqttSource, deviceFromTopic, normalizeMqttMessage, topicSubscription };
