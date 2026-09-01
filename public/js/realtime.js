(function exposeRealtime(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createRealtimeModule() {
  const DEVICES = Object.freeze(['PCWP', 'SCWP1', 'SCWP2']);
  const MEASUREMENTS = Object.freeze(['flow_rate', 'flow_velocity', 'flow_percentage', 'instant_heat', 'temperature_in', 'temperature_out']);
  const TOTALS = Object.freeze(['positive_total', 'negative_total', 'heating_total', 'cooling_total']);
  const FRONTEND_CONFIG = typeof TIMAH_FRONTEND_CONFIG !== 'undefined'
    ? TIMAH_FRONTEND_CONFIG
    : require('./config');
  const BROKER_URL = FRONTEND_CONFIG.mqtt.brokerUrl;
  const TOPIC_ROOT = 'amirul/timah-monitoring';

  function asTimestamp(unixSeconds) {
    if (!Number.isFinite(unixSeconds)) throw new TypeError('Timestamp must be finite Unix seconds');
    const timestamp = new Date(unixSeconds * 1000);
    if (Number.isNaN(timestamp.getTime())) throw new TypeError('Timestamp is invalid');
    return timestamp.toISOString();
  }

  function normalizeTelemetry(payload, topic) {
    const body = JSON.parse(payload.toString());
    if (!body || !DEVICES.includes(body.device) || !topic.endsWith(`/${body.device}/telemetry`)) throw new TypeError('Unknown or mismatched telemetry device');
    if (!body.values || [...MEASUREMENTS, ...TOTALS].some((key) => !Number.isFinite(body.values[key]))) throw new TypeError('Telemetry values must contain finite canonical values');
    return {
      type: 'telemetry', device: body.device, source: body.source || 'esp32_simulation',
      timestamp: asTimestamp(body.timestamp), unixTimestamp: body.timestamp,
      scenario: null, status: 'online', quality: 'good',
      measurements: Object.fromEntries(MEASUREMENTS.map((key) => [key, body.values[key]])),
      totals: Object.fromEntries(TOTALS.map((key) => [key, body.values[key]])),
    };
  }

  function parseSnapshot(payload, topic) {
    const body = JSON.parse(payload.toString());
    if (!body || !DEVICES.includes(body.device) || !topic.endsWith(`/${body.device}/snapshot`)) throw new TypeError('Unknown or mismatched snapshot device');
    if (!Array.isArray(body.fields) || !Array.isArray(body.samples)) throw new TypeError('Snapshot fields and samples must be arrays');
    const fieldIndexes = new Map(body.fields.map((field, index) => [field, index]));
    if (!fieldIndexes.has('timestamp') || MEASUREMENTS.some((key) => !fieldIndexes.has(key))) throw new TypeError('Snapshot is missing canonical fields');
    const samples = body.samples.map((row) => {
      if (!Array.isArray(row)) throw new TypeError('Snapshot sample must be an array');
      const unixTimestamp = row[fieldIndexes.get('timestamp')];
      const measurements = Object.fromEntries(MEASUREMENTS.map((key) => [key, row[fieldIndexes.get(key)]]));
      if (Object.values(measurements).some((value) => !Number.isFinite(value))) throw new TypeError('Snapshot measurements must be finite');
      return {
        type: 'telemetry', device: body.device, source: body.source || 'esp32_simulation',
        timestamp: asTimestamp(unixTimestamp), unixTimestamp,
        scenario: null, status: 'online', quality: 'good', measurements, totals: {}, snapshot: true,
      };
    });
    return { device: body.device, samples };
  }

  class RealtimeClient {
    constructor({ mqttLibrary = (typeof mqtt !== 'undefined' ? mqtt : globalThis.mqtt), clientId = null } = {}) {
      this.mqtt = mqttLibrary;
      this.clientId = clientId || `timah-dashboard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      this.client = null;
      this.started = false;
      this.selectedDevice = 'PCWP';
      this.telemetryListeners = new Set();
      this.bufferListeners = new Set();
      this.statusListeners = new Set();
      this.samples = new Map(DEVICES.map((device) => [device, new Map()]));
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.#emitStatus({ state: 'connecting' });
      this.client = this.mqtt.connect(BROKER_URL, {
        clientId: this.clientId, clean: true, protocolVersion: FRONTEND_CONFIG.mqtt.protocolVersion,
        username: FRONTEND_CONFIG.mqtt.username, password: FRONTEND_CONFIG.mqtt.password,
        reconnectPeriod: 2000, connectTimeout: 10000,
      });
      this.client.on('connect', () => this.#handleConnect());
      this.client.on('message', (topic, payload) => this.#handleMessage(topic, payload));
      this.client.on('reconnect', () => { console.info('[mqtt] reconnecting'); this.#emitStatus({ state: 'connecting' }); });
      this.client.on('offline', () => this.#handleDisconnect());
      this.client.on('close', () => this.#handleDisconnect());
      this.client.on('error', (error) => { console.error('[mqtt] error:', error.message); this.#emitStatus({ state: 'disconnected', message: `MQTT unavailable: ${error.message}` }); });
    }

    stop() {
      this.started = false;
      this.client?.end(true);
      this.client = null;
    }

    onTelemetry(listener) { this.telemetryListeners.add(listener); return () => this.telemetryListeners.delete(listener); }
    onBuffer(listener) { this.bufferListeners.add(listener); return () => this.bufferListeners.delete(listener); }
    onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
    getLatest(device) { return this.getSamples(device).at(-1) ?? null; }
    getSamples(device) { return [...(this.samples.get(device)?.values() ?? [])].sort((left, right) => left.unixTimestamp - right.unixTimestamp); }
    selectDevice(device) { if (DEVICES.includes(device)) this.selectedDevice = device; }

    #handleConnect() {
      console.info('[mqtt] connected');
      const topics = DEVICES.flatMap((device) => [`${TOPIC_ROOT}/${device}/snapshot`, `${TOPIC_ROOT}/${device}/telemetry`]);
      this.client.subscribe(topics);
      this.#emitStatus({ state: 'connected' });
    }

    #handleDisconnect() {
      if (!this.started) return;
      console.info('[mqtt] disconnected');
      this.#emitStatus({ state: 'disconnected', message: 'MQTT disconnected. Retrying automatically.' });
    }

    #handleMessage(topic, payload) {
      try {
        if (topic.endsWith('/snapshot')) {
          const snapshot = parseSnapshot(payload, topic);
          const deviceSamples = this.samples.get(snapshot.device);
          for (const state of snapshot.samples) if (!deviceSamples.has(state.unixTimestamp)) deviceSamples.set(state.unixTimestamp, state);
          this.#trim(snapshot.device);
          console.info('[mqtt] snapshot received:', snapshot.device, snapshot.samples.length);
          if (snapshot.device === this.selectedDevice) {
            const samples = this.getSamples(snapshot.device);
            for (const listener of this.bufferListeners) listener(snapshot.device, samples);
          }
          return;
        }
        if (!topic.endsWith('/telemetry')) return;
        const state = normalizeTelemetry(payload, topic);
        const deviceSamples = this.samples.get(state.device);
        const duplicate = deviceSamples.has(state.unixTimestamp);
        deviceSamples.set(state.unixTimestamp, state);
        this.#trim(state.device);
        if (!duplicate && state.device === this.selectedDevice) for (const listener of this.telemetryListeners) listener(state);
      } catch (error) {
        console.error('[mqtt] malformed payload:', error.message);
      }
    }

    #trim(device) {
      const deviceSamples = this.samples.get(device);
      const ordered = this.getSamples(device);
      while (ordered.length > 60) deviceSamples.delete(ordered.shift().unixTimestamp);
    }

    #emitStatus(status) { for (const listener of this.statusListeners) listener(status); }
  }

  return { BROKER_URL, DEVICES, RealtimeClient, normalizeTelemetry, parseSnapshot };
}));
