# Realtime Transport and MQTT Contract

## Historical boundary

Everything in this document is a **2026 reconstruction / refactor**. The
internship report documents MQTT, Mosquitto, and WebSocket concepts, but the
surviving repository does not prove an original browser MQTT/WebSocket path,
broker address, topic, credentials, or payload contract.

## Runtime flow

```text
SimulationSource or MqttSource
             |
             v
      canonical device state
             |
             +----> latest in-memory state
             +----> controlled MySQL persistence
             +----> /realtime WebSocket broadcast
                              |
                              v
                         browser dashboard
```

The browser opens one WebSocket connection per tab. It does not connect to
MQTT and does not poll the latest-state endpoint every second. Historical data
continues to use REST.

## Source configuration

Simulation is the safe default:

```text
DATA_SOURCE=simulation
```

Server-side MQTT ingestion is enabled with:

```text
DATA_SOURCE=mqtt
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC_TEMPLATE=timah-monitoring/<device>/telemetry
```

Credentials are optional and environment-only. Missing/unreachable MQTT
configuration produces degraded source health without crashing the HTTP,
historical, or static application paths.

## MQTT topic convention

The default V2 template is:

```text
timah-monitoring/<device>/telemetry
```

The server subscribes to:

```text
timah-monitoring/+/telemetry
```

`<device>` must resolve to `PCWP`, `SCWP1`, or `SCWP2`. This convention is a
reconstruction choice and must not be described as an original PT Timah topic.

## MQTT payload

One message represents one coherent device sample. The device comes from the
topic, not from an independently trusted payload field.

```json
{
  "timestamp": "2026-08-27T12:00:00.000Z",
  "quality": "good",
  "status": "online",
  "values": {
    "flow_rate": 80.1,
    "flow_velocity": 1.2,
    "flow_percentage": 66.75,
    "instant_heat": 0.72,
    "temperature_in": 28.1,
    "temperature_out": 32.6,
    "positive_total": 1001.2,
    "negative_total": 5,
    "heating_total": 120.1,
    "cooling_total": 20
  }
}
```

All ten canonical identifiers are required and must have finite numeric values.
`timestamp` is optional and defaults to server receipt time. `quality` defaults
to `good`; this initial MQTT adapter accepts coherent numeric, good-quality
samples only. Malformed JSON, unknown devices/sensors, missing values, and
non-finite values are rejected before latest-state update, persistence, or
WebSocket broadcast.

## Browser behavior

The browser connects to `/realtime` using `ws:` or `wss:` to match the page.
It reconnects with exponential backoff from 500 ms to 10 seconds, ignores
messages for non-selected devices, caches the latest state per device, and uses
a local timer only to detect stale data. Device switching does not create a new
socket or attach duplicate listeners.
