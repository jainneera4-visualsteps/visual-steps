const http = require('http');

http.get('http://localhost:3000/socket.io/?EIO=4&transport=polling', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
