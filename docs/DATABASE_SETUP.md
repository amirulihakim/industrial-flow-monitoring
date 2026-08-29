# MySQL Setup and Manual Integration Test

## Scope and historical boundary

This database is part of the **2026 reconstruction**. It is not the lost original internship database, and generated rows are synthetic portfolio/test telemetry.

The schema follows `docs/DATA_MODEL.md`. Runtime timestamps are ISO 8601 UTC. Before insertion, they are explicitly converted to UTC `DATETIME(3)` strings such as:

```text
2026-08-27 12:34:56.789
```

## Prerequisites

- Node.js 18 or later
- MySQL 8 with permission to create a database and application user

## Fresh local setup

Run these statements as a local MySQL administrator. Choose your own local password rather than copying a credential into source control:

```sql
CREATE DATABASE industrial_flow_monitoring
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'flow_monitor'@'localhost' IDENTIFIED BY '<local-password>';
GRANT SELECT, INSERT, UPDATE ON industrial_flow_monitoring.*
  TO 'flow_monitor'@'localhost';
FLUSH PRIVILEGES;
```

Apply the repository schema and canonical device seed:

```sh
mysql -u root -p industrial_flow_monitoring < sql/schema.sql
mysql -u root -p industrial_flow_monitoring < sql/seed.sql
```

Set configuration in the process environment. PowerShell example:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_USER = 'flow_monitor'
$env:DB_PASSWORD = '<local-password>'
$env:DB_NAME = 'industrial_flow_monitoring'
$env:PERSISTENCE_INTERVAL_MS = '10000'
npm start
```

Do not commit the real password or a populated `.env` file.

## Manual integration test

1. Start MySQL and apply `sql/schema.sql` and `sql/seed.sql`.
2. Start the application with the variables above.
3. Request `GET http://localhost:3000/health`.
4. Wait at least one configured persistence interval.
5. Confirm health reports `persistence.state` as `connected`.
6. Query:

   ```sql
   SELECT d.code, r.sensor_type, r.value, r.recorded_at, r.quality, r.source
   FROM sensor_readings AS r
   JOIN devices AS d ON d.id = r.device_id
   ORDER BY r.recorded_at DESC, d.code, r.sensor_type
   LIMIT 30;
   ```

7. Verify that all returned sensor names are canonical and every row has `source = 'simulation'`.
8. Stop MySQL while leaving the application running. After the next interval, confirm `/health` reports `persistence.state = 'degraded'` while `/api/devices/PCWP/latest` and the dashboard continue responding.
9. Restart MySQL. The runner retries initialization on the next interval and should return to `connected` without restarting the application.

10. With persisted rows present, request `GET http://localhost:3000/api/devices/PCWP/history?sensor=flow_rate&range=1h`. Confirm the response identifies `10s_avg`, uses UTC ISO timestamps, and contains no more than 1,000 points. Repeat with `range=all` and confirm it reports an `adaptive_<seconds>s_avg` aggregation.

The fixed reconstruction ranges interpret `1mo` as the preceding 30 days and
`1y` as the preceding 365 days. These are V2 query-policy choices, not recovered
legacy backend behavior.

Fault scenario samples contain null measurements and are intentionally not inserted because `sensor_readings.value` is `NOT NULL`. The simulator and dashboard still expose the fault state live.

## Portfolio fallback

When `DATA_SOURCE=simulation`, `PORTFOLIO_MODE=true`, and MySQL history is
unavailable, the historical API returns deterministic synthetic demonstration
points with `source=simulation`, `fallback=true`, and an explicit notice. This
does not replace MySQL persistence: a reachable database remains the preferred
history path, and a valid empty database response remains an empty response.

Set `PORTFOLIO_MODE=false` when database failure should remain a `503` instead.
