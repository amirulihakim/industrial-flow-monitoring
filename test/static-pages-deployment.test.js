const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const projectRoot = path.join(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');

test('GitHub Pages entry point uses resolvable relative assets and no backend script', () => {
  const html = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
  const references = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map((match) => match[1]);

  assert.ok(references.length > 0);
  for (const reference of references) {
    assert.match(reference, /^\.\//, `${reference} must be relative to the Pages project directory`);
    const assetPath = reference.split('?')[0];
    assert.ok(fs.existsSync(path.join(publicRoot, assetPath)), `${reference} must exist in public/`);
  }
  assert.match(html, /styles\.css\?v=\d/);
  assert.match(html, /js\/charts\.js\?v=\d/);
  assert.match(html, /js\/app\.js\?v=\d/);
  assert.doesNotMatch(html, /js\/api\.js|js\/history\.js|localhost|127\.0\.0\.1/);
});

test('deployable MQTT configuration is isolated and excludes the ESP32 publisher credential', () => {
  const config = require('../public/js/config');
  const deployableFiles = [
    'index.html', 'js/config.js', 'js/realtime.js', 'js/app.js', 'js/charts.js', 'styles.css',
  ].map((file) => fs.readFileSync(path.join(publicRoot, file), 'utf8')).join('\n');

  assert.equal(config.mqtt.protocolVersion, 4);
  assert.equal(config.mqtt.username, 'timah-web');
  assert.match(config.mqtt.brokerUrl, /^wss:\/\//);
  assert.doesNotMatch(deployableFiles, /timah-esp32|localhost|127\.0\.0\.1/);
});

test('Pages workflow uploads public as the complete static artifact', () => {
  const workflow = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4[\s\S]*path: public/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
});
