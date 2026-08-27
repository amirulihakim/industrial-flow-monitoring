const MAX_HISTORY_POINTS = 1000;

const RANGE_POLICIES = Object.freeze({
  '1h': Object.freeze({ rangeSeconds: 60 * 60, bucketSeconds: 10, aggregation: '10s_avg' }),
  '8h': Object.freeze({ rangeSeconds: 8 * 60 * 60, bucketSeconds: 60, aggregation: '1m_avg' }),
  '1d': Object.freeze({ rangeSeconds: 24 * 60 * 60, bucketSeconds: 5 * 60, aggregation: '5m_avg' }),
  '7d': Object.freeze({ rangeSeconds: 7 * 24 * 60 * 60, bucketSeconds: 30 * 60, aggregation: '30m_avg' }),
  '1mo': Object.freeze({ rangeSeconds: 30 * 24 * 60 * 60, bucketSeconds: 2 * 60 * 60, aggregation: '2h_avg' }),
  '1y': Object.freeze({ rangeSeconds: 365 * 24 * 60 * 60, bucketSeconds: 24 * 60 * 60, aggregation: '1d_avg' }),
});

const SUPPORTED_RANGES = Object.freeze([...Object.keys(RANGE_POLICIES), 'all']);

function fixedPolicy(range) {
  return RANGE_POLICIES[range] ?? null;
}

function adaptivePolicy(minimumTimestamp, maximumTimestamp) {
  if (!minimumTimestamp || !maximumTimestamp) {
    return { rangeSeconds: null, bucketSeconds: 1, aggregation: 'adaptive_1s_avg' };
  }
  const spanSeconds = Math.max(1, Math.ceil((Date.parse(maximumTimestamp) - Date.parse(minimumTimestamp)) / 1000));
  const bucketSeconds = Math.max(1, Math.ceil(spanSeconds / MAX_HISTORY_POINTS));
  return { rangeSeconds: null, bucketSeconds, aggregation: `adaptive_${bucketSeconds}s_avg` };
}

module.exports = { MAX_HISTORY_POINTS, RANGE_POLICIES, SUPPORTED_RANGES, adaptivePolicy, fixedPolicy };
