const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');

test('schema contains the documented reproducible V2 tables, indexes, and foreign key', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  assert.match(schema, /CREATE TABLE IF NOT EXISTS devices\s*\(/i);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS sensor_readings\s*\(/i);
  assert.match(schema, /recorded_at DATETIME\(3\) NOT NULL/i);
  assert.match(schema, /source VARCHAR\(16\) NOT NULL DEFAULT 'simulation'/i);
  assert.match(schema, /KEY idx_sensor_time \(sensor_type, recorded_at\)/i);
  assert.match(schema, /KEY idx_device_time \(device_id, recorded_at\)/i);
  assert.match(schema, /KEY idx_device_sensor_time \(device_id, sensor_type, recorded_at\)/i);
  assert.match(schema, /FOREIGN KEY \(device_id\) REFERENCES devices\(id\)/i);
  assert.equal((schema.match(/CREATE TABLE/gi) || []).length, 2);
});

test('seed setup contains only the three canonical device codes and is repeatable', () => {
  const seed = fs.readFileSync(seedPath, 'utf8');

  assert.match(seed, /ON DUPLICATE KEY UPDATE/i);
  const codes = [...seed.matchAll(/\('(PCWP|SCWP1|SCWP2)'/g)].map((match) => match[1]);
  assert.deepEqual(codes, ['PCWP', 'SCWP1', 'SCWP2']);
});

