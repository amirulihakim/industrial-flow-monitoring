const { createApp } = require('./app');

const requestedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 3000;

const app = createApp();

app.listen(port, () => {
  console.log(`Industrial Flow Monitoring skeleton listening on http://localhost:${port}`);
});

