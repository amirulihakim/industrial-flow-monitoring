(function exposeApp(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createAppModule() {
  const STALE_CHECK_INTERVAL_MS = 1000;
  const STALE_AFTER_MS = 5000;
  const STOPPED_FLOW_THRESHOLD = 0.01;
  const VALUE_ELEMENT_IDS = Object.freeze({ flow_rate: 'current-flow-rate', flow_velocity: 'current-flow-velocity', flow_percentage: 'current-flow-percentage', instant_heat: 'current-instant-heat', temperature_in: 'current-temperature-in', temperature_out: 'current-temperature-out' });
  const formatValue = typeof formatTelemetryValue !== 'undefined'
    ? formatTelemetryValue
    : require('./format').formatTelemetryValue;

  function collectElements(documentObject) {
    const ids = { deviceSelect: 'device-select', pumpStatus: 'pump-status', connectionState: 'connection-state', connectionMessage: 'connection-message', statusDevice: 'status-device', statusTimestampLabel: 'status-timestamp-label', statusTimestamp: 'status-timestamp', positiveTotal: 'positive-total', negativeTotal: 'negative-total', heatingTotal: 'heating-total', coolingTotal: 'cooling-total' };
    const elements = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, documentObject.getElementById(id)]));
    elements.statusPanel = documentObject.querySelector('.status-panel');
    elements.deviceButtons = [...documentObject.querySelectorAll('[data-device]')];
    elements.currentValues = Object.fromEntries(Object.entries(VALUE_ELEMENT_IDS).map(([key, id]) => [key, documentObject.getElementById(id)]));
    return elements;
  }

  class DashboardController {
    constructor({ realtime, charts, elements, now = () => Date.now(), setIntervalFunction = globalThis.setInterval.bind(globalThis), clearIntervalFunction = globalThis.clearInterval.bind(globalThis), staleCheckIntervalMs = STALE_CHECK_INTERVAL_MS, staleAfterMs = STALE_AFTER_MS }) {
      this.realtime = realtime;
      this.charts = charts;
      this.elements = elements;
      this.now = now;
      this.setIntervalFunction = setIntervalFunction;
      this.clearIntervalFunction = clearIntervalFunction;
      this.staleCheckIntervalMs = staleCheckIntervalMs;
      this.staleAfterMs = staleAfterMs;
      this.selectedDevice = elements.deviceSelect.value;
      this.timer = null;
      this.started = false;
      this.lastState = null;
      this.lastTelemetryReceivedAt = null;
      this.unsubscribeTelemetry = null;
      this.unsubscribeBuffer = null;
      this.unsubscribeStatus = null;
      this.boundDeviceClick = (event) => {
        this.changeDevice(event.currentTarget.dataset.device);
        event.currentTarget.closest?.('details')?.removeAttribute('open');
      };
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.charts.initialize();
      for (const button of this.elements.deviceButtons) button.addEventListener('click', this.boundDeviceClick);
      this.#setConnectionState('connecting', 'Connecting');
      this.elements.statusTimestampLabel.textContent = `Last Update (${formatUtcOffset(new Date(this.now()))})`;
      this.unsubscribeTelemetry = this.realtime.onTelemetry((state) => this.handleTelemetry(state));
      this.unsubscribeBuffer = this.realtime.onBuffer((device, samples) => this.handleBuffer(device, samples));
      this.unsubscribeStatus = this.realtime.onStatus((status) => this.handleTransportStatus(status));
      this.realtime.selectDevice(this.selectedDevice);
      this.realtime.start();
      this.timer = this.setIntervalFunction(() => this.checkStale(), this.staleCheckIntervalMs);
    }

    stop() {
      if (!this.started) return;
      this.started = false;
      if (this.timer !== null) { this.clearIntervalFunction(this.timer); this.timer = null; }
      this.unsubscribeTelemetry?.();
      this.unsubscribeBuffer?.();
      this.unsubscribeStatus?.();
      this.unsubscribeTelemetry = null;
      this.unsubscribeBuffer = null;
      this.unsubscribeStatus = null;
      this.realtime.stop();
      for (const button of this.elements.deviceButtons) button.removeEventListener('click', this.boundDeviceClick);
    }

    changeDevice(device) {
      this.selectedDevice = device;
      this.elements.deviceSelect.value = device;
      for (const button of this.elements.deviceButtons) button.setAttribute('aria-pressed', String(button.dataset.device === device));
      this.elements.statusDevice.textContent = device;
      this.#clearDisplayedValues();
      this.#setConnectionState('connecting', 'Connecting');
      this.#setPumpStatus('unknown', 'Unknown');
      this.elements.connectionMessage.textContent = '';
      this.lastState = null;
      this.lastTelemetryReceivedAt = null;
      const cached = this.realtime.getSamples(device);
      if (cached.length) this.handleBuffer(device, cached);
      this.realtime.selectDevice(device);
    }

    handleTelemetry(state) {
      if (state.device !== this.selectedDevice) return;
      this.lastState = state;
      this.lastTelemetryReceivedAt = this.now();
      this.#renderState(state, { appendChartPoint: true });
    }

    handleBuffer(device, samples) {
      if (device !== this.selectedDevice || !samples.length) return;
      this.charts.replace(samples);
      const newestState = samples.at(-1);
      this.lastState = newestState;
      this.lastTelemetryReceivedAt = this.now();
      this.#renderState(newestState, { appendChartPoint: false });
    }

    handleTransportStatus(status) {
      if (status.state === 'connected') {
        if (!this.lastState) this.#setConnectionState('connecting', 'Connecting');
        return;
      }
      if (status.state === 'connecting') { this.#setConnectionState('connecting', 'Connecting'); this.#setPumpStatus('unknown', 'Unknown'); return; }
      this.#renderDisconnected(new Error(status.message || 'Realtime transport unavailable.'));
    }

    checkStale() {
      if (!this.lastState || this.lastTelemetryReceivedAt === null) return;
      if (this.now() - this.lastTelemetryReceivedAt > this.staleAfterMs) {
        this.#setConnectionState('stale', 'Stale');
        this.#setPumpStatus('unknown', 'Unknown');
        this.elements.connectionMessage.textContent = 'No recent realtime telemetry has arrived for the selected device.';
      }
    }

    #renderState(state, { appendChartPoint }) {
      const timestampMs = Date.parse(state.timestamp);
      const stale = this.lastTelemetryReceivedAt !== null && this.now() - this.lastTelemetryReceivedAt > this.staleAfterMs;
      const fault = state.quality === 'fault' || state.status === 'fault';
      this.elements.statusDevice.textContent = state.device;
      this.elements.statusTimestamp.textContent = Number.isFinite(timestampMs) ? formatLocalTimestamp(new Date(timestampMs)) : 'Invalid timestamp';
      if (Number.isFinite(timestampMs)) this.elements.statusTimestampLabel.textContent = `Last Update (${formatUtcOffset(new Date(timestampMs))})`;
      if (fault) { this.#setConnectionState('disconnected', 'Offline'); this.#setPumpStatus('unknown', 'Unknown'); this.elements.connectionMessage.textContent = 'Telemetry is unavailable while the sensor is in a fault state.'; }
      else if (stale) { this.#setConnectionState('stale', 'Stale'); this.#setPumpStatus('unknown', 'Unknown'); this.elements.connectionMessage.textContent = 'The latest sample is older than the accepted live-data threshold.'; }
      else {
        this.#setConnectionState('online', 'Online');
        const flowRate = state.measurements?.flow_rate;
        this.#setPumpStatus(Number.isFinite(flowRate) && Math.abs(flowRate) <= STOPPED_FLOW_THRESHOLD ? 'stopped' : 'running', Number.isFinite(flowRate) && Math.abs(flowRate) <= STOPPED_FLOW_THRESHOLD ? 'Stopped' : 'Running');
        this.elements.connectionMessage.textContent = '';
      }
      this.#renderTotals(state.totals);
      this.#renderCurrentMeasurements(state.measurements);
      if (appendChartPoint) this.charts.append(state.timestamp, state.measurements);
    }

    #renderTotals(totals) {
      this.elements.positiveTotal.textContent = formatValue('positive_total', totals?.positive_total);
      this.elements.negativeTotal.textContent = formatValue('negative_total', totals?.negative_total);
      this.elements.heatingTotal.textContent = formatValue('heating_total', totals?.heating_total);
      this.elements.coolingTotal.textContent = formatValue('cooling_total', totals?.cooling_total);
    }

    #renderCurrentMeasurements(measurements) {
      for (const [key, element] of Object.entries(this.elements.currentValues)) element.textContent = formatValue(key, measurements?.[key]);
    }

    #renderDisconnected(error) {
      this.#setConnectionState('disconnected', 'Offline');
      this.#setPumpStatus('unknown', 'Unknown');
      this.elements.connectionMessage.textContent = `Realtime transport unavailable: ${error.message}`;
      if (!this.lastState) this.#clearDisplayedValues();
    }

    #clearDisplayedValues() { this.#renderTotals(null); this.#renderCurrentMeasurements(null); }
    #setConnectionState(state, label) { this.elements.statusPanel.dataset.state = state; this.elements.connectionState.textContent = label; }
    #setPumpStatus(state, label) { this.elements.statusPanel.dataset.pump = state; this.elements.pumpStatus.textContent = label; }
  }

  function formatLocalTimestamp(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Invalid timestamp';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return `${Number(parts.day)} ${parts.month.slice(0, 3)} ${parts.year}, ${parts.hour}:${parts.minute}:${parts.second}`;
  }

  function formatUtcOffset(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'UTC';
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;
    return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
  }

  function bootstrap() {
    const elements = collectElements(document);
    const charts = new DashboardCharts({ ChartConstructor: Chart, documentObject: document, maximumPoints: 60 });
    const controller = new DashboardController({ realtime: new RealtimeClient(), charts, elements });
    controller.start();
    window.dashboardController = controller;
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  return { DashboardController, STALE_AFTER_MS, STALE_CHECK_INTERVAL_MS, STOPPED_FLOW_THRESHOLD, collectElements, formatLocalTimestamp, formatUtcOffset };
}));
