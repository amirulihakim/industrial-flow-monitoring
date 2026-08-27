# V2 System Specification

## 1. Purpose

Build a lean reconstruction of the PT Timah Industri centralized sensor-monitoring project that:

- demonstrates the original industrial monitoring concept;
- is understandable by an engineering recruiter;
- can run without access to PT Timah Industri infrastructure;
- supports synthetic telemetry for public demonstration;
- preserves a path for real Modbus/MQTT input;
- stores and queries historical data;
- removes legacy duplication and template debris.

## 2. Non-goals for initial V2

Do not initially implement:

- industrial closed-loop control;
- actuator commands;
- authentication;
- multi-user authorization;
- cloud-scale infrastructure;
- machine learning;
- predictive maintenance algorithms;
- mobile apps;
- microservices;
- Kubernetes;
- unrelated SB Admin demo features.

These can be considered only after the core reconstruction works.

## 3. Devices

Canonical device codes:

```text
PCWP
SCWP1
SCWP2
```

Do not expand these abbreviations without supporting evidence.

Each device has:

```json
{
  "code": "PCWP",
  "displayName": "PCWP",
  "enabled": true
}
```

## 4. Canonical sensor identifiers

Use these identifiers across simulator, MQTT payloads, database, server, API, and tests:

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

UI labels may be:

| Internal key | UI label |
|---|---|
| `flow_rate` | Flow Rate |
| `flow_velocity` | Flow Velocity |
| `flow_percentage` | Flow Percentage |
| `instant_heat` | Instantaneous Heat |
| `temperature_in` | Inlet Temperature |
| `temperature_out` | Outlet Temperature |
| `positive_total` | Positive Total Flow |
| `negative_total` | Negative Total Flow |
| `heating_total` | Heating Total |
| `cooling_total` | Cooling Total |

**Units remain provisional until verified from original manuals/screenshots.**
Do not hard-code guessed engineering units into historical claims.

## 5. Data quality/status

Every current-state payload should carry a quality/status field.

Suggested values:

```text
good
stale
fault
simulated
unknown
```

Simulation mode may return `good` measurements while the source is separately identified as `simulation`.

## 6. Latest-state contract

Preferred route:

```http
GET /api/devices/:deviceCode/latest
```

Example:

```json
{
  "device": "PCWP",
  "source": "simulation",
  "timestamp": "2026-08-27T12:00:00.000Z",
  "status": "online",
  "measurements": {
    "flow_rate": 103.2,
    "flow_velocity": 1.92,
    "flow_percentage": 68.8,
    "instant_heat": 14.3,
    "temperature_in": 28.4,
    "temperature_out": 33.1
  },
  "totals": {
    "positive_total": 12450.2,
    "negative_total": 12.1,
    "heating_total": 885.3,
    "cooling_total": 214.8
  }
}
```

The example values above are illustrative only, not historical plant values.

## 7. Realtime contract

Preferred WebSocket event concept:

```json
{
  "type": "telemetry",
  "device": "PCWP",
  "source": "simulation",
  "timestamp": "2026-08-27T12:00:00.000Z",
  "values": {
    "flow_rate": 103.2,
    "flow_velocity": 1.92,
    "flow_percentage": 68.8,
    "instant_heat": 14.3,
    "temperature_in": 28.4,
    "temperature_out": 33.1
  }
}
```

One event should contain the coherent state for one device/time step rather than sending unrelated values independently.

The browser must:

- reconnect with backoff;
- show disconnected state;
- detect stale telemetry;
- avoid creating duplicate listeners after device changes.

## 8. Historical API

Preferred route:

```http
GET /api/devices/:deviceCode/history
```

Query parameters:

```text
sensor=<canonical sensor key>
range=<1h|8h|1d|7d|1mo|1y|all>
```

Optional:

```text
from=<ISO timestamp>
to=<ISO timestamp>
```

Response:

```json
{
  "device": "PCWP",
  "sensor": "flow_rate",
  "range": "1h",
  "aggregation": "10s_avg",
  "points": [
    {
      "timestamp": "2026-08-27T11:59:00.000Z",
      "value": 102.7
    }
  ]
}
```

## 9. Historical aggregation

Do not send unbounded raw sensor history to the browser.

Initial target policy:

| Range | Target aggregation |
|---|---|
| real-time | live stream |
| 1 hour | 10-second mean |
| 8 hours | 1-minute mean |
| 1 day | 5-minute mean |
| 7 days | 30-minute mean |
| 1 month | 2-hour mean |
| 1 year | 1-day mean |
| all | adaptive / bounded |

Exact policy may be adjusted after testing.

Target maximum chart payload:

```text
<= 1,000 points per requested series
```

## 10. Simulation engine

Public portfolio mode uses synthetic telemetry.

Required scenarios:

```text
normal
low_flow
pump_stopped
high_temperature
sensor_fault
```

The simulator must avoid independent random-number noise.

Use a stateful process model:

- values drift gradually;
- flow velocity should broadly track flow rate;
- flow percentage should be derived from a configurable nominal/rated flow;
- totalizers should be monotonic except when deliberately reset in a test fixture;
- pump-stopped state should decay toward zero flow;
- temperature should change gradually;
- fault state should communicate invalid/stale quality rather than generating a plausible normal measurement.

Do not claim the simulator is a validated thermofluid model.

Its purpose is credible UI/system demonstration.

## 11. Data-source abstraction

The server should expose a common internal interface regardless of source.

Conceptually:

```text
TelemetrySource
├── SimulationSource
├── MqttSource
└── ModbusSource       # later milestone
```

Expected internal normalized sample:

```json
{
  "device": "PCWP",
  "timestamp": "2026-08-27T12:00:00.000Z",
  "source": "simulation",
  "values": {
    "flow_rate": 103.2
  }
}
```

The UI must not contain Modbus-specific logic.

## 12. Persistence behavior

For each normalized telemetry sample:

1. validate device;
2. validate sensor identifiers;
3. validate finite numeric values;
4. timestamp consistently;
5. write accepted values to historical storage;
6. update latest in-memory state;
7. broadcast realtime state.

Database failure should not necessarily crash realtime simulation; the UI should indicate degraded history/persistence status.

## 13. MQTT role

MQTT belongs on the ingestion side of the architecture.

The V2 should support a configurable topic convention, for example:

```text
timah-monitoring/<device>/telemetry
```

This topic is a reconstruction convention unless original topic evidence is later recovered.

Do not present it as the original internship topic.

If original MQTT topics are recovered, document them separately from the clean V2 convention.

## 14. UI structure

Initial application navigation:

```text
Overview / Monitoring
Historical Data
System / About
```

The main monitoring screen should include:

- prominent `SIMULATION` or source badge;
- device selector;
- connection status;
- latest timestamp;
- KPI cards;
- six live trend charts;
- totalizer cards if supported;
- scenario selector only in portfolio/demo mode.

Historical screen:

- device selector;
- sensor selector;
- time-range selector;
- one large trend chart;
- aggregation/resolution note;
- no-data state.

## 15. Visual direction

Preserve enough visual lineage from the original dashboard that the relationship is recognizable, but simplify:

- fewer cards;
- clearer hierarchy;
- no template filler;
- no fake account controls;
- responsive layout;
- industrial/technical presentation;
- readable units;
- restrained animation.

## 16. Runtime modes

Suggested environment variable:

```text
DATA_SOURCE=simulation
```

Possible future values:

```text
simulation
mqtt
modbus
```

Suggested public mode:

```text
PORTFOLIO_MODE=true
```

Portfolio mode must:

- show synthetic-data disclosure;
- disable any plant/private integration;
- use safe default config;
- run from seed/demo history when needed.

## 17. Performance targets

These are reconstruction targets, not claims about the internship system:

- no more than one realtime connection per browser tab;
- latest-state API response comfortably under 200 ms on local development hardware;
- historical response bounded to <= 1,000 points per series;
- dashboard should remain responsive during a 30-minute open-tab test;
- no unbounded chart-array growth.

## 18. Acceptance criteria for V2 core

V2 core is complete when:

1. one dashboard handles all three device codes;
2. simulation mode runs without external hardware;
3. realtime telemetry updates continuously;
4. data persists in MySQL;
5. historical ranges query correctly;
6. the UI clearly identifies simulation;
7. reconnect/stale/error states are visible;
8. tests cover main data contracts and simulator states;
9. legacy repository has not been modified;
10. documentation correctly distinguishes original vs reconstruction.
