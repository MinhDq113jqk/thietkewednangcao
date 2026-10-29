const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const loader = path.resolve(__dirname, '../src/config/loadEnv.js');
const readConfig = (directory, env = {}) => {
  const code = `require(${JSON.stringify(loader)})(process.argv[1]);
    console.log(JSON.stringify({ selected: process.env.SOUVENIR_ENV_SELECTED,
      fallback: process.env.SOUVENIR_ENV_FALLBACK }));`;
  const childEnv = { ...process.env };
  delete childEnv.SOUVENIR_ENV_SELECTED;
  delete childEnv.SOUVENIR_ENV_FALLBACK;
  const result = spawnSync(process.execPath, ['-e', code, directory], {
    env: { ...childEnv, ...env }, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout);
};

test('A fresh checkout loads the submitted demo configuration without local overrides', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'souvenir-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, '.env'), 'SOUVENIR_ENV_SELECTED=demo\n');
  assert.deepEqual(readConfig(directory), { selected: 'demo' });
});

test('System settings override private local settings, which override demo defaults', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'souvenir-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, '.env'),
    'SOUVENIR_ENV_SELECTED=demo\nSOUVENIR_ENV_FALLBACK=default\n');
  fs.writeFileSync(path.join(directory, '.env.local'), 'SOUVENIR_ENV_SELECTED=local\n');
  assert.deepEqual(readConfig(directory), { selected: 'local', fallback: 'default' });
  assert.deepEqual(readConfig(directory, { SOUVENIR_ENV_SELECTED: 'system' }),
    { selected: 'system', fallback: 'default' });
});
