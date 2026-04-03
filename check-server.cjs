const http = require('http');

let count = 0;
const interval = setInterval(() => {
  http.get('http://localhost:3000/api/kids', (res) => {
    console.log(`[${new Date().toISOString()}] Status Code:`, res.statusCode);
  }).on('error', (e) => {
    console.error(`[${new Date().toISOString()}] Error:`, e.message);
  });
  
  count++;
  if (count >= 5) {
    clearInterval(interval);
  }
}, 2000);
