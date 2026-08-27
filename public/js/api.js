(function exposeApi(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else Object.assign(root, exported);
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApiModule() {
  class DashboardApi {
    constructor(fetchImplementation = fetch) {
      this.fetch = fetchImplementation;
    }

    async getLatest(device) {
      return this.#request(`/api/devices/${encodeURIComponent(device)}/latest`);
    }

    async setScenario(device, scenario) {
      return this.#request(`/api/devices/${encodeURIComponent(device)}/scenario`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
    }

    async getHistory(device, sensor, range) {
      const query = new URLSearchParams({ sensor, range });
      return this.#request(`/api/devices/${encodeURIComponent(device)}/history?${query}`);
    }

    async #request(url, options) {
      const response = await this.fetch(url, options);
      let body;
      try { body = await response.json(); } catch (_error) { body = null; }
      if (!response.ok) {
        const error = new Error(body?.error || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.code = body?.code;
        throw error;
      }
      return body;
    }
  }

  return { DashboardApi };
}));
