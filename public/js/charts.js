(function exposeCharts(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createChartsModule() {
  const formatValue = typeof formatTelemetryValue !== 'undefined'
    ? formatTelemetryValue
    : require('./format').formatTelemetryValue;
  const formatNumber = typeof formatTelemetryNumber !== 'undefined'
    ? formatTelemetryNumber
    : require('./format').formatTelemetryNumber;
  const quantizeValue = typeof quantizeTelemetryValue !== 'undefined'
    ? quantizeTelemetryValue
    : require('./format').quantizeTelemetryValue;
  const LIVE_SERIES = Object.freeze([
    Object.freeze({ key: 'flow_rate', label: 'Flow Rate (m³/h)', canvasId: 'chart-flow-rate', color: '#3d74b7' }),
    Object.freeze({ key: 'flow_velocity', label: 'Flow Velocity (m/s)', canvasId: 'chart-flow-velocity', color: '#168aad' }),
    Object.freeze({ key: 'flow_percentage', label: 'Flow Percentage (%)', canvasId: 'chart-flow-percentage', color: '#d9912b' }),
    Object.freeze({ key: 'instant_heat', label: 'Instantaneous Heat (GJ/h)', canvasId: 'chart-instant-heat', color: '#cf5b66' }),
    Object.freeze({ key: 'temperature_in', label: 'Input Temperature (°C)', canvasId: 'chart-temperature-in', color: '#7357b3' }),
    Object.freeze({ key: 'temperature_out', label: 'Output Temperature (°C)', canvasId: 'chart-temperature-out', color: '#2f9e72' }),
  ]);

  class RollingSeries {
    constructor(maximumPoints = 60) {
      this.maximumPoints = maximumPoints;
      this.labels = [];
      this.values = [];
    }

    append(label, value) {
      this.labels.push(label);
      this.values.push(value == null ? null : value);
      while (this.labels.length > this.maximumPoints) this.labels.shift();
      while (this.values.length > this.maximumPoints) this.values.shift();
    }

    reset() {
      this.labels.length = 0;
      this.values.length = 0;
    }
  }

  class DashboardCharts {
    constructor({ ChartConstructor, documentObject, maximumPoints = 60 }) {
      this.ChartConstructor = ChartConstructor;
      this.document = documentObject;
      this.maximumPoints = maximumPoints;
      this.series = new Map();
      this.charts = new Map();
    }

    initialize() {
      for (const config of LIVE_SERIES) {
        const rollingSeries = new RollingSeries(this.maximumPoints);
        const canvas = this.document.getElementById(config.canvasId);
        if (!canvas) throw new Error(`Missing chart canvas: ${config.canvasId}`);
        const chart = new this.ChartConstructor(canvas, {
          type: 'line',
          data: { labels: rollingSeries.labels, datasets: [{ label: config.label, data: rollingSeries.values, borderColor: config.color, backgroundColor: `${config.color}18`, borderWidth: 2, fill: true, pointRadius: 0, pointHitRadius: 8, tension: 0.28, spanGaps: false }] },
          options: { animation: false, responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatValue(config.key, context.parsed.y) } } }, scales: { x: { grid: { display: true, color: 'rgba(113, 129, 144, 0.12)', lineWidth: 1 }, ticks: { maxTicksLimit: 6, color: '#718190' } }, y: { grid: { color: '#e9eef2' }, ticks: { maxTicksLimit: 5, color: '#718190', callback: (value) => formatNumber(config.key, value) } } } },
        });
        this.series.set(config.key, rollingSeries);
        this.charts.set(config.key, chart);
      }
    }

    append(timestamp, measurements) {
      const label = this.#formatTime(timestamp);
      for (const config of LIVE_SERIES) {
        const value = measurements?.[config.key];
        this.series.get(config.key).append(label, quantizeValue(config.key, value));
        this.charts.get(config.key).update('none');
      }
    }

    replace(samples) {
      for (const config of LIVE_SERIES) {
        const rollingSeries = this.series.get(config.key);
        rollingSeries.reset();
        for (const state of samples) {
          const value = state.measurements?.[config.key];
          rollingSeries.append(this.#formatTime(state.timestamp), quantizeValue(config.key, value));
        }
        this.charts.get(config.key).update('none');
      }
    }

    reset() {
      for (const config of LIVE_SERIES) {
        this.series.get(config.key).reset();
        this.charts.get(config.key).update('none');
      }
    }

    #formatTime(timestamp) {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return 'Invalid time';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  return { DashboardCharts, LIVE_SERIES, RollingSeries };
}));
