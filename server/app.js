const express = require('express');
const path = require('node:path');
const { SimulationEngine } = require('./simulation/simulator');
const { HistoryUnavailableError, HistoryValidationError, createUnavailableHistoryService } = require('./history/history-service');

function createApp(options = {}) {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');
  const chartJsPath = path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
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

  app.use(express.json());

  app.get('/vendor/chart.js', (_request, response) => {
    response.sendFile(chartJsPath);
  });

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'industrial-flow-monitoring',
      milestone: 5,
      persistence: getPersistenceStatus(),
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
      response.json(simulator.step(request.params.deviceCode, 1));
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
      response.json(simulator.setScenario(
        request.params.deviceCode,
        request.body?.scenario,
      ));
    } catch (error) {
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
