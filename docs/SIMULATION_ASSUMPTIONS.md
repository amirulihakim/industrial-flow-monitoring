# Simulation Assumptions

## Status

Everything described here is part of the **2026 reconstruction / simulation**. It is not evidence of historical PT Timah Industri operating values, instrument configuration, pipe dimensions, fluid properties, or control behavior.

The simulator is a coherent demonstration model, not a validated thermofluid or plant process model.

## Configuration location

All default device and model constants are kept in:

```text
server/simulation/constants.js
```

Tests or future deployments may inject alternative device/model configuration without changing simulator logic.

## Device assumptions

PCWP, SCWP1, and SCWP2 receive deliberately different synthetic values for:

- `rated_flow`;
- normal flow fraction;
- flow-to-velocity calibration factor;
- nominal inlet temperature;
- nominal temperature difference;
- initial totalizers.

The differences make independent device streams visible in a demo. None is a recovered equipment specification or plant measurement.

## Relationships

### Flow

Flow approaches a scenario target at a bounded rate. A small seeded noise term is applied to the evolving flow state; variables are not generated independently.

`flow_percentage` is always derived as:

```text
flow_rate / rated_flow * 100
```

and bounded to 0–100 percent.

### Velocity

Velocity uses a configurable demonstration calibration:

```text
flow_velocity = flow_rate * flow_to_velocity_factor
```

This avoids implying that a historical effective pipe area or unit conversion is known.

### Temperature

Inlet temperature and the inlet/outlet temperature difference are state variables. Both approach scenario targets at bounded rates with small seeded noise. Outlet temperature is derived from inlet temperature plus the evolving difference.

### Instantaneous heat

The simulator uses a normalized demonstration relationship:

```text
instant_heat = flow_rate * temperature_difference * heat_demo_factor
```

`heat_demo_factor` is an arbitrary scaling constant for coherent visualization. It does not encode verified fluid density, heat capacity, meter configuration, or engineering units.

### Totalizers

Positive/negative flow and heating/cooling totals integrate the corresponding signed synthetic rates over simulated time using a configurable time divisor. Under normal forward-flow operation, positive and heating totals are monotonic. Initial totals are synthetic display seeds.

## Scenarios

- `normal`: returns toward each device's normal flow and nominal temperatures.
- `low_flow`: persistently targets a reduced fraction of rated flow.
- `pump_stopped`: flow and temperature difference decay gradually toward zero.
- `high_temperature`: inlet temperature and temperature difference rise gradually while flow remains coherent.
- `sensor_fault`: exposes `status: fault`, `quality: fault`, and `null` telemetry values. It does not substitute extreme numeric readings.

Scenario selection is simulation-only behavior. It must not be presented as an industrial control interface.

## Historical verification still required

Before using physical units or presenting values as representative of the original system, recover or verify:

- actual instrument ranges and configured units;
- pipe dimensions or meter conversion/calibration behavior;
- monitored fluid properties and thermal calculation method;
- expected operating ranges and temperature relationships;
- totalizer interpretation and reset behavior;
- which variables were available for each physical device.

