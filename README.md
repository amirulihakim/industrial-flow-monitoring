# Industrial Flow Monitoring

This repository is a 2026 reconstruction/refactor of an industrial sensor-monitoring prototype developed during a 2024–2025 PT Timah Industri internship. The surviving original code is retained separately in `../dashboard-legacy/` and is not modified by this project.

## Historical boundary

The internship report documents work involving industrial sensor monitoring, Modbus/RS-485, Node-RED, MySQL, MQTT/Mosquitto, WebSocket concepts, and real-time and historical visualization. The surviving repository proves portions of the browser interface and its expected HTTP contracts, but it does not preserve a complete matching backend.

Everything implemented in this repository is a reconstruction unless explicitly identified as report-documented or surviving-code evidence. Future public telemetry will be synthetic and clearly labelled; this application is not connected to PT Timah Industri infrastructure.

## Milestone 1

Milestone 1 deliberately provides only:

- a small Express application;
- a static placeholder page;
- `GET /health`;
- automated health and static-serving tests;
- a code-derived legacy behavior map.

It does not yet implement telemetry, simulation, MySQL, MQTT, WebSocket, device dashboards, or historical queries.

## Requirements

- Node.js 18 or later

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000/`. To check service health, request `http://localhost:3000/health`.

The port defaults to `3000` and can be overridden with the `PORT` environment variable.

## Test

```sh
npm test
```

## Documentation

- `docs/LEGACY_BEHAVIOR_MAP.md` records behavior directly supported by surviving code and separates it from report evidence, inference, and unknowns.
- `docs/LEGACY_AUDIT.md` records technical debt and corrections discovered during inspection.
- `docs/SYSTEM_SPEC.md` defines intended future reconstruction behavior; it is not evidence that those behaviors existed historically.

