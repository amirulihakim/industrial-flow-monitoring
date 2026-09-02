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
  const displayMetadata = typeof TELEMETRY_DISPLAY !== 'undefined'
    ? TELEMETRY_DISPLAY
    : require('./format').TELEMETRY_DISPLAY;
  const LIVE_SERIES = Object.freeze([
    Object.freeze({ key: 'flow_rate', label: 'Flow Rate (m³/h)', canvasId: 'chart-flow-rate', valueId: 'current-flow-rate', color: '#3d74b7' }),
    Object.freeze({ key: 'flow_velocity', label: 'Flow Velocity (m/s)', canvasId: 'chart-flow-velocity', valueId: 'current-flow-velocity', color: '#168aad' }),
    Object.freeze({ key: 'flow_percentage', label: 'Flow Percentage (%)', canvasId: 'chart-flow-percentage', valueId: 'current-flow-percentage', color: '#d9912b' }),
    Object.freeze({ key: 'instant_heat', label: 'Instantaneous Heat (GJ/h)', canvasId: 'chart-instant-heat', valueId: 'current-instant-heat', color: '#cf5b66' }),
    Object.freeze({ key: 'temperature_in', label: 'Input Temperature (°C)', canvasId: 'chart-temperature-in', valueId: 'current-temperature-in', color: '#7357b3' }),
    Object.freeze({ key: 'temperature_out', label: 'Output Temperature (°C)', canvasId: 'chart-temperature-out', valueId: 'current-temperature-out', color: '#2f9e72' }),
  ]);

  function shouldShowTimestampTick(index, tickCount, maximumLabels = 6) {
    if (tickCount <= 1 || index === tickCount - 1) return true;
    if (index === 0) return false;
    const interval = Math.max(1, Math.ceil((tickCount - 1) / (maximumLabels - 1)));
    return index % interval === 0;
  }

  function niceStepAtLeast(value, minimumStep) {
    if (!Number.isFinite(value) || value <= 0) return minimumStep;
    const exponent = Math.floor(Math.log10(value));
    const magnitude = 10 ** exponent;
    const fraction = value / magnitude;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return Math.max(minimumStep, niceFraction * magnitude);
  }

  function computeNiceYAxisScale(values, decimals, targetIntervals = 4) {
    const numericValues = values.filter(Number.isFinite);
    if (!numericValues.length) return null;
    const minimum = Math.min(...numericValues);
    const maximum = Math.max(...numericValues);
    const minimumStep = 10 ** -decimals;
    const range = maximum - minimum;
    const stepSize = range === 0 ? minimumStep : niceStepAtLeast(range / targetIntervals, minimumStep);
    const precision = Math.max(decimals, Math.max(0, -Math.floor(Math.log10(stepSize))) + 2);
    let axisMinimum = Math.floor(minimum / stepSize) * stepSize;
    let axisMaximum = Math.ceil(maximum / stepSize) * stepSize;
    const tolerance = stepSize * 1e-9;
    if (Math.abs(axisMinimum - minimum) <= tolerance) axisMinimum -= stepSize;
    if (Math.abs(axisMaximum - maximum) <= tolerance) axisMaximum += stepSize;
    axisMinimum = Number(axisMinimum.toFixed(precision));
    axisMaximum = Number(axisMaximum.toFixed(precision));
    return { min: axisMinimum, max: axisMaximum, stepSize };
  }

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
        const currentValue = this.document.getElementById(config.valueId);
        if (!canvas) throw new Error(`Missing chart canvas: ${config.canvasId}`);
        if (currentValue?.style) currentValue.style.color = config.color;
        const chart = new this.ChartConstructor(canvas, {
          type: 'line',
          data: { labels: rollingSeries.labels, datasets: [{ label: config.label, data: rollingSeries.values, borderColor: config.color, backgroundColor: `${config.color}18`, borderWidth: 2, fill: true, pointRadius: 0, pointHitRadius: 8, tension: 0.28, spanGaps: false }] },
          options: { animation: false, responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => items[0]?.label || '', label: (context) => formatValue(config.key, context.parsed.y) } } }, scales: { x: { grid: { display: true, color: (context) => shouldShowTimestampTick(context.index, context.chart.scales.x.ticks.length) ? 'rgba(113, 129, 144, 0.12)' : 'transparent', lineWidth: 1 }, ticks: { autoSkip: false, minRotation: 0, maxRotation: 0, color: '#718190', font: { family: 'Inter, "Segoe UI", Arial, sans-serif', size: 11, style: 'normal', weight: '400' }, callback(value, index, ticks) { if (!shouldShowTimestampTick(index, ticks.length)) return ''; return index === ticks.length - 1 ? 'Now' : this.getLabelForValue(value); } } }, y: { grid: { color: '#e9eef2' }, ticks: { maxTicksLimit: 5, color: '#718190', font: { family: 'Inter, "Segoe UI", Arial, sans-serif', size: 11, style: 'normal', weight: '400' }, callback: (value) => formatNumber(config.key, value) } } } },
        });
        chart.$telemetryKey = config.key;
        this.series.set(config.key, rollingSeries);
        this.charts.set(config.key, chart);
      }
    }

    append(timestamp, measurements) {
      const label = this.#formatTime(timestamp);
      for (const config of LIVE_SERIES) {
        const value = measurements?.[config.key];
        const rollingSeries = this.series.get(config.key);
        const chart = this.charts.get(config.key);
        rollingSeries.append(label, quantizeValue(config.key, value));
        this.#applyYAxisBounds(chart, rollingSeries.values);
        chart.update('none');
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
        const chart = this.charts.get(config.key);
        this.#applyYAxisBounds(chart, rollingSeries.values);
        chart.update('none');
      }
    }

    reset() {
      for (const config of LIVE_SERIES) {
        this.series.get(config.key).reset();
        const chart = this.charts.get(config.key);
        delete chart.options.scales.y.min;
        delete chart.options.scales.y.max;
        delete chart.options.scales.y.ticks.stepSize;
        chart.update('none');
      }
    }

    #applyYAxisBounds(chart, values) {
      const decimals = displayMetadata[chart.$telemetryKey]?.decimals ?? 3;
      const scale = computeNiceYAxisScale(values, decimals);
      if (!scale) {
        delete chart.options.scales.y.min;
        delete chart.options.scales.y.max;
        delete chart.options.scales.y.ticks.stepSize;
        return;
      }
      chart.options.scales.y.min = scale.min;
      chart.options.scales.y.max = scale.max;
      chart.options.scales.y.ticks.stepSize = scale.stepSize;
    }

    #formatTime(timestamp) {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return 'Invalid time';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  return { DashboardCharts, LIVE_SERIES, RollingSeries, computeNiceYAxisScale, shouldShowTimestampTick };
}));
