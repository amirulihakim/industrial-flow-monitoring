const BOUNDS_SQL = `
  SELECT MIN(r.recorded_at) AS minimum_time, MAX(r.recorded_at) AS maximum_time
  FROM sensor_readings r
  INNER JOIN devices d ON d.id = r.device_id
  WHERE d.code = ? AND d.enabled = ? AND r.sensor_type = ?
`;

function aggregateSql(includeRange) {
  return `
    SELECT
      TIMESTAMPADD(
        SECOND,
        FLOOR(TIMESTAMPDIFF(SECOND, '1970-01-01 00:00:00', r.recorded_at) / ?) * ?,
        '1970-01-01 00:00:00'
      ) AS bucket_time,
      AVG(r.value) AS average_value
    FROM sensor_readings r
    INNER JOIN devices d ON d.id = r.device_id
    WHERE d.code = ? AND d.enabled = ? AND r.sensor_type = ?
      ${includeRange ? 'AND r.recorded_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? SECOND)' : ''}
    GROUP BY bucket_time
    ORDER BY bucket_time ASC
    LIMIT ?
  `;
}

class HistoryRepository {
  constructor(pool) { this.pool = pool; }

  async findBounds(device, sensor) {
    const [rows] = await this.pool.execute(BOUNDS_SQL, [device, true, sensor]);
    return { minimumTimestamp: rows[0]?.minimum_time ?? null, maximumTimestamp: rows[0]?.maximum_time ?? null };
  }

  async findAggregated({ device, sensor, rangeSeconds, bucketSeconds, limit }) {
    const includeRange = Number.isFinite(rangeSeconds);
    const parameters = [bucketSeconds, bucketSeconds, device, true, sensor];
    if (includeRange) parameters.push(rangeSeconds);
    parameters.push(limit);
    const [rows] = await this.pool.execute(aggregateSql(includeRange), parameters);
    return rows;
  }
}

module.exports = { BOUNDS_SQL, HistoryRepository, aggregateSql };
