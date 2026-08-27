# Industrial Flow Monitoring

This repository is a 2026 reconstruction/refactor of an industrial sensor-monitoring prototype developed during a 2024–2025 PT Timah Industri internship. The surviving original code is retained separately in `../dashboard-legacy/` and is not modified by this project.

## Historical boundary

The internship report documents work involving industrial sensor monitoring, Modbus/RS-485, Node-RED, MySQL, MQTT/Mosquitto, WebSocket concepts, and real-time and historical visualization. The surviving repository proves portions of the browser interface and its expected HTTP contracts, but it does not preserve a complete matching backend.

Everything implemented in this repository is a reconstruction unless explicitly identified as report-documented or surviving-code evidence. Future public telemetry will be synthetic and clearly labelled; this application is not connected to PT Timah Industri infrastructure.

## Milestone 2

Milestone 2 adds a deterministic, stateful synthetic telemetry engine to the
Milestone 1 application skeleton. It provides:

- a small Express application;
- a static placeholder page;
- `GET /health`;
- synthetic state for PCWP, SCWP1, and SCWP2;
- normal, low-flow, stopped-pump, high-temperature, and sensor-fault scenarios;
- a temporary local inspection API;
- automated simulator, API, health, and static-serving tests.

It does not implement MySQL, MQTT, Modbus, WebSocket, dashboards, charts,
authentication, industrial control, or historical queries.

## Requirements

- Node.js 18 or later

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000/`. To check service health, request `http://localhost:3000/health`.

The port defaults to `3000` and can be overridden with the `PORT` environment variable.

## Temporary simulation API

```text
GET /api/simulation
GET /api/devices/:deviceCode/latest
GET /api/devices/:deviceCode/scenario
PUT /api/devices/:deviceCode/scenario
```

The `PUT` route accepts JSON such as `{ "scenario": "low_flow" }`. It changes
only synthetic demo state and is not an industrial control interface.

All values are synthetic. The configurable assumptions and relationships are
documented in `docs/SIMULATION_ASSUMPTIONS.md`.

## Test

```sh
npm test
```

## Documentation

- `docs/LEGACY_BEHAVIOR_MAP.md` records behavior directly supported by surviving code and separates it from report evidence, inference, and unknowns.
- `docs/LEGACY_AUDIT.md` records technical debt and corrections discovered during inspection.
- `docs/SYSTEM_SPEC.md` defines intended future reconstruction behavior; it is not evidence that those behaviors existed historically.
- `docs/SIMULATION_ASSUMPTIONS.md` identifies all simulation-only relationships and historical verification gaps.
