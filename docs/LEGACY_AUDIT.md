# Legacy Repository Audit

## Repository under review

```text
../dashboard-legacy/
```

Historical public origin:

```text
https://github.com/amirulihakim/dashboard
```

This file is a working audit. Update it when new evidence is recovered.

## Status vocabulary

Use these labels when adding findings:

- **CONFIRMED-REPORT** — directly documented in the internship report.
- **CONFIRMED-CODE** — directly visible in surviving code.
- **INFERRED** — plausible interpretation from multiple clues.
- **UNKNOWN** — insufficient evidence.
- **CONFLICT** — surviving sources disagree.

## High-level finding

The surviving repository contains useful project logic embedded inside a large amount of inherited template code and development-stage experimentation.

The correct strategy is **behavioral reconstruction**, not line-by-line cleanup.

## Confirmed legacy characteristics

### 1. uibuilder origin — CONFIRMED-CODE

The repository root README identifies the project as a uibuilder blank template intended to receive Node-RED messages in a browser.

Implication:

- some root/source files are scaffolding rather than project logic;
- do not assume every file was part of the final dashboard.

### 2. SB Admin 2-derived frontend — CONFIRMED-CODE

The `src/` area contains an SB Admin 2-style dashboard structure, including template/demo pages and vendor assets.

Implication:

- large portions of the repository can be discarded in V2;
- preserve project behavior, not template completeness.

### 3. Device-specific duplicated pages — CONFIRMED-CODE

Surviving project pages include device-specific variants such as:

```text
pcwp.html
scwp1.html
scwp2.html
```

These should become one parameterized dashboard in V2.

A direct comparison shows that `pcwp.html`, `scwp1.html`, and `scwp2.html`
are effectively duplicate pages: only their titles/headings and insignificant
whitespace differ.

Their live KPI and chart requests do **not** include a device identifier. The
surviving code therefore proves three separately labelled pages, but does not
prove that those pages received three independently addressed live data feeds.
The numeric mappings visible elsewhere in the frontend are not authoritative
historical device mappings without separate evidence.

### 4. Real-time chart logic — CONFIRMED-CODE

Legacy chart code maps multiple sensor values into live Chart.js time-series plots.

Behavior worth preserving:

- continuous update;
- multiple industrial variables;
- bounded rolling time window;
- human-readable sensor labels.

The linked implementation in
`../dashboard-legacy/src/js/demo/chart-area-demo.js` polls
`http://localhost:3000/api/realtime` once per second. It is an HTTP-polling
path. The active pages load MQTT.js, but do not create a client, connect,
subscribe, or publish. No functioning MQTT or WebSocket browser path is proven
by the surviving linked frontend.

Displayed units and sensor strings are frontend literals. Treat them as
surviving UI evidence, not as authoritative historical engineering units or a
canonical sensor contract.

### 5. Historical chart filtering — CONFIRMED-CODE

Legacy historical chart logic contains multiple time-window options and expects aggregated values from the backend.

Behavior worth preserving:

- device selection;
- time-range selection;
- server-side or backend-side aggregation;
- chart resolution appropriate to the requested period.

The exact timeframe keys in the surviving client are:

```text
hour
8hours
day
month
year
```

The client expects records containing an `avg_value` field. This proves that it
expects aggregated values, but the backend/SQL implementation, aggregation
buckets, ordering, bounds, and source data are not preserved. Do not describe a
specific historical aggregation implementation as confirmed.

### 6. HTTP endpoints expected by frontend — CONFIRMED-CODE

Surviving front-end code references local endpoints such as:

```text
/api/realtime
/api/positive-flow
/api/negative-flow
/api/heat
/api/cool
/api/filtered-data
```

The overview also references:

```text
/api/new-reports-today
/api/pump-status/:deviceId
```

However, the complete server implementation providing these routes is not preserved in the public repository.

### 7. Backend incompleteness — CONFIRMED-CODE

The repository does not currently preserve a coherent server stack matching the frontend's expected API surface.

Treat the exact historical backend implementation as **UNKNOWN** until additional files are recovered.

The file `../dashboard-legacy/src/backend/data-fetch` does not supply a server;
it is an unreferenced browser-side fetch helper. It does not change this
finding.

### 8. Disconnected React manifest — CONFIRMED-CODE

`../dashboard-legacy/src/js/package.json` declares React 18 and Create React
App, but no corresponding active React application is present in the surviving
tree. The monitored pages are static HTML/JavaScript based on SB Admin 2. Treat
this manifest as disconnected experimentation unless new evidence establishes
otherwise.

### 9. Node-RED/MySQL/MQTT/WebSocket architecture — CONFIRMED-REPORT

The internship report describes Node-RED flows handling Modbus data, MySQL persistence, API interactions, MQTT/Mosquitto, and WebSocket communication.

The exact division of responsibility among those technologies over the project's successive development stages is not fully recoverable from the current repository.

## Technical debt to remove in V2

### Template debris

Remove unless genuinely required:

- generic login/register/forgot-password pages;
- generic button/card/table demo pages;
- unrelated example charts;
- unused fonts/icons/vendor files;
- "Coming Soon" navigation items;
- sample profile/account UI;
- dead uibuilder demonstration code.

### Page duplication

Replace copied device pages with:

```text
one page + device state/config
```

### Inconsistent sensor names

Legacy code uses different representations across layers, including human labels and abbreviated identifiers.

V2 must use one canonical internal vocabulary defined in `SYSTEM_SPEC.md`.

### Redundant polling

Legacy behavior appears to make multiple requests for values that can be delivered in a single latest-state payload.

More specifically, each active device page performs six KPI requests per
second—positive and negative values are each fetched twice—plus one
`/api/realtime` chart request per second. All use unparameterized live routes.

V2 should avoid one-endpoint-per-card polling.

### Multiple chart-library assumptions

Do not preserve multiple Chart.js versions or incompatible configuration styles.

The active device pages load both the local Chart.js bundle and CDN Chart.js
2.9.4. The historical page loads an unversioned CDN Chart.js and the local
Chart.js 2.9.4 bundle.

Choose one version and test it.

### Missing error handling

V2 must explicitly handle:

- backend unavailable;
- database unavailable;
- stale data;
- malformed telemetry;
- unknown device;
- no historical data;
- realtime disconnect/reconnect.

### Missing provenance boundaries

The legacy repository does not clearly distinguish original industrial data from later demonstration behavior.

V2 must visibly support **simulation mode** and state its provenance.

## Behaviors to preserve

The following are more important than visual fidelity:

1. Device selection.
2. Six principal live sensor trends.
3. Current-value KPI display.
4. Accumulated flow/thermal counters when supported.
5. Historical time filtering.
6. Database-backed history.
7. Industrial communication concept.
8. Local/portfolio-safe operation.
9. A UI recognizably descended from the original project, but cleaner.

## Behaviors NOT to preserve automatically

Do not reimplement merely because they exist in the template:

- authentication;
- user registration;
- account management;
- generic charts;
- generic tables;
- admin analytics;
- decorative widgets;
- control buttons with no proven industrial function.

## Reconstruction mapping

| Legacy concept | V2 replacement |
|---|---|
| `pcwp.html`, `scwp1.html`, `scwp2.html` | One dashboard with device selector |
| Many small "latest value" endpoints | One latest-state contract |
| HTTP polling for all live values | WebSocket realtime stream |
| Mixed sensor identifiers | Canonical snake_case identifiers |
| Raw template navigation | Monitoring-focused navigation |
| Lost original DB | New schema + synthetic seed data |
| Historical aggregation implied in client | Explicit documented server aggregation |
| Template/uibuilder leftovers | Deleted unless required |
| Unclear live-data provenance | Explicit simulation/field-source indicator |

## First-pass files Codex should inspect

Before Milestone 1 implementation, inspect at least:

```text
../dashboard-legacy/README.md
../dashboard-legacy/src/index.html
../dashboard-legacy/src/index.js
../dashboard-legacy/src/pcwp.html
../dashboard-legacy/src/scwp1.html
../dashboard-legacy/src/scwp2.html
../dashboard-legacy/src/historical-charts.html
../dashboard-legacy/src/js/demo/chart-area-demo.js
../dashboard-legacy/src/js/demo/chart-data-filter.js
../dashboard-legacy/src/package.json
```

If paths differ, search rather than assume files are absent.

## Audit questions still open

- Which device page was actually demonstrated with live plant data?
- Were PCWP, SCWP1, and SCWP2 all connected or partly mocked?
- Was Express used in the final internship implementation or only during later experimentation?
- Was MQTT used between field gateway and server, server and browser, or both?
- Was the public test broker used in the internship or only in later experiments?
- Was WebSocket delivered through MQTT-over-WebSocket, a separate socket server, or both at different stages?
- Did ESP32 reach physical deployment or remain a design/prototype?
- What exact registers and endian ordering were used?
- What units should each dashboard metric display?

Add recovered answers to `EVIDENCE_REGISTER.md` before turning them into historical claims.
