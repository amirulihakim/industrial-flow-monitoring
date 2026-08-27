# Project Context

## Project identity

**Original internship project:** Pengembangan Sistem Pusat Input Data Sensor  
**Company:** PT Timah Industri, Cilegon  
**Department:** Maintenance / Perawatan  
**Internship period documented in the final report:** 19 September 2024 – 18 February 2025  
**Reconstruction period:** 2026

The original internship project focused on centralized acquisition, storage, and visualization of industrial sensor data. The portfolio rebuild should preserve that engineering story while making the implementation easier to understand, maintain, demonstrate, and discuss in an interview.

## Documented original objective

The internship report describes a centralized monitoring system intended to:

- acquire sensor data from plant equipment;
- store data in a centralized MySQL database;
- visualize both current and historical values;
- provide interactive time-series dashboards;
- support industrial equipment-condition monitoring.

The final report presents the work as an IoT / industrial digitalization project rather than a closed-loop control project.

## Documented field instrument

The report identifies a **Supmea electromagnetic BTU meter, type DN100-F**, observed in the SnCl4 plant control-panel area.

Documented parameters included:

- flow rate;
- flow velocity;
- inlet temperature;
- outlet temperature;
- flow percentage;
- accumulated positive and negative flow;
- transferred heat / thermal-energy-related values.

The report states that communication used **Modbus over RS-485**.

Exact register addresses for this instrument are not currently preserved in the available reconstruction dossier.

## Documented communications and software

The internship report describes use of:

- RS-485
- Modbus
- Node-RED
- MySQL
- MQTT
- Eclipse Mosquitto
- WebSocket
- HTML
- CSS
- JavaScript
- Bootstrap-derived UI
- local/intranet hosting

The report also documents the concept of using an ESP32 with an RS-485/TTL interface to bridge a remote field device onto a Wi-Fi/LAN-connected system when direct cabling to the server was impractical.

## Documented testing

The report describes use of a **DPM-C530 power meter** as a convenient Modbus test-data source during development.

The report discusses practical Modbus issues including:

- slave ID;
- baud rate;
- data bits;
- stop bits;
- parity;
- register address;
- multi-register values;
- hexadecimal-to-decimal interpretation;
- word ordering / swapping.

This is useful evidence that the project involved actual industrial-protocol integration rather than only front-end visualization.

## Original database

The report preserves the original table definition:

```sql
CREATE TABLE `sensor_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL,
  `sensor_type` varchar(20) DEFAULT NULL,
  `reading` float NOT NULL,
  `reading_datetime` datetime NOT NULL,
  `remark` text,
  PRIMARY KEY (`id`),
  KEY `idx_sensor_time` (`reading_datetime`),
  KEY `idx_device_time` (`device_id`,`reading_datetime`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
```

The original database contents were later lost when the development computer changed. The V2 database is therefore a reconstruction and must never be described as the preserved original dataset.

## Historical dashboard behavior

The report documents real-time and historical viewing modes, including:

- Real-Time
- Last Hour
- Yesterday / day-scale view
- Last Week
- Last Month
- Last Year
- All-Time

The surviving legacy repository also contains device-specific pages and historical-chart code.

## Legacy repository

Public historical repository:

```text
https://github.com/amirulihakim/dashboard
```

The root still identifies itself as a uibuilder blank template. The `src/` area contains the adapted SB Admin 2 dashboard and project-specific pages/scripts.

The legacy repository should be retained unchanged as historical evidence.

## Device identifiers recovered from surviving code/context

The reconstruction currently recognizes:

- PCWP
- SCWP1
- SCWP2

The precise full industrial equipment names, physical locations, and whether every page reached the same level of field deployment should be treated as evidence gaps until supported by original documentation or recovered files.

Do not expand the abbreviations unless reliable evidence is supplied.

## What is known to be missing

Currently missing or not yet recovered:

- original MySQL database contents;
- complete original backend/server implementation;
- original Node-RED exported flow JSON;
- confirmed Supmea register map used in the project;
- confirmed DPM-C530 register map used in testing;
- original MQTT broker configuration;
- complete ESP32 source code, if it existed;
- confirmed production network/IP configuration;
- definitive deployment history for each monitored device;
- quantitative latency/accuracy test records beyond narrative statements in the report.

## Reconstruction goal

V2 should demonstrate the original engineering concept with a cleaner architecture:

```text
FIELD/SIMULATOR
      |
      v
Data source adapter
      |
      +----> realtime transport ----> browser dashboard
      |
      +----> persistence -----------> MySQL
                                      |
                                      v
                               historical API
                                      |
                                      v
                               browser dashboard
```

A public portfolio deployment should default to **simulation mode** and visibly disclose that its values are synthetic.

## Intended engineering story

The strongest story is not:

> "I made a Bootstrap dashboard."

It is:

> "During an industrial maintenance internship, I worked on centralizing Modbus-accessible equipment telemetry into a database-backed web monitoring system. I later reconstructed and refactored the surviving prototype into a leaner, testable simulation/demo while preserving the original implementation as historical evidence."

That distinction should drive both the code and the portfolio presentation.
