(function exposeApp(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createAppModule() {
  const POLL_INTERVAL_MS = 1000;
  const STALE_AFTER_MS = 5000;
  const SCENARIO_LABELS = Object.freeze({ normal: 'Normal', low_flow: 'Low flow', pump_stopped: 'Pump stopped', high_temperature: 'High temperature', sensor_fault: 'Sensor fault' });
  const VALUE_ELEMENT_IDS = Object.freeze({ flow_rate: 'current-flow-rate', flow_velocity: 'current-flow-velocity', flow_percentage: 'current-flow-percentage', instant_heat: 'current-instant-heat', temperature_in: 'current-temperature-in', temperature_out: 'current-temperature-out' });

  function collectElements(documentObject) {
    const ids = { deviceSelect: 'device-select', scenarioSelect: 'scenario-select', scenarioFeedback: 'scenario-feedback', connectionState: 'connection-state', connectionMessage: 'connection-message', statusDevice: 'status-device', statusScenario: 'status-scenario', statusSource: 'status-source', statusQuality: 'status-quality', statusTimestamp: 'status-timestamp', positiveTotal: 'positive-total', negativeTotal: 'negative-total', netTotal: 'net-total', heatingTotal: 'heating-total', coolingTotal: 'cooling-total' };
    const elements = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, documentObject.getElementById(id)]));
    elements.statusPanel = documentObject.querySelector('.status-panel');
    elements.currentValues = Object.fromEntries(Object.entries(VALUE_ELEMENT_IDS).map(([key, id]) => [key, documentObject.getElementById(id)]));
    return elements;
  }

  class DashboardController {
    constructor({ api, charts, elements, now = () => Date.now(), setIntervalFunction = setInterval, clearIntervalFunction = clearInterval, pollIntervalMs = POLL_INTERVAL_MS, staleAfterMs = STALE_AFTER_MS }) {
      this.api = api;
      this.charts = charts;
      this.elements = elements;
      this.now = now;
      this.setIntervalFunction = setIntervalFunction;
      this.clearIntervalFunction = clearIntervalFunction;
      this.pollIntervalMs = pollIntervalMs;
      this.staleAfterMs = staleAfterMs;
      this.selectedDevice = elements.deviceSelect.value;
      this.timer = null;
      this.requestVersion = 0;
      this.started = false;
      this.boundDeviceChange = () => this.changeDevice(this.elements.deviceSelect.value);
      this.boundScenarioChange = () => this.changeScenario(this.elements.scenarioSelect.value);
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.charts.initialize();
      this.elements.deviceSelect.addEventListener('change', this.boundDeviceChange);
      this.elements.scenarioSelect.addEventListener('change', this.boundScenarioChange);
      this.#setConnectionState('connecting', 'Connecting');
      this.refresh();
      this.timer = this.setIntervalFunction(() => this.refresh(), this.pollIntervalMs);
    }

    stop() {
      if (!this.started) return;
      this.started = false;
      this.requestVersion += 1;
      if (this.timer !== null) { this.clearIntervalFunction(this.timer); this.timer = null; }
      this.elements.deviceSelect.removeEventListener('change', this.boundDeviceChange);
      this.elements.scenarioSelect.removeEventListener('change', this.boundScenarioChange);
    }

    changeDevice(device) {
      this.selectedDevice = device;
      this.requestVersion += 1;
      this.charts.reset();
      this.#clearDisplayedValues();
      this.elements.statusDevice.textContent = device;
      this.#setConnectionState('connecting', 'Connecting');
      this.elements.connectionMessage.textContent = '';
      return this.refresh();
    }

    async changeScenario(scenario) {
      const device = this.selectedDevice;
      this.elements.scenarioSelect.disabled = true;
      this.#setScenarioFeedback('Applying scenario…', 'pending');
      try {
        const state = await this.api.setScenario(device, scenario);
        if (device !== this.selectedDevice) return;
        this.#renderState(state, { appendChartPoint: false });
        this.#setScenarioFeedback(`${SCENARIO_LABELS[scenario]} applied to ${device}.`, 'success');
        await this.refresh();
      } catch (error) {
        if (device !== this.selectedDevice) return;
        this.#setScenarioFeedback(`Scenario change failed: ${error.message}`, 'error');
        this.elements.scenarioSelect.value = this.elements.statusScenario.dataset.value || 'normal';
      } finally {
        if (device === this.selectedDevice) this.elements.scenarioSelect.disabled = false;
      }
    }

    async refresh() {
      const device = this.selectedDevice;
      const version = ++this.requestVersion;
      try {
        const state = await this.api.getLatest(device);
        if (version !== this.requestVersion || device !== this.selectedDevice) return;
        this.#renderState(state, { appendChartPoint: true });
      } catch (error) {
        if (version !== this.requestVersion || device !== this.selectedDevice) return;
        this.#renderDisconnected(error);
      }
    }

    #renderState(state, { appendChartPoint }) {
      const timestampMs = Date.parse(state.timestamp);
      const stale = !Number.isFinite(timestampMs) || this.now() - timestampMs > this.staleAfterMs;
      const fault = state.quality === 'fault' || state.status === 'fault';
      this.elements.statusDevice.textContent = state.device;
      this.elements.statusScenario.textContent = SCENARIO_LABELS[state.scenario] || state.scenario;
      this.elements.statusScenario.dataset.value = state.scenario;
      this.elements.statusSource.textContent = state.source;
      this.elements.statusQuality.textContent = `${state.quality} / ${state.status}`;
      this.elements.statusTimestamp.textContent = Number.isFinite(timestampMs) ? new Date(timestampMs).toLocaleString() : 'Invalid timestamp';
      this.elements.scenarioSelect.value = state.scenario;
      if (fault) { this.#setConnectionState('fault', 'Sensor fault'); this.elements.connectionMessage.textContent = 'Telemetry is unavailable while the simulated sensor is in a fault state.'; }
      else if (stale) { this.#setConnectionState('stale', 'Stale telemetry'); this.elements.connectionMessage.textContent = 'The latest sample is older than the accepted live-data threshold.'; }
      else { this.#setConnectionState('online', 'Online'); this.elements.connectionMessage.textContent = ''; }
      this.#renderTotals(state.totals);
      this.#renderCurrentMeasurements(state.measurements);
      if (appendChartPoint) this.charts.append(state.timestamp, state.measurements);
    }

    #renderTotals(totals) {
      const positive = totals?.positive_total;
      const negative = totals?.negative_total;
      this.elements.positiveTotal.textContent = this.#formatValue(positive);
      this.elements.negativeTotal.textContent = this.#formatValue(negative);
      this.elements.heatingTotal.textContent = this.#formatValue(totals?.heating_total);
      this.elements.coolingTotal.textContent = this.#formatValue(totals?.cooling_total);
      this.elements.netTotal.textContent = Number.isFinite(positive) && Number.isFinite(negative) ? this.#formatValue(positive - negative) : '—';
    }

    #renderCurrentMeasurements(measurements) {
      for (const [key, element] of Object.entries(this.elements.currentValues)) element.textContent = this.#formatValue(measurements?.[key]);
    }

    #renderDisconnected(error) {
      this.#setConnectionState('disconnected', 'Disconnected');
      this.elements.statusSource.textContent = 'Unavailable';
      this.elements.statusQuality.textContent = 'unknown / unavailable';
      this.elements.connectionMessage.textContent = `Latest-state request failed: ${error.message}`;
      this.#clearDisplayedValues();
      this.charts.append(new Date(this.now()).toISOString(), null);
    }

    #clearDisplayedValues() { this.#renderTotals(null); this.#renderCurrentMeasurements(null); }
    #setConnectionState(state, label) { this.elements.statusPanel.dataset.state = state; this.elements.connectionState.textContent = label; }
    #setScenarioFeedback(message, kind) { this.elements.scenarioFeedback.textContent = message; this.elements.scenarioFeedback.dataset.kind = kind; }
    #formatValue(value) { return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value) : '—'; }
  }

  function bootstrap() {
    const elements = collectElements(document);
    const charts = new DashboardCharts({ ChartConstructor: Chart, documentObject: document, maximumPoints: 60 });
    const controller = new DashboardController({ api: new DashboardApi(), charts, elements });
    controller.start();
    window.dashboardController = controller;
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  return { DashboardController, POLL_INTERVAL_MS, SCENARIO_LABELS, STALE_AFTER_MS, collectElements };
}));

