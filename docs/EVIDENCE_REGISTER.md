# Evidence Register

## Purpose

Track what is historically supported, what is only inferred, and what is still missing.

Update this file whenever old source code, screenshots, manuals, Node-RED flows, SQL dumps, ESP32 sketches, or notes are recovered.

## Evidence sources currently available

| ID | Evidence | Status | Notes |
|---|---|---|---|
| E-001 | Internship final report, 2025 | AVAILABLE | Primary historical narrative and screenshots |
| E-002 | Public GitHub repository `amirulihakim/dashboard` | AVAILABLE | Surviving frontend/template-era code |
| E-003 | Original MySQL database | LOST | Rebuild required |
| E-004 | Original Node-RED flow export | NOT YET RECOVERED | Search backups/old drives/cloud |
| E-005 | Original backend server files | NOT YET RECOVERED | Frontend references APIs not fully present in repo |
| E-006 | Original ESP32 sketch | NOT YET RECOVERED | Report documents architecture/concept |
| E-007 | Supmea meter manual/register map used | NOT YET RECOVERED | Important for Modbus reconstruction |
| E-008 | DPM-C530 manual/register map used | NOT YET RECOVERED | Useful for hardware-test reconstruction |

## Confirmed historical facts

| Fact | Evidence | Confidence |
|---|---|---|
| Internship at PT Timah Industri | E-001 | High |
| Maintenance Department placement | E-001 | High |
| Internship period 19 Sep 2024–18 Feb 2025 | E-001 | High |
| Centralized sensor-data monitoring project | E-001 | High |
| MySQL used | E-001 | High |
| Original `sensor_data` schema preserved | E-001 | High |
| Node-RED used | E-001 | High |
| Modbus/RS-485 used/tested | E-001 | High |
| MQTT/Mosquitto discussed as implemented architecture | E-001 | High |
| WebSocket discussed in data flow | E-001 | High |
| Real-time and historical dashboard modes | E-001 | High |
| Supmea electromagnetic BTU meter DN100-F studied | E-001 | High |
| DPM-C530 used as a Modbus test source | E-001 | High |
| Local-server/intranet deployment described | E-001 | High |
| RS-485 to ESP32 architecture documented | E-001 | High |
| Existing UI derives from template/uibuilder/SB Admin | E-002 | High |

## Code-derived facts requiring historical caution

| Fact | Evidence | Status |
|---|---|---|
| Device pages PCWP, SCWP1, SCWP2 exist | E-002 | Confirmed in surviving code |
| Local API routes are referenced | E-002 | Confirmed in surviving code |
| Full matching backend is preserved | E-002 | False / not currently found |
| Every device page was field-deployed | — | UNKNOWN |
| Current legacy code exactly matches final internship deployment | — | UNKNOWN |

## Reconstruction artifacts are not new historical evidence

The configurable `ModbusSource` and `config/modbus.example.json` added during
the 2026 reconstruction demonstrate a testable Modbus RTU ingestion design.
They do not resolve E-007 or E-008 and are not evidence of original register
addresses, slave IDs, serial settings, scaling, byte order, or word order.

## Questions for the project owner / future evidence

1. What do PCWP, SCWP1, and SCWP2 stand for exactly?
2. Which of those devices were physically connected during the internship?
3. Were all six main variables read from every device?
4. What units appeared on the original dashboard?
5. What Supmea register addresses were used?
6. What baud rate/parity/slave ID were used on the actual field instrument?
7. What DPM-C530 registers were used during testing?
8. Was the final browser data path HTTP polling, MQTT over WebSocket, or a mixture?
9. Was Express actually used during the internship, or added later?
10. Was the ESP32 gateway physically tested or only designed?
11. Was Mosquitto local, public, or both at different development stages?
12. Are there screenshots/videos of the dashboard running against hardware?
13. Are there Node-RED screenshots that reveal node names/topics/routes?
14. Are any old SQL dumps, `.json` flow exports, Arduino sketches, or `.env` files recoverable?

## How to add new evidence

Add a row:

```text
E-009 | <description> | AVAILABLE | <notes>
```

Then add the supported fact under the relevant section.

If new evidence contradicts an existing assumption:

1. mark the old statement `CONFLICT`;
2. do not silently overwrite history;
3. note the conflict;
4. update the V2 specification separately if needed.

## Evidence inbox convention

For local reconstruction, create:

```text
evidence/inbox/
```

Place newly recovered copies there temporarily.

Before committing anything from `evidence/` to a public repository, check:

- confidentiality;
- credentials;
- employee names;
- internal addresses;
- company-sensitive data;
- copyright/publication rights.

The safest default is to keep raw evidence outside the public repository and store only sanitized findings in this register.
