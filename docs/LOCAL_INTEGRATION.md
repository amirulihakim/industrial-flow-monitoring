# Local End-to-End Integration Guide

## Scope

This guide verifies the **2026 reconstruction** locally. It does not connect to
PT Timah infrastructure or install MySQL, Mosquitto, serial drivers, or virtual
serial-port software automatically.

## Prerequisites

- Node.js 18 or later and `npm install` completed
- MySQL 8 for persistence/history verification
- Mosquitto plus `mosquitto_pub` for MQTT verification
- Optional Modbus RTU simulator and virtual or physical serial port

## 1. Prepare MySQL

Follow `docs/DATABASE_SETUP.md`: create the local database/user, apply
`sql/schema.sql` and `sql/seed.sql`, and export the `DB_*` variables plus
`PERSISTENCE_INTERVAL_MS`.

Verify MySQL independently:

```sh
mysql -u flow_monitor -p industrial_flow_monitoring -e "SELECT code FROM devices ORDER BY id"
```

## 2. Verify simulation end to end

Set `DATA_SOURCE=simulation`, run `npm start`, open `http://localhost:3000`, and
verify this sequence:

1. `/health` reports simulation source, realtime connected, and persistence connected.
2. The dashboard receives changing values through `/realtime` without repeated latest-state requests.
3. After one persistence interval, `sensor_readings` contains `source=simulation` rows.
4. `/api/devices/PCWP/history?sensor=flow_rate&range=1h` returns bounded points.
5. The Historical Data view renders those points.

## 3. Verify MQTT end to end

Start a local Mosquitto broker, then set:

```text
DATA_SOURCE=mqtt
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MQTT_TOPIC_TEMPLATE=timah-monitoring/<device>/telemetry
```

Set `MQTT_USERNAME` and `MQTT_PASSWORD` only if required locally. Start the
application and confirm `/health` reports a connected MQTT source. Publish a
complete reconstruction payload:

```sh
mosquitto_pub -h 127.0.0.1 -t timah-monitoring/PCWP/telemetry -m '{"quality":"good","status":"online","values":{"flow_rate":80.1,"flow_velocity":1.2,"flow_percentage":66.75,"instant_heat":0.72,"temperature_in":28.1,"temperature_out":32.6,"positive_total":1001.2,"negative_total":5,"heating_total":120.1,"cooling_total":20}}'
```

Verify dashboard WebSocket delivery, database rows tagged `source=mqtt`, the
historical API, and the Historical Data chart.

## 4. Verify Modbus decoding without hardware

The automated fake transport requires no serial port:

```sh
node --test test/modbus-mapping.test.js test/modbus-source.test.js
```

It verifies mapping validation, integer/float conversion, byte and word order,
scaling, failure handling, canonical pipeline output, and Modbus provenance.

## 5. Optional local Modbus RTU integration

1. Copy `config/modbus.example.json` to an untracked local file.
2. Configure a Modbus RTU simulator and virtual serial-port pair.
3. Replace every synthetic address/conversion with the simulator's documented values.
4. Set the local serial framing, unit IDs, and polling interval.
5. Set `DATA_SOURCE=modbus` and `MODBUS_CONFIG_PATH` to the local file.
6. Start the application and verify `/health` reports `source.type=modbus`.
7. Verify dashboard WebSocket updates, MySQL rows tagged `source=modbus`, the historical API, and historical chart.
8. Stop the simulator and confirm source health degrades while HTTP, static serving, WebSocket service, and historical REST stay available.

The adapter reads holding registers (function code 03). That is a V2
implementation choice, not proof of the function code used historically.

## Completion record

Record software versions, local-only configuration filenames, test time, health
response, database row counts by source, and serial/broker errors. Do not commit
credentials, plant addresses, or unverified register maps.
