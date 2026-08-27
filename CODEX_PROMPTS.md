# Copy/Paste Codex Prompts

Use these prompts in order. Edit paths only if your workspace layout differs.

---

# Prompt 0 — Audit before touching code

```text
Read industrial-flow-monitoring/AGENTS.md and every Markdown file under
industrial-flow-monitoring/docs/.

Then inspect the legacy repository at dashboard-legacy READ ONLY.

Focus on:
- README.md
- src/index.html
- src/index.js
- src/pcwp.html
- src/scwp1.html
- src/scwp2.html
- src/historical-charts.html
- src/js/demo/chart-area-demo.js
- src/js/demo/chart-data-filter.js
- src/package.json

If a listed path does not exist, search for the equivalent.

Do not modify any file yet.

Return:
1. the actual legacy runtime flow you can prove from code;
2. duplicated/dead/template material;
3. endpoints and external dependencies the frontend expects;
4. contradictions with docs/LEGACY_AUDIT.md;
5. unanswered questions;
6. a proposed file list for Milestone 1 only.

Do not infer missing historical backend behavior as fact.
```

---

# Prompt 1 — Milestone 1 skeleton

```text
Read AGENTS.md and docs/REBUILD_PLAN.md.

Implement Milestone 1 only in industrial-flow-monitoring.

Requirements:
- never modify ../dashboard-legacy;
- keep dependencies minimal;
- create a simple Node.js server;
- add GET /health;
- serve a minimal placeholder page;
- create the target source folders only when actually needed;
- add .gitignore and .env.example;
- add docs/LEGACY_BEHAVIOR_MAP.md based only on inspected code;
- do not add MySQL, MQTT, WebSocket, simulator, authentication, or framework UI yet.

Run the app and verify /health.

At the end report:
- files changed;
- commands run;
- test result;
- assumptions;
- anything discovered in legacy code that should update the audit.

Stop after Milestone 1.
```

---

# Prompt 2 — Milestone 2 simulator

```text
Read AGENTS.md, docs/SYSTEM_SPEC.md, docs/DATA_MODEL.md, and
docs/REBUILD_PLAN.md.

Implement Milestone 2 only: the synthetic telemetry engine.

Requirements:
- support PCWP, SCWP1, SCWP2;
- canonical sensor names only;
- scenarios: normal, low_flow, pump_stopped, high_temperature, sensor_fault;
- deterministic seed option for automated tests;
- gradual stateful changes, not independent Math.random() values;
- derive flow_velocity and flow_percentage from flow behavior/config where practical;
- monotonic totalizers under normal flow;
- source must be simulation;
- do not claim physical-model accuracy;
- no MySQL, MQTT, Modbus, or WebSocket yet.

Expose enough of the simulator through a temporary local API to inspect current state.

Add tests for:
- all device codes;
- normal-state finite values;
- pump-stopped flow decay;
- fault quality/state;
- totalizers not decreasing in normal operation.

Run tests and report results.

Stop after Milestone 2.
```

---

# Prompt 3 — Milestone 3 unified dashboard

```text
Read AGENTS.md, docs/SYSTEM_SPEC.md, docs/LEGACY_AUDIT.md, and
docs/REBUILD_PLAN.md.

Inspect these legacy files read-only before implementing:
../dashboard-legacy/src/pcwp.html
../dashboard-legacy/src/scwp1.html
../dashboard-legacy/src/scwp2.html
../dashboard-legacy/src/js/demo/chart-area-demo.js

Implement Milestone 3 only.

Build one device-agnostic monitoring page for PCWP, SCWP1, and SCWP2.

Preserve the useful legacy behavior:
- latest values;
- six live trends;
- recognizable industrial dashboard layout.

Improve:
- one page instead of copies;
- one Chart.js version;
- canonical sensor IDs;
- no generic SB Admin pages;
- clear SIMULATION MODE badge;
- clear stale/disconnected states;
- no unbounded chart arrays.

Using temporary latest-state polling is acceptable in this milestone.
Do not implement MySQL/MQTT/Modbus yet.

Run the application and test device switching.

At the end report exact legacy behaviors preserved and exact legacy clutter not carried forward.

Stop after Milestone 3.
```

---

# Prompt 4 — Milestone 4 MySQL

```text
Read AGENTS.md, docs/DATA_MODEL.md, docs/SYSTEM_SPEC.md, and
docs/REBUILD_PLAN.md.

Implement Milestone 4 only.

Add MySQL persistence using mysql2 and parameterized queries.

Requirements:
- schema.sql;
- seed.sql;
- devices table;
- sensor_readings table;
- all simulation rows marked source=simulation;
- configuration only through environment variables;
- .env.example placeholders only;
- no committed credentials;
- graceful startup/runtime behavior if DB is unavailable;
- timestamp handling must be explicit;
- do not add MQTT/WebSocket/Modbus yet.

Provide setup commands for a fresh local database.

Add tests where practical without requiring destructive access to a real database.

Stop after Milestone 4.
```

---

# Prompt 5 — Milestone 5 history

```text
Read AGENTS.md, docs/SYSTEM_SPEC.md, docs/DATA_MODEL.md, and
docs/REBUILD_PLAN.md.

Inspect legacy historical-chart code read-only:
../dashboard-legacy/src/historical-charts.html
../dashboard-legacy/src/js/demo/chart-data-filter.js

Implement Milestone 5 only.

Add:
GET /api/devices/:deviceCode/history

Support:
1h, 8h, 1d, 7d, 1mo, 1y, all

Requirements:
- device validation;
- sensor validation;
- parameterized SQL;
- bounded results;
- server-side aggregation;
- response states the aggregation used;
- historical UI with device/sensor/range selection;
- no-data and DB-error states;
- <=1000 chart points per series.

Do not implement MQTT or Modbus.

Test every range.

Stop after Milestone 5.
```

---

# Prompt 6 — Milestone 6 realtime WebSocket

```text
Read AGENTS.md, docs/SYSTEM_SPEC.md, and docs/REBUILD_PLAN.md.

Implement Milestone 6 only.

Replace live dashboard polling with a WebSocket realtime path.

Requirements:
- one connection per browser tab;
- coherent device-state event payload;
- reconnect with backoff;
- visible disconnected and stale state;
- device switching must not create duplicate listeners;
- REST remains for historical queries;
- persistence continues independently;
- add a simple connection-status test/manual verification procedure.

Do not add MQTT or Modbus yet.

Stop after Milestone 6.
```

---

# Prompt 7 — Milestone 7 MQTT adapter

```text
Read AGENTS.md, docs/SYSTEM_SPEC.md, docs/EVIDENCE_REGISTER.md, and
docs/REBUILD_PLAN.md.

Implement Milestone 7 only.

Create a TelemetrySource abstraction with at least:
- SimulationSource
- MqttSource

Requirements:
- frontend behavior unchanged;
- MQTT broker and topics configurable;
- V2 topic convention must be labeled reconstruction, not historical fact;
- normalize incoming payloads to canonical sensor names before persistence/broadcast;
- reject malformed/unknown values;
- no credentials in repository;
- simulation remains the default safe mode.

Do not implement Modbus registers yet.

Stop after Milestone 7.
```

---

# Prompt 8 — New evidence review

Use this whenever old files are recovered.

```text
Read AGENTS.md and docs/EVIDENCE_REGISTER.md.

Inspect evidence/inbox READ ONLY.

Compare the recovered files against:
- docs/PROJECT_CONTEXT.md
- docs/LEGACY_AUDIT.md
- docs/SYSTEM_SPEC.md
- the surviving dashboard-legacy repository

Do not implement or refactor code yet.

Report:
1. new historical facts now confirmed;
2. previous assumptions disproved;
3. unresolved conflicts;
4. security/confidentiality concerns;
5. exact proposed updates to EVIDENCE_REGISTER.md;
6. whether SYSTEM_SPEC.md should change.

Do not treat reconstructed V2 behavior as historical evidence.
```

---

# Prompt 9 — Pre-portfolio audit

```text
Read AGENTS.md and docs/PORTFOLIO_BOUNDARIES.md.

Audit the entire reconstruction repository for portfolio release.

Check:
- secrets and private addresses;
- wording that implies synthetic data is real;
- claims not supported by historical evidence;
- dead/template files;
- unused dependencies;
- duplicate code;
- unreachable routes;
- browser console errors;
- API error handling;
- WebSocket reconnect behavior;
- historical query bounds;
- accessibility basics;
- README clarity.

Do not make broad changes immediately.

First return a prioritized audit:
P0 = must fix before public
P1 = should fix
P2 = optional polish

Then wait for approval.
```
