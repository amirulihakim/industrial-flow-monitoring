# Rebuild Plan

## Guiding rule

Rebuild in small, testable milestones.

Do not ask Codex to "clean up the entire project" in one pass.

Each milestone ends with:

- working code;
- a short test report;
- a small diff;
- documentation updated;
- an explicit stop before the next milestone.

---

# Milestone 0 — Workspace and evidence freeze

## Goal

Create a clean reconstruction repository while preserving the original repository untouched.

## Actions

1. Clone the original repository as `dashboard-legacy`.
2. Create `industrial-flow-monitoring`.
3. Put this context pack in the new repository.
4. Initialize Git.
5. Add `.gitignore`.
6. Add `.env.example`.
7. Record the starting state.

## Exit criteria

- legacy repository is unchanged;
- new repository has an initial commit;
- Codex can read both directories;
- documentation is readable.

Suggested commit:

```text
chore: initialize reconstruction workspace
```

---

# Milestone 1 — Legacy behavior map and application skeleton

## Goal

Have Codex inspect, not rewrite, the historical code and create only the lean V2 skeleton.

## Deliverables

```text
public/
server/
sql/
test/
package.json
README.md
```

Plus a short `docs/LEGACY_BEHAVIOR_MAP.md` generated from actual inspection.

## No database yet

The app may expose:

```text
GET /health
```

and serve a placeholder page.

## Exit criteria

- app starts;
- health endpoint works;
- legacy behavior map references actual files;
- no legacy files changed.

Suggested commit:

```text
chore: create lean application skeleton
```

---

# Milestone 2 — Simulation engine

## Goal

Create stable synthetic telemetry before building the full UI.

## Required scenarios

```text
normal
low_flow
pump_stopped
high_temperature
sensor_fault
```

## Requirements

- deterministic seed option for tests;
- gradual values rather than independent random jumps;
- derived/related values where reasonable;
- source clearly marked `simulation`;
- canonical sensor names only.

## Exit criteria

- simulator runs for all three device codes;
- unit tests cover scenario transitions;
- no MySQL/MQTT dependency required.

Suggested commit:

```text
feat: add synthetic telemetry engine
```

---

# Milestone 3 — Unified live dashboard

## Goal

Replace copied device pages with one device-agnostic dashboard.

## Required UI

- simulation badge;
- device selector;
- connection status;
- latest timestamp;
- current-value cards;
- six live charts;
- optional totalizer cards.

## Initial transport

It is acceptable to use a simple latest-state API during this milestone if that makes UI verification easier.

Do not optimize transport before the UI/data contract is stable.

## Exit criteria

- PCWP/SCWP1/SCWP2 use the same page;
- switching device does not reload duplicated HTML;
- charts cleanly reset/rebind;
- no unbounded array growth;
- no template filler.

Suggested commit:

```text
feat: build unified realtime dashboard
```

---

# Milestone 4 — MySQL historical persistence

## Goal

Restore database-backed time history using the new documented schema.

## Deliverables

```text
sql/schema.sql
sql/seed.sql
server/db.js
historical repository/service
```

## Requirements

- no credentials in source;
- synthetic rows tagged `source=simulation`;
- timestamp handling tested;
- useful indexes;
- graceful database-error state.

## Exit criteria

- samples persist;
- device/sensor/time query works;
- fresh install can create schema and seed demo data.

Suggested commit:

```text
feat: add historical mysql persistence
```

---

# Milestone 5 — Historical chart API and UI

## Goal

Restore the original project's major historical-view capability in a cleaner form.

## Ranges

```text
1h
8h
1d
7d
1mo
1y
all
```

## Requirements

- server-side aggregation;
- <= 1,000 returned points per series;
- device + sensor + range selectors;
- no-data state;
- response identifies aggregation used.

## Exit criteria

- each range returns valid points;
- long ranges remain responsive;
- SQL queries are parameterized.

Suggested commit:

```text
feat: add aggregated historical trends
```

---

# Milestone 6 — Realtime WebSocket path

## Goal

Stop repeated HTTP polling for live values.

## Architecture

```text
source -> normalized state -> persistence
                         -> WebSocket -> browser
```

## Requirements

- one connection per tab;
- reconnect/backoff;
- stale state;
- no duplicate listeners after device switching;
- REST remains for history.

## Exit criteria

- live charts update via WebSocket;
- temporary server restart reconnects cleanly;
- browser does not keep old timers/connections.

Suggested commit:

```text
refactor: stream realtime telemetry over websocket
```

---

# Milestone 7 — MQTT ingestion adapter

## Goal

Add a production-like ingestion path while keeping simulation mode.

## Requirements

- source abstraction;
- normalized telemetry contract;
- configurable broker URL/topic;
- `.env.example`;
- no real credentials;
- malformed payload handling.

## Exit criteria

- simulation and MQTT sources can be selected by configuration;
- frontend is unchanged regardless of source;
- MQTT messages are normalized before storage/broadcast.

Suggested commit:

```text
feat: add mqtt telemetry source
```

---

# Milestone 8 — Modbus adapter / hardware reconstruction

## Goal

Add direct Modbus input only after sufficient register-map evidence is available.

## Important

Do **not** guess original registers.

Until verified, build the adapter framework using a configurable mapping file and a test/mock Modbus server.

## Exit criteria

- configurable serial parameters;
- register mapping is externalized;
- byte/word-order conversion is tested;
- simulator remains available.

Suggested commit:

```text
feat: add configurable modbus source
```

---

# Milestone 9 — Portfolio deployment

## Goal

Deploy a safe public demo.

## Portfolio mode

Must:

- default to simulation;
- visibly disclose synthetic data;
- contain no company secrets;
- not require plant infrastructure;
- optionally use seeded historical data;
- provide a stable demo even if database hosting is unavailable.

## Final README sections

- project origin;
- original internship scope;
- 2026 reconstruction;
- architecture;
- screenshots;
- live demo;
- local setup;
- simulation notice;
- technical lessons;
- limitations.

Suggested commit:

```text
docs: prepare portfolio release
```

---

# Milestone discipline

Before every milestone ask Codex to:

1. read `AGENTS.md`;
2. read the relevant docs;
3. inspect the legacy files involved;
4. summarize plan before editing;
5. list assumptions;
6. implement only the requested milestone;
7. run tests;
8. report changed files;
9. stop.

If Codex proposes a major stack change, require justification before accepting it.
