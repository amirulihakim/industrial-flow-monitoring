# Portfolio and Historical Boundaries

## Purpose

This document prevents the 2026 reconstruction from accidentally overstating what existed during the 2024–2025 internship.

The project is strongest when the distinction is explicit.

## Three labels to use consistently

### ORIGINAL INTERNSHIP IMPLEMENTATION

Use only for work supported by the internship report, surviving code, photographs, screenshots, or recovered original files.

Examples that are currently supportable at a general level:

- industrial sensor monitoring project at PT Timah Industri;
- Maintenance Department context;
- Modbus/RS-485 research and testing;
- MySQL centralized sensor-data schema;
- Node-RED development;
- web dashboard development;
- real-time and historical visualization concept;
- local/intranet hosting concept;
- DPM-C530 used as a development/test Modbus source;
- Supmea electromagnetic BTU/flow meter studied in the field.

### 2026 RECONSTRUCTION / REFACTOR

Use for:

- new server code;
- reconstructed database;
- refactored dashboard;
- unified device page;
- new tests;
- new simulator;
- new WebSocket architecture;
- newly written documentation;
- any feature completed after the internship.

### SIMULATION / SYNTHETIC DATA

Use for all generated public portfolio telemetry.

## Public demo disclosure

The live demo should visibly include wording equivalent to:

```text
SIMULATION MODE
Synthetic telemetry for portfolio demonstration.
```

A short explanation may say:

```text
The interface reconstructs an industrial monitoring system developed during a
PT Timah Industri internship. Public demo values are synthetic and the demo is
not connected to company infrastructure.
```

## Claims to avoid

Do not say:

- "This dashboard is currently monitoring PT Timah Industri."
- "Live PT Timah data."
- "Production system" unless specific deployment evidence supports it.
- "Predictive maintenance system" if the system only monitored data.
- "Automated control system" if no actuator/control implementation is documented.
- "Built from scratch" without qualification, because the UI started from an existing template.
- "Designed the entire frontend framework" when SB Admin 2/Bootstrap material was adapted.
- "Original database restored" when the V2 contains synthetic/recreated data.
- quantified accuracy, latency, downtime savings, cost savings, uptime, or number of users without evidence.

## Better wording

Prefer:

> Developed and adapted a web-based industrial sensor monitoring prototype integrating Modbus/RS-485 data acquisition, centralized MySQL storage, and real-time/historical visualization during a Maintenance Department internship at PT Timah Industri.

Then separately:

> Reconstructed and refactored the surviving prototype in 2026 into a lean portfolio demo with unified device handling, synthetic telemetry, historical storage, and explicit simulation mode.

## Template disclosure

It is acceptable that the original frontend used an existing Bootstrap/SB Admin template.

Do not hide it if directly asked.

The engineering contribution is better demonstrated through:

- data acquisition;
- protocol integration;
- backend/data flow;
- database;
- chart behavior;
- historical filtering;
- hardware testing;
- system integration;
- refactoring.

The V2 should reduce template dependency and make those contributions clearer.

## Data confidentiality

Do not publish:

- private plant IP addresses;
- internal server names if sensitive;
- credentials;
- real database passwords;
- Wi-Fi credentials;
- confidential production values;
- internal documents not intended for public distribution;
- personally identifying employee data.

If original screenshots contain sensitive information, redact before portfolio publication.

## Repository strategy

Keep the original repository available as historical code if desired:

```text
dashboard-legacy
```

Create the clean public reconstruction separately:

```text
industrial-flow-monitoring
```

The new README should explicitly explain the relationship.

## Resume / CV rule

A CV bullet should emphasize what was actually done during the internship.

The later refactor may be listed as:

- an extension/reconstruction of the internship project; or
- a portfolio continuation.

Do not silently fold 2026 work into the 2024–2025 internship timeline.

## Interview rule

If asked why the code was rebuilt:

A strong answer is:

> The internship prototype was built incrementally from an existing dashboard
> template while I was learning industrial communications and web integration.
> After the internship I retained the original repository, then rebuilt the system
> to remove duplicated pages, clarify the data model, separate realtime from
> historical traffic, and provide a safe synthetic demo.

This demonstrates technical growth instead of trying to conceal the prototype's rough edges.
