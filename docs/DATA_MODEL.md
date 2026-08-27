# Data Model

## 1. Historical schema preserved in internship report

The original report documents this table:

```sql
CREATE TABLE `sensor_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL,
  `sensor_type` varchar(20) DEFAULT NULL,
  `reading` float NOT NULL,
  `reading_datetime` datetime NOT NULL,
  `remark` text,
  PRIMARY KEY (`id`),
  KEY `idx_sensor_time` (`reading_datetime`),
  KEY `idx_device_time` (`device_id`,`reading_datetime`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
```

This is evidence of the original structure.

The original data rows are no longer available.

## 2. V2 design goals

The reconstruction database should:

- remain understandable;
- preserve a long-format sensor-reading model;
- support device/sensor/time queries efficiently;
- allow synthetic seeded history;
- avoid unnecessary schema complexity;
- support later MQTT or Modbus ingestion.

## 3. Proposed V2 schema

### `devices`

```sql
CREATE TABLE devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_code (code)
);
```

Initial seed:

```sql
INSERT INTO devices (code, display_name)
VALUES
  ('PCWP', 'PCWP'),
  ('SCWP1', 'SCWP1'),
  ('SCWP2', 'SCWP2');
```

Do not expand the abbreviations without evidence.

### `sensor_readings`

```sql
CREATE TABLE sensor_readings (
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
);
```

## 4. Canonical sensor keys

Accepted initial values:

```text
flow_rate
flow_velocity
flow_percentage
instant_heat
temperature_in
temperature_out
positive_total
negative_total
heating_total
cooling_total
```

Validation should occur in application code.

Do not silently store spelling variants.

## 5. Why long-format readings are retained

A wide row such as:

```text
flow_rate | flow_velocity | temperature_in | ...
```

would be simpler for one fixed instrument, but the original project concept is a centralized sensor store and the historical schema already used:

```text
device_id + sensor_type + reading
```

Keeping that structure:

- remains faithful to the original concept;
- supports sensors being added later;
- simplifies generic historical endpoints;
- makes the reconstructed schema easy to explain.

## 6. Latest values

Do not create a separate latest-value SQL table initially.

The server should keep the current normalized device state in memory for realtime broadcasting.

If the application restarts, it may query the latest historical rows.

Only add a dedicated latest-state table if profiling shows a real need.

## 7. Timestamp policy

Application/API timestamps:

```text
ISO 8601 UTC
```

Database:

```text
DATETIME(3)
```

The server should explicitly convert rather than depending on ambiguous local timezone behavior.

The portfolio UI may display timestamps in the viewer's local timezone.

## 8. Quality field

Initial allowed application values:

```text
good
stale
fault
simulated
unknown
```

For a simulation source, it is preferable to keep:

```text
source = simulation
quality = good
```

when the synthetic sensor is behaving normally.

A simulated fault can use:

```text
source = simulation
quality = fault
```

This separates provenance from signal validity.

## 9. Historical aggregation

Preferred approach:

- query only the selected device and sensor;
- filter by time range;
- aggregate before returning data;
- cap payload size.

Exact MySQL queries should be implemented and benchmarked during the database milestone.

Do not write SQL tied to guessed production data volumes.

## 10. Synthetic seed data

The reconstruction may create generated data for:

- demo startup;
- chart development;
- historical range tests;
- portfolio deployment.

Synthetic rows must be distinguishable by:

```text
source = simulation
```

Never import synthetic rows and then describe them as recovered internship measurements.

## 11. Migration from historical schema

No literal migration of old rows is currently possible because the database contents were lost.

The relationship is:

```text
Original schema        -> documented historical evidence
V2 schema              -> reconstructed implementation
Synthetic seed rows    -> demonstration/test data
```

Do not use the word "migrated data" unless actual original rows are recovered later.

## 12. Optional future tables

Do not create these yet unless a milestone requires them:

- `alarms`
- `device_events`
- `mqtt_messages`
- `users`
- `roles`
- `audit_log`

A portfolio rebuild should stay lean.

## 13. Milestone 4 implementation note

Milestone 4 implements the documented `devices` and `sensor_readings` schema
without a material schema change. See `sql/schema.sql`, `sql/seed.sql`, and
`docs/DATABASE_SETUP.md`.

The persistence service accepts only the canonical sensor set, stores runtime
ISO timestamps as explicit UTC `DATETIME(3)` strings, and marks generated rows
with `source = simulation`.

The simulated `sensor_fault` scenario exposes null live measurements. Those
samples are not inserted because `sensor_readings.value` remains intentionally
`NOT NULL`; no zero or extreme placeholder is fabricated.
