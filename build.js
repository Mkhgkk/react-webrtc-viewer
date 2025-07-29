const { spawn } = require('child_process');
const path = require('path');

const rollupPath = path.join(__dirname, 'node_modules', '.bin', 'rollup');
const configPath = path.join(__dirname, 'rollup.config.js');

console.log('Building library...');
console.log('Rollup path:', rollupPath);
console.log('Config path:', configPath);

const child = spawn(rollupPath, ['-c', configPath], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Build completed successfully!');
  } else {
    console.error('Build failed with code:', code);
  }
});