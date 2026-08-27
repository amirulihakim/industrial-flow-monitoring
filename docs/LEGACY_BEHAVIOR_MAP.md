# Legacy Behavior Map

## Purpose and evidence rules

This map records what Milestone 1 established about `../dashboard-legacy/`. It describes surviving behavior without treating the legacy frontend's units, numeric device mappings, API design, or sensor names as authoritative historical facts.

Evidence is kept in four separate categories:

- **INTERNSHIP-REPORT DOCUMENTED** — stated by the internship report, whether or not the matching implementation survives.
- **SURVIVING-CODE-PROVEN** — directly observable in `../dashboard-legacy/`.
- **INFERRED** — a plausible interpretation that is not directly established.
- **UNKNOWN** — evidence is insufficient.

When sources differ or leave gaps, this document preserves the gap instead of resolving it by assumption.

## Internship-report documented behavior

The report documents, at a general level:

- centralized industrial sensor acquisition and monitoring;
- Modbus over RS-485 work and testing;
- Node-RED and MySQL use;
- MQTT/Mosquitto and WebSocket within the described architecture;
- real-time and historical visualization;
- local/intranet hosting;
- a Supmea electromagnetic BTU meter studied in the field;
- a DPM-C530 used as a Modbus development/test source.

These statements are report evidence. They do not prove that every technology was active in the same deployment stage or that the surviving frontend exactly matches the final internship system.

## Surviving-code-proven behavior

### Repository and serving assumptions

- The root `../dashboard-legacy/README.md` is the uibuilder blank-template README and describes serving `src/` through Node-RED/uibuilder.
- `../dashboard-legacy/src/index.js` starts uibuilder and renders incoming Node-RED messages, but none of the inspected active HTML pages loads that file.
- `../dashboard-legacy/src/package.json` is the SB Admin 2 package. Its start command runs `gulp watch`; it does not provide the API routes expected by the browser.
- No complete matching HTTP server, Node-RED flow export, database connection, or API route implementation is preserved in the repository.

### Overview page

On load, `../dashboard-legacy/src/index.html` requests:

```text
GET http://localhost:3000/api/new-reports-today
GET http://localhost:3000/api/pump-status/1
GET http://localhost:3000/api/pump-status/2
GET http://localhost:3000/api/pump-status/3
GET http://localhost:3000/api/pump-status/4
```

It expects a `count` field from the first response and a `status` field from each pump response. It immediately performs the requests and repeats them every five seconds.

The page labels IDs 1–4 as PCWP, SCWP1, SCWP2, and SnCl₄. This is a surviving frontend mapping only; it is not treated here as an authoritative historical database or plant mapping.

### Device pages and KPI polling

`../dashboard-legacy/src/pcwp.html`, `../dashboard-legacy/src/scwp1.html`, and `../dashboard-legacy/src/scwp2.html` are effectively duplicate pages. A direct comparison finds only title, heading, and whitespace differences.

Each page displays cards labelled as positive flow, negative flow, net flow, heating accumulation, and cooling accumulation. On load and every second, each page calls:

```text
GET http://localhost:3000/api/positive-flow
GET http://localhost:3000/api/negative-flow
GET http://localhost:3000/api/heat
GET http://localhost:3000/api/cool
```

Positive and negative flow are each fetched a second time to calculate a displayed net value in the browser. The client expects a `value` property from these responses.

None of these requests carries a device identifier. Therefore, the surviving code proves separately labelled pages but does not prove separately addressed live data for PCWP, SCWP1, and SCWP2.

Displayed units and labels are UI literals in the surviving code. Their presence does not independently verify the instrument configuration, engineering units used in deployment, or canonical historical sensor vocabulary.

### Live charts

Each active device page loads `../dashboard-legacy/src/js/demo/chart-area-demo.js`. That script:

1. requests `GET http://localhost:3000/api/realtime` immediately and every second;
2. expects an array with `sensor_type`, `timestamp`, and `reading` fields;
3. maps six human-readable sensor strings to six chart canvases;
4. stores values by timestamp;
5. removes entries whose timestamps compare as older than 60 seconds;
6. redraws the charts.

The request carries no device identifier. The surviving linked realtime implementation is HTTP polling. It does not establish a functioning MQTT or WebSocket browser data path.

### Historical charts

`../dashboard-legacy/src/historical-charts.html` loads `../dashboard-legacy/src/js/demo/chart-data-filter.js`. The script adds:

- a device selector with frontend values `1`, `2`, and `3`;
- timeframe options `hour`, `8hours`, `day`, `month`, and `year`;
- a specific date/month/year input for the last three options.

It requests:

```text
GET http://localhost:3000/api/filtered-data
    ?deviceId=<frontend value>
    &timeframe=<hour|8hours|day|month|year>
    [&specificDate=<selected value>]
```

The client expects records with `sensor_type`, `time`, and `avg_value`, groups them into six abbreviated sensor keys, destroys existing chart instances, and creates replacement charts.

The `avg_value` contract indicates that the browser expects aggregated data. The backend implementation, SQL, aggregation buckets, ordering, bounds, and source data are not preserved.

### Loaded and disconnected dependencies

- The active device pages load MQTT.js, but they do not initialize an MQTT client, connect, subscribe, or publish.
- The older `../dashboard-legacy/src/pcwp1.html` contains an orphaned publish call to `/MQTT/Request/TimeRange`, but no `mqttClient` initialization is present and active navigation points to `pcwp.html`.
- Active device pages load local Chart.js and another Chart.js 2.9.4 copy from a CDN.
- The historical page loads both an unversioned CDN Chart.js and the local Chart.js 2.9.4 bundle.
- `../dashboard-legacy/src/js/package.json` declares React and Create React App, but no corresponding active React application was found. It appears disconnected from the active HTML/SB Admin application.
- `../dashboard-legacy/src/backend/data-fetch` is an unreferenced browser fetch helper, despite its directory name; it is not a server implementation.
- The active navigation links to `historical-tables.html`, which is absent. A generic `tables.html` exists but is not the linked path.

## Inferred behavior

The following interpretations are plausible but not proven as historical behavior:

- A separate service on port 3000 may have supplied the HTTP endpoints.
- The `avg_value` field may have been produced by SQL or another backend aggregation step.
- The three device-page copies may have been intended to evolve into device-specific dashboards.
- MQTT.js and the `pcwp1.html` publish fragment may represent an earlier or abandoned browser MQTT experiment.
- uibuilder may have served some version of the dashboard even though its surviving message-display script is not linked by the inspected active pages.

These are engineering interpretations only.

## Unknown behavior

- Which process served the demonstrated frontend at each project stage.
- Where the expected HTTP endpoint handlers were implemented.
- The exact response types and timestamp representation returned by `/api/realtime`.
- Whether `/api/realtime` represented one device, multiple devices, or an implicit default device.
- Which device, if any, the unparameterized totalizer endpoints represented.
- Whether all three labelled device pages were connected to field devices or partly placeholders.
- The historical query and aggregation implementation.
- Whether a functioning browser MQTT or WebSocket path existed in another unrecovered version.
- Which of `pcwp.html` or `pcwp1.html` was demonstrated and when.
- Authoritative sensor names, units, instrument register maps, device mappings, and equipment-name expansions.
- Whether report, form, alarm, and pump-status pages were part of the demonstrated monitoring scope.

## Behavior to preserve in later reconstruction milestones

Subject to `docs/SYSTEM_SPEC.md`, later milestones may reconstruct these concepts without claiming the new implementation is the historical one:

- selection among the three recovered device codes;
- current values and six live trends;
- bounded chart data;
- accumulated totals when supported by the reconstruction contract;
- device and time filtering for historical trends;
- explicit connection, stale-data, no-data, and error states;
- an unmistakable simulation/source disclosure.

Milestone 1 implements none of those runtime features. It provides only the application skeleton, health route, static placeholder, tests, and this evidence map.

