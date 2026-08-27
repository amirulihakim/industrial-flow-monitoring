const express = require('express');
const path = require('node:path');

function createApp() {
  const app = express();
  const publicDirectory = path.join(__dirname, '..', 'public');

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'industrial-flow-monitoring',
      milestone: 1,
    });
  });

  app.use(express.static(publicDirectory));

  return app;
}

module.exports = { createApp };

