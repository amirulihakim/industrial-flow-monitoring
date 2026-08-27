# Configurable Modbus Source

## Evidence boundary

The internship report documents Modbus/RS-485 work, serial framing and slave-ID
considerations, multi-register decoding, and word swapping. The exact Supmea and
DPM-C530 mappings used during the internship have not been recovered.

`ModbusSource` is therefore a **2026 reconstructed adapter**. The committed
example contains synthetic addresses only.

## Configuration

Set `DATA_SOURCE=modbus` and point `MODBUS_CONFIG_PATH` to a JSON file based on
`config/modbus.example.json`. The connection object defines:

- `serial_port`
- `baud_rate`
- `parity`: `none`, `even`, or `odd`
- `data_bits`: 7 or 8
- `stop_bits`: 1 or 2
- `polling_interval_ms`

Each device defines a canonical `device`, Modbus `unit_id`, and exactly one
mapping for every canonical sensor. A mapping defines:

- `sensor`: canonical identifier
- `address`: zero-based holding-register address supplied to the library
- `register_count`: 1 or 2
- `data_type`: `integer` or `float`
- `signed`: signed/unsigned integer interpretation
- `byte_order`: `big` or `little` within each 16-bit word
- `word_order`: `high_first` or `low_first` for two-register values
- `multiplier`: finite scale applied after decoding
- `offset`: optional finite value applied after scaling

Supported conversions are signed/unsigned 16-bit and 32-bit integers plus
32-bit IEEE-754 floats. The final calculation is:

```text
value = decoded_value * multiplier + offset
```

Environment variables may override serial connection fields. `MODBUS_UNIT_ID`
may override the unit ID only when the configuration contains one device.

## Failure behavior

Invalid configuration creates a degraded source rather than preventing the web
application from starting. Serial/read/decode failures close the current client,
mark source health degraded, and retry on the next polling interval. A sample is
emitted only after all ten values for a device decode successfully.
