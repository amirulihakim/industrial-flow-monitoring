-- Canonical reconstruction device codes. Abbreviations are intentionally not expanded.
INSERT INTO devices (code, display_name, enabled)
VALUES
  ('PCWP', 'PCWP', TRUE),
  ('SCWP1', 'SCWP1', TRUE),
  ('SCWP2', 'SCWP2', TRUE)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  enabled = VALUES(enabled);

