const WebSocket = require('ws');
const { WebSocketServer } = WebSocket;

class RealtimeWebSocketServer {
  constructor({ server, pipeline, path = '/realtime', logger = console }) {
    this.pipeline = pipeline;
    this.logger = logger;
    this.wss = new WebSocketServer({ server, path });
    this.startedAt = new Date().toISOString();
    this.boundTelemetry = (state) => this.broadcast({ type: 'telemetry', ...state });
    this.pipeline.on('telemetry', this.boundTelemetry);
    this.wss.on('connection', (socket) => {
      socket.send(JSON.stringify({ type: 'connection', status: 'connected', timestamp: new Date().toISOString() }));
      for (const state of this.pipeline.listLatest()) socket.send(JSON.stringify({ type: 'telemetry', ...state }));
    });
    this.wss.on('error', (error) => this.logger.error(`[websocket] unavailable: ${error.message}`));
  }

  broadcast(message) {
    const serialized = JSON.stringify(message);
    for (const client of this.wss.clients) if (client.readyState === WebSocket.OPEN) client.send(serialized);
  }

  getStatus() { return { state: 'connected', path: this.wss.options.path, clients: this.wss.clients.size, started_at: this.startedAt }; }

  async stop() {
    this.pipeline.off('telemetry', this.boundTelemetry);
    for (const client of this.wss.clients) client.close(1001, 'Server shutting down');
    await new Promise((resolve) => this.wss.close(resolve));
  }
}

module.exports = { RealtimeWebSocketServer };
