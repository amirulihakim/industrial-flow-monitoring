# Industrial Flow Monitoring

This repository is a 2026 reconstruction/refactor of an industrial sensor-monitoring prototype developed during a 2024–2025 PT Timah Industri internship. The surviving original code is retained separately in `../dashboard-legacy/` and is not modified by this project.

## Historical boundary

The internship report documents work involving industrial sensor monitoring, Modbus/RS-485, Node-RED, MySQL, MQTT/Mosquitto, WebSocket concepts, and real-time and historical visualization. The surviving repository proves portions of the browser interface and its expected HTTP contracts, but it does not preserve a complete matching backend.

Everything implemented in this repository is a reconstruction unless explicitly identified as report-documented or surviving-code evidence. Future public telemetry will be synthetic and clearly labelled; this application is not connected to PT Timah Industri infrastructure.

## Reconstructed capabilities

The current reconstruction adds the complete bounded historical path to the
existing live dashboard and stateful synthetic telemetry engine. It provides:

- a small Express application;
- a unified responsive monitoring dashboard;
- `GET /health`;
- synthetic state for PCWP, SCWP1, and SCWP2;
- normal, low-flow, stopped-pump, high-temperature, and sensor-fault scenarios;
- a one-shot latest-state inspection API;
- five totalizer cards and six bounded live charts;
- device and simulation-scenario selection;
- explicit online, stale, fault, and disconnected presentation;
- long-format `devices` and `sensor_readings` tables;
- canonical validation and explicit UTC-to-`DATETIME(3)` conversion;
- configurable, guarded persistence with connected/degraded health status;
- a validated historical API with fixed and adaptive server-side averages;
- an explicitly labeled deterministic synthetic-history fallback when MySQL is unavailable in portfolio mode;
- historical device, sensor, and range controls with explicit error states;
- one reconnecting `/realtime` WebSocket connection per browser tab;
- interchangeable simulation and server-side MQTT telemetry sources;
- an external-map-driven Modbus RTU source for reconstruction and local testing;
- one normalized state pipeline shared by latest state, persistence, and broadcast;
- automated simulator, API, dashboard, persistence, health, and static-serving tests.

It does not implement authentication, alarms, industrial control, or a verified
historical instrument register map.

## Requirements

- Node.js 18 or later

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000/`. To check service health, request `http://localhost:3000/health`.

The port defaults to `3000` and can be overridden with the `PORT` environment variable.

`DATA_SOURCE=simulation` is the safe default. Supported reconstruction sources
are `simulation`, `mqtt`, and `modbus`. See
`docs/REALTIME_TRANSPORT.md` for the reconstruction-only MQTT topic/payload
contract, `config/modbus.example.json` for the synthetic mapping format, and
`docs/MODBUS_SOURCE.md` and `docs/LOCAL_INTEGRATION.md` for adapter details and
the end-to-end local test sequence.

MySQL is optional at process startup: missing configuration or an unavailable
database produces degraded persistence status without stopping live simulation.
With `PORTFOLIO_MODE=true` (the default), historical requests fall back to
clearly identified synthetic history rather than appearing to be recovered or
live plant data.
See `docs/DATABASE_SETUP.md` for reproducible setup and integration checks.

## Temporary simulation API

```text
GET /api/simulation
GET /api/devices/:deviceCode/latest
GET /api/devices/:deviceCode/scenario
PUT /api/devices/:deviceCode/scenario
GET /api/devices/:deviceCode/history?sensor=flow_rate&range=1h
```

The `PUT` route accepts JSON such as `{ "scenario": "low_flow" }`. It changes
only synthetic demo state and is not an industrial control interface.

All values are synthetic. The configurable assumptions and relationships are
documented in `docs/SIMULATION_ASSUMPTIONS.md`.

The public portfolio interface states:

```text
SIMULATION MODE
Synthetic telemetry for portfolio demonstration.
Not connected to PT Timah Industri infrastructure.
```

Historical ranges are `1h`, `8h`, `1d`, `7d`, `1mo`, `1y`, and `all`.
Every response identifies its aggregation and is bounded to 1,000 points.
The latest-state route remains available for one-shot inspection, but the live
dashboard no longer polls it; realtime updates arrive through WebSocket.

## Test

```sh
npm test
```

## Documentation

- `docs/LEGACY_BEHAVIOR_MAP.md` records behavior directly supported by surviving code and separates it from report evidence, inference, and unknowns.
- `docs/LEGACY_AUDIT.md` records technical debt and corrections discovered during inspection.
- `docs/SYSTEM_SPEC.md` defines intended future reconstruction behavior; it is not evidence that those behaviors existed historically.
- `docs/SIMULATION_ASSUMPTIONS.md` identifies all simulation-only relationships and historical verification gaps.
- `docs/DATABASE_SETUP.md` documents fresh MySQL setup, environment variables, and a manual integration test.
