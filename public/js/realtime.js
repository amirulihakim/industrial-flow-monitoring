(function exposeRealtime(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createRealtimeModule() {
  class RealtimeClient {
    constructor({ WebSocketConstructor = WebSocket, locationObject = location, setTimeoutFunction = setTimeout, clearTimeoutFunction = clearTimeout, minimumBackoffMs = 500, maximumBackoffMs = 10000 } = {}) {
      this.WebSocketConstructor = WebSocketConstructor;
      this.location = locationObject;
      this.setTimeoutFunction = setTimeoutFunction;
      this.clearTimeoutFunction = clearTimeoutFunction;
      this.minimumBackoffMs = minimumBackoffMs;
      this.maximumBackoffMs = maximumBackoffMs;
      this.socket = null;
      this.reconnectTimer = null;
      this.reconnectAttempt = 0;
      this.started = false;
      this.telemetryListeners = new Set();
      this.statusListeners = new Set();
      this.latest = new Map();
    }

    start() { if (this.started) return; this.started = true; this.#connect(); }

    stop() {
      this.started = false;
      if (this.reconnectTimer !== null) this.clearTimeoutFunction(this.reconnectTimer);
      this.reconnectTimer = null;
      const socket = this.socket;
      this.socket = null;
      if (socket) socket.close(1000, 'Client stopped');
    }

    onTelemetry(listener) { this.telemetryListeners.add(listener); return () => this.telemetryListeners.delete(listener); }
    onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
    getLatest(device) { return this.latest.get(device) ?? null; }

    #connect() {
      if (!this.started || this.socket) return;
      this.#emitStatus({ state: 'connecting' });
      const protocol = this.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new this.WebSocketConstructor(`${protocol}//${this.location.host}/realtime`);
      this.socket = socket;
      socket.addEventListener('open', () => { if (socket !== this.socket) return; this.reconnectAttempt = 0; this.#emitStatus({ state: 'connected' }); });
      socket.addEventListener('message', (event) => {
        if (socket !== this.socket) return;
        let message;
        try { message = JSON.parse(event.data); } catch (_error) { return; }
        if (message.type !== 'telemetry') return;
        this.latest.set(message.device, message);
        for (const listener of this.telemetryListeners) listener(message);
      });
      socket.addEventListener('error', () => { if (socket === this.socket) this.#emitStatus({ state: 'disconnected', message: 'Realtime transport error.' }); });
      socket.addEventListener('close', () => {
        if (socket !== this.socket) return;
        this.socket = null;
        if (!this.started) return;
        const delay = Math.min(this.maximumBackoffMs, this.minimumBackoffMs * (2 ** this.reconnectAttempt));
        this.reconnectAttempt += 1;
        this.#emitStatus({ state: 'disconnected', message: `Realtime disconnected. Reconnecting in ${delay} ms.`, retryInMs: delay });
        this.reconnectTimer = this.setTimeoutFunction(() => { this.reconnectTimer = null; this.#connect(); }, delay);
      });
    }

    #emitStatus(status) { for (const listener of this.statusListeners) listener(status); }
  }

  return { RealtimeClient };
}));
