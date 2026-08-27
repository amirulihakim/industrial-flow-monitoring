const { createApp } = require('./app');
const { createPersistenceRuntime } = require('./persistence/runtime');
const { SimulationEngine } = require('./simulation/simulator');

const requestedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
const simulator = new SimulationEngine({ seed: process.env.SIMULATION_SEED ?? 'industrial-flow-monitoring-demo' });
const persistence = createPersistenceRuntime({ simulator });
const app = createApp({ simulator, getPersistenceStatus: () => persistence.getStatus() });

persistence.start();

const server = app.listen(port, () => {
  console.log(`Industrial Flow Monitoring listening on http://localhost:${port}`);
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async () => {
    await persistence.stop();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

