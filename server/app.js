const express = require('express');
const path = require('node:path');
const { SimulationEngine } = require('./simulation/simulator');
const { HistoryUnavailableError, HistoryValidationError, createUnavailableHistoryService } = require('./history/history-service');

function createApp(options = {}) {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');
  const chartJsPath = path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
  const mqttJsPath = path.join(__dirname, '..', 'node_modules', 'mqtt', 'dist', 'mqtt.min.js');
  const simulator = options.simulator ?? new SimulationEngine({
    seed: process.env.SIMULATION_SEED ?? 'industrial-flow-monitoring-demo',
  });
  const getPersistenceStatus = options.getPersistenceStatus ?? (() => ({
    state: 'degraded',
    interval_ms: null,
    last_success_at: null,
    last_error: 'Persistence runtime is not attached.',
  }));
  const historyService = options.historyService ?? createUnavailableHistoryService();
  const getLatestState = options.getLatestState ?? ((device) => simulator.step(device, 1));
  const setScenario = options.setScenario ?? ((device, scenario) => simulator.setScenario(device, scenario));
  const getSourceStatus = options.getSourceStatus ?? (() => ({ type: 'simulation', state: 'connected' }));
  const getRealtimeStatus = options.getRealtimeStatus ?? (() => ({ state: 'unavailable', path: '/realtime', clients: 0 }));

  app.use(express.json());

  app.get('/vendor/chart.js', (_request, response) => {
    response.sendFile(chartJsPath);
  });

  app.get('/vendor/mqtt.js', (_request, response) => {
    response.sendFile(mqttJsPath);
  });

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'industrial-flow-monitoring',
      milestone: 7,
      persistence: getPersistenceStatus(),
      source: getSourceStatus(),
      realtime: getRealtimeStatus(),
    });
  });

  app.get('/api/simulation', (_request, response) => {
    response.json({
      source: 'simulation',
      disclosure: 'Synthetic telemetry for portfolio demonstration.',
      devices: simulator.listDevices(),
      scenarios: simulator.listScenarios(),
    });
  });

  app.get('/api/devices/:deviceCode/latest', (request, response) => {
    try {
      const state = getLatestState(request.params.deviceCode);
      if (!state) { response.status(404).json({ error: `No telemetry is available for device: ${request.params.deviceCode}` }); return; }
      response.json(state);
    } catch (error) {
      if (error instanceof RangeError) {
        response.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  app.get('/api/devices/:deviceCode/history', async (request, response) => {
    try {
      response.json(await historyService.getHistory({
        device: request.params.deviceCode,
        sensor: request.query.sensor,
        range: request.query.range,
      }));
    } catch (error) {
      if (error instanceof HistoryValidationError) {
        response.status(error.statusCode).json({ error: error.message, code: 'INVALID_HISTORY_REQUEST' });
        return;
      }
      if (error instanceof HistoryUnavailableError) {
        response.status(503).json({ error: error.message, code: 'PERSISTENCE_UNAVAILABLE' });
        return;
      }
      throw error;
    }
  });

  app.get('/api/devices/:deviceCode/scenario', (request, response) => {
    try {
      const state = simulator.getCurrentState(request.params.deviceCode);
      response.json({
        device: state.device,
        source: state.source,
        scenario: state.scenario,
        status: state.status,
        quality: state.quality,
      });
    } catch (error) {
      if (error instanceof RangeError) {
        response.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  app.put('/api/devices/:deviceCode/scenario', (request, response) => {
    try {
      response.json(setScenario(
        request.params.deviceCode,
        request.body?.scenario,
      ));
    } catch (error) {
      if (error?.code === 'SCENARIO_UNAVAILABLE') { response.status(409).json({ error: error.message }); return; }
      if (error instanceof RangeError) {
        const unsupportedDevice = error.message.startsWith('Unsupported device');
        response.status(unsupportedDevice ? 404 : 400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  app.use(express.static(publicDirectory));

  return app;
}

module.exports = { createApp };
