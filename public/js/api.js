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

    async #request(url, options) {
      const response = await this.fetch(url, options);
      let body;
      try { body = await response.json(); } catch (_error) { body = null; }
      if (!response.ok) throw new Error(body?.error || `Request failed with status ${response.status}`);
      return body;
    }
  }

  return { DashboardApi };
}));

