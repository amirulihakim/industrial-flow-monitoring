# AGENTS.md — PT Timah Industrial Flowmeter Monitoring Rebuild

## Mission

Reconstruct the 2024–2025 PT Timah Industri industrial flowmeter monitoring project as a clean, lean, testable portfolio-grade application while preserving the historical truth of the original internship work.

This repository is a **2026 reconstruction/refactor**, not the untouched original internship codebase.

## Workspace layout

Expected local workspace:

```text
Timah-Flowmeter/
├── dashboard-legacy/                 # Original GitHub repository — READ ONLY
└── industrial-flow-monitoring/       # This reconstruction repository
    ├── AGENTS.md
    └── docs/
```

The legacy repository is expected at:

```text
../dashboard-legacy/
```

### Critical rule

**Never modify, delete, reformat, rename, or commit changes inside `../dashboard-legacy/`.**

It is historical evidence and reference material only.

If a legacy behavior needs to be reproduced, inspect it and implement the clean equivalent in this repository.

## Sources of truth

Use evidence in this priority order:

1. Original internship documentation and surviving field evidence.
2. Original source code in `../dashboard-legacy/`.
3. Newly recovered original files supplied later by the project owner.
4. `docs/SYSTEM_SPEC.md` for the agreed V2 behavior.
5. Clearly labeled engineering inference.
6. Never invent historical facts.

Read these files before substantive work:

- `docs/PROJECT_CONTEXT.md`
- `docs/EVIDENCE_REGISTER.md`
- `docs/LEGACY_AUDIT.md`
- `docs/SYSTEM_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/PORTFOLIO_BOUNDARIES.md`
- `docs/REBUILD_PLAN.md`

## Historical integrity

Always distinguish among:

### Original implementation
Work documented as having existed during the PT Timah Industri internship.

### Reconstruction
Code, architecture, database, UI, testing, or simulation created after the internship to rebuild/refactor the project.

### Simulation
Synthetic telemetry used to demonstrate application behavior.

Never describe synthetic data as live PT Timah Industri data.

Never imply the public portfolio is connected to PT Timah Industri infrastructure.

Never fabricate measured values, register maps, device addresses, credentials, plant network topology, performance numbers, or implementation outcomes.

If evidence is insufficient, write `UNKNOWN` or add an item to `docs/EVIDENCE_REGISTER.md`.

## Scope of V2

The intended V2 is an industrial **monitoring** application.

Core capabilities:

- PCWP, SCWP1, and SCWP2 device selection.
- Real-time telemetry display.
- Historical trend display.
- Synthetic simulation mode.
- MySQL historical storage.
- Clean API and realtime transport.
- Connection/data-quality state.
- Portfolio-safe operation.

Do not add industrial control functionality unless explicitly approved and supported by evidence.

Do not add fake authentication, fake user profiles, fake audit logs, or decorative template pages merely because the legacy template contains them.

## Preferred implementation principles

Keep the stack deliberately small and understandable.

Default direction:

- Node.js
- Express
- MySQL via `mysql2`
- WebSocket via `ws` or Socket.IO only if there is a clear benefit
- MQTT via `mqtt`
- Vanilla HTML/CSS/JavaScript or an equally lightweight frontend
- One supported Chart.js version
- Environment variables via `.env`
- No framework migration merely for novelty

Before adding a dependency, explain why it is needed.

Prefer:

- one device-agnostic dashboard instead of copied pages;
- one canonical sensor naming scheme;
- one latest-state API call instead of many redundant requests;
- WebSocket/MQTT-derived push for live values;
- REST for historical queries;
- server-side aggregation for large time ranges;
- small, focused modules;
- explicit error states;
- readable code over clever code.

## Canonical telemetry names

Unless `docs/SYSTEM_SPEC.md` is deliberately updated first, use:

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

Do not introduce alternative spellings such as `flow_rt`, `Flow Rate`, `temp_in`, etc. in persisted/API contracts. Human-readable labels belong in the UI layer.

## Working method

For every milestone:

1. Inspect relevant legacy files first.
2. State what historical behavior is being preserved.
3. State any uncertain assumptions.
4. Make the smallest coherent implementation.
5. Run the application/tests.
6. Report changed files.
7. Report tests performed and results.
8. Report unresolved issues.
9. Do not proceed to the next milestone unless asked.

Avoid large one-shot rewrites.

## Testing expectations

At minimum:

- application starts without runtime errors;
- API responses validate against the documented contract;
- device switching works;
- charts do not leak timers/listeners;
- simulation states behave deterministically enough to debug;
- historical queries have bounded result sizes;
- database failure has a visible/degraded state;
- no secrets are committed.

When feasible, add automated tests for:

- simulator state transitions;
- API response shape;
- historical aggregation selection;
- sensor-name validation.

## Security and privacy

Never commit:

- real PT Timah Industri IP addresses;
- usernames/passwords;
- database passwords;
- Wi-Fi credentials;
- MQTT credentials;
- API secrets;
- private internal documents;
- confidential plant data.

Use `.env.example` with placeholders.

Assume all code pushed to the portfolio repository is public.

## Documentation discipline

When an important architecture decision changes, update the relevant document in `docs/` in the same change.

When new historical evidence is found:

1. Add it to `docs/EVIDENCE_REGISTER.md`.
2. Mark whether it is confirmed, inferred, conflicting, or still unknown.
3. Update the system specification only if the evidence changes the intended V2.

## Definition of "done"

A task is not done merely because code was generated.

It is done when:

- it runs;
- the requested behavior is testable;
- the implementation is simpler than the legacy equivalent;
- documentation remains accurate;
- historical and reconstructed work remain clearly separated.
