const { spawn } = require('child_process');
const fs = require('fs');

const child = spawn('npx', ['tsx', 'server.ts']);

child.stdout.on('data', (data) => {
  fs.appendFileSync('server-out.log', data.toString());
});

child.stderr.on('data', (data) => {
  fs.appendFileSync('server-out.log', data.toString());
});

setTimeout(() => {
  child.kill();
  console.log(fs.readFileSync('server-out.log', 'utf8'));
}, 10000);
