const { DEVICE_CODES } = require('../simulation/constants');

const UPSERT_DEVICE_SQL = `
  INSERT INTO devices (code, display_name, enabled)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    enabled = VALUES(enabled)
`;

const SELECT_DEVICES_SQL = `
  SELECT id, code
  FROM devices
  WHERE enabled = ?
`;

class TelemetryRepository {
  constructor(pool) {
    this.pool = pool;
    this.deviceIds = new Map();
  }

  async initialize() {
    await this.pool.query('SELECT 1');

    for (const code of DEVICE_CODES) {
      await this.pool.execute(UPSERT_DEVICE_SQL, [code, code, true]);
    }

    const [rows] = await this.pool.execute(SELECT_DEVICES_SQL, [true]);
    this.deviceIds = new Map(rows.map((row) => [row.code, row.id]));

    for (const code of DEVICE_CODES) {
      if (!this.deviceIds.has(code)) throw new Error(`Seeded device could not be loaded: ${code}`);
    }
  }

  async insertReadings(readings) {
    if (readings.length === 0) return { affectedRows: 0 };

    const placeholders = readings.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    const sql = `
      INSERT INTO sensor_readings
        (device_id, sensor_type, value, recorded_at, quality, source, remark)
      VALUES ${placeholders}
    `;
    const parameters = [];

    for (const reading of readings) {
      const deviceId = this.deviceIds.get(reading.device);
      if (!deviceId) throw new Error(`Unknown persisted device: ${reading.device}`);
      parameters.push(
        deviceId,
        reading.sensorType,
        reading.value,
        reading.recordedAt,
        reading.quality,
        reading.source,
        reading.remark,
      );
    }

    const [result] = await this.pool.execute(sql, parameters);
    return result;
  }
}

module.exports = {
  SELECT_DEVICES_SQL,
  UPSERT_DEVICE_SQL,
  TelemetryRepository,
};

