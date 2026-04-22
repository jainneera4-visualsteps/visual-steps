
// script to test if server is responding
const fetch = require('node-fetch');

async function test() {
  const response = await fetch('http://localhost:3000/api/health');
  console.log(await response.json());
}
test().catch(console.error);
