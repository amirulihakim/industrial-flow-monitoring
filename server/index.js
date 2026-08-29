const http = require('node:http');
const { createApp } = require('./app');
const { createPersistenceRuntime } = require('./persistence/runtime');
const { PortfolioHistoryService } = require('./history/portfolio-history-service');
const { RealtimeWebSocketServer } = require('./realtime/websocket-server');
const { SimulationEngine } = require('./simulation/simulator');
const { createTelemetrySource } = require('./telemetry/source-factory');
const { TelemetryPipeline } = require('./telemetry/telemetry-pipeline');

const requestedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
const simulator = new SimulationEngine({ seed: process.env.SIMULATION_SEED ?? 'industrial-flow-monitoring-demo' });
const source = createTelemetrySource({ simulator });
const pipeline = new TelemetryPipeline();
const persistence = createPersistenceRuntime({});
const portfolioMode = String(process.env.PORTFOLIO_MODE ?? 'true').toLowerCase() !== 'false';
const historyService = portfolioMode && source.type === 'simulation'
  ? new PortfolioHistoryService(persistence.historyService)
  : persistence.historyService;
pipeline.on('telemetry', (state) => persistence.accept(state));
source.on('telemetry', (state) => pipeline.accept(state));
const setScenario = (device, scenario) => {
  if (typeof source.setScenario !== 'function') {
    const error = new Error('Scenario controls are available only with the simulation source.');
    error.code = 'SCENARIO_UNAVAILABLE';
    throw error;
  }
  const state = source.setScenario(device, scenario);
  pipeline.accept(state);
  return state;
};
let realtime;
const app = createApp({
  simulator,
  getPersistenceStatus: () => persistence.getStatus(),
  historyService,
  getLatestState: (device) => pipeline.getLatest(device),
  setScenario,
  getSourceStatus: () => source.getStatus(),
  getRealtimeStatus: () => realtime?.getStatus() ?? { state: 'starting', path: '/realtime', clients: 0 },
});
const server = http.createServer(app);
realtime = new RealtimeWebSocketServer({ server, pipeline });

persistence.start();
source.start();

server.listen(port, () => {
  console.log(`Industrial Flow Monitoring listening on http://localhost:${port}`);
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await source.stop();
  await realtime.stop();
  await persistence.stop();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
