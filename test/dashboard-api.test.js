const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DashboardApi } = require('../public/js/api');

test('default browser fetch retains its Window receiver', async (t) => {
  const originalWindow = global.window;
  const calls = [];
  const browserWindow = {
    async fetch(url, options) {
      assert.equal(this, browserWindow);
      calls.push({ url, options });
      return { ok: true, async json() { return { scenario: 'low_flow' }; } };
    },
  };
  global.window = browserWindow;
  t.after(() => { global.window = originalWindow; });

  const result = await new DashboardApi().setScenario('SCWP1', 'low_flow');

  assert.equal(result.scenario, 'low_flow');
  assert.equal(calls[0].url, '/api/devices/SCWP1/scenario');
  assert.equal(calls[0].options.method, 'PUT');
});
