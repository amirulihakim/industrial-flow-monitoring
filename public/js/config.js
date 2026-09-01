(function exposeFrontendConfig(root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.TIMAH_FRONTEND_CONFIG = config;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createFrontendConfig() {
  return Object.freeze({
    mqtt: Object.freeze({
      brokerUrl: 'wss://b68c65552c904a7bbb9a9e7a2a7d2009.s1.eu.hivemq.cloud:8884/mqtt',
      protocolVersion: 4,
      username: 'timah-web',
      // Public, subscribe-only portfolio credential. Restrict it to amirul/timah-monitoring/# in HiveMQ Cloud.
      password: 'amirulihakim',
    }),
  });
}));
