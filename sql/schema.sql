-- 2026 reconstruction schema. This is not the preserved internship database.
CREATE TABLE IF NOT EXISTS devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_code (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id INT UNSIGNED NOT NULL,
  sensor_type VARCHAR(40) NOT NULL,
  value DOUBLE NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  quality VARCHAR(16) NOT NULL DEFAULT 'good',
  source VARCHAR(16) NOT NULL DEFAULT 'simulation',
  remark VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_sensor_time (sensor_type, recorded_at),
  KEY idx_device_time (device_id, recorded_at),
  KEY idx_device_sensor_time (device_id, sensor_type, recorded_at),
  CONSTRAINT fk_sensor_readings_device
    FOREIGN KEY (device_id) REFERENCES devices(id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

