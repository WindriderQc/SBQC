const { spawnSync } = require('child_process');
process.env.NODE_ENV = 'test';

const mochaBin = require.resolve('mocha/bin/mocha.js');

const result = spawnSync(process.execPath, [mochaBin, '--exit'], {
    stdio: 'inherit',
    env: process.env
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

process.exit(result.status);
