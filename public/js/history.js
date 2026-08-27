(function exposeHistory(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createHistoryModule() {
  const SENSOR_LABELS = Object.freeze({
    flow_rate: 'Flow rate', flow_velocity: 'Flow velocity', flow_percentage: 'Flow percentage',
    instant_heat: 'Instantaneous heat', temperature_in: 'Inlet temperature', temperature_out: 'Outlet temperature',
    positive_total: 'Positive total flow', negative_total: 'Negative total flow',
    heating_total: 'Heating total', cooling_total: 'Cooling total',
  });

  class HistoricalChart {
    constructor({ ChartConstructor, canvas }) {
      this.chart = new ChartConstructor(canvas, {
        type: 'line',
        data: { labels: [], datasets: [{ label: '', data: [], borderColor: '#168aad', backgroundColor: '#168aad18', borderWidth: 2, fill: true, pointRadius: 0, pointHitRadius: 8, tension: 0.18 }] },
        options: { animation: false, responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10, color: '#718190' } }, y: { grid: { color: '#e9eef2' }, ticks: { maxTicksLimit: 7, color: '#718190' } } } },
      });
    }

    render(points, sensor) {
      this.chart.data.labels = points.map(({ timestamp }) => new Date(timestamp).toLocaleString());
      this.chart.data.datasets[0].label = SENSOR_LABELS[sensor] || sensor;
      this.chart.data.datasets[0].data = points.map(({ value }) => value);
      this.chart.update('none');
    }
  }

  class HistoricalController {
    constructor({ api, chart, elements }) {
      this.api = api;
      this.chart = chart;
      this.elements = elements;
      this.requestVersion = 0;
      this.started = false;
      this.boundControlChange = () => this.load();
      this.boundLiveView = () => this.showView('live');
      this.boundHistoryView = () => this.showView('history');
    }

    start() {
      if (this.started) return;
      this.started = true;
      for (const control of this.#controls()) control.addEventListener('change', this.boundControlChange);
      this.elements.liveButton.addEventListener('click', this.boundLiveView);
      this.elements.historyButton.addEventListener('click', this.boundHistoryView);
    }

    stop() {
      if (!this.started) return;
      this.started = false;
      this.requestVersion += 1;
      for (const control of this.#controls()) control.removeEventListener('change', this.boundControlChange);
      this.elements.liveButton.removeEventListener('click', this.boundLiveView);
      this.elements.historyButton.removeEventListener('click', this.boundHistoryView);
    }

    showView(view) {
      const historyVisible = view === 'history';
      this.elements.liveView.hidden = historyVisible;
      this.elements.historyView.hidden = !historyVisible;
      this.elements.liveButton.dataset.active = String(!historyVisible);
      this.elements.historyButton.dataset.active = String(historyVisible);
      this.elements.liveButton.setAttribute('aria-selected', String(!historyVisible));
      this.elements.historyButton.setAttribute('aria-selected', String(historyVisible));
      if (historyVisible) return this.load();
      return undefined;
    }

    async load() {
      const version = ++this.requestVersion;
      const { deviceSelect, sensorSelect, rangeSelect } = this.elements;
      this.#setState('loading', 'Loading historical data…');
      this.#setControlsDisabled(true);
      try {
        const result = await this.api.getHistory(deviceSelect.value, sensorSelect.value, rangeSelect.value);
        if (version !== this.requestVersion) return;
        this.chart.render(result.points, result.sensor);
        this.elements.resolution.textContent = `${result.aggregation} · ${result.points.length} of at most 1,000 points`;
        if (result.points.length === 0) this.#setState('empty', 'No historical data is available for this selection.');
        else this.#setState('ready', `${result.points.length} historical points loaded.`);
      } catch (error) {
        if (version !== this.requestVersion) return;
        this.chart.render([], sensorSelect.value);
        this.elements.resolution.textContent = 'Aggregation unavailable';
        const unavailable = error.status === 503 || error.code === 'PERSISTENCE_UNAVAILABLE';
        this.#setState('unavailable', unavailable ? 'Historical database is unavailable. Live monitoring remains active.' : `Historical request failed: ${error.message}`);
      } finally {
        if (version === this.requestVersion) this.#setControlsDisabled(false);
      }
    }

    #controls() { return [this.elements.deviceSelect, this.elements.sensorSelect, this.elements.rangeSelect]; }
    #setControlsDisabled(disabled) { for (const control of this.#controls()) control.disabled = disabled; }
    #setState(state, message) { this.elements.state.dataset.state = state; this.elements.state.textContent = message; }
  }

  function collectHistoryElements(documentObject) {
    const get = (id) => documentObject.getElementById(id);
    return { liveButton: get('view-live'), historyButton: get('view-history'), liveView: get('live-view'), historyView: get('history-view'), deviceSelect: get('history-device'), sensorSelect: get('history-sensor'), rangeSelect: get('history-range'), resolution: get('history-resolution'), state: get('history-state') };
  }

  return { HistoricalChart, HistoricalController, SENSOR_LABELS, collectHistoryElements };
}));
