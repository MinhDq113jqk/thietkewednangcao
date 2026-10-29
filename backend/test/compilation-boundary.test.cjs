const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const backendDir = path.resolve(__dirname, '..');

for (const configName of ['tsconfig.json', 'tsconfig.build.json']) {
  test(`${configName} keeps runtime scripts and generated dist files out of compiler inputs`, () => {
    const configPath = path.join(backendDir, configName);
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, backendDir);
    assert.deepEqual(parsed.errors, []);

    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const inputs = program.getSourceFiles().map(file => path.resolve(file.fileName));
    const isInside = (file, directory) => file.startsWith(`${path.join(backendDir, directory)}${path.sep}`);

    assert.ok(inputs.includes(path.join(backendDir, 'src', 'bootstrap.ts')));
    assert.ok(inputs.includes(path.join(backendDir, 'src', 'models', 'index.js')));
    assert.deepEqual(inputs.filter(file => isInside(file, 'dist')), []);
    assert.deepEqual(inputs.filter(file => isInside(file, path.join('src', 'scripts'))), []);
    assert.deepEqual(program.getOptionsDiagnostics().filter(error => error.code === 5055), []);
  });
}
