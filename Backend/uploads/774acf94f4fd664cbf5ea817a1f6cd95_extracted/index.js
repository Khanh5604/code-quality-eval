// Main entry of sample project
const { sum, multiply } = require('./utils/math');
const { greetUser } = require('./utils/greet');
const http = require('http');

function handleRequest(req, res) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.url === '/sum') {
    const result = sum(1, 2);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  } else if (req.url === '/multiply') {
    const result = multiply(3, 4);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(greetUser('Developer'));
  }
}

const server = http.createServer(handleRequest);

server.listen(4000, () => {
  console.log('Sample project server is running on port 4000');
});
