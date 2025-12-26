// A fake controller to increase LOC and structure
const { sum } = require('../utils/math');

function getUserProfile(req, res) {
  const profile = {
    id: 1,
    name: 'Test User',
    age: 25,
    score: sum(10, 5)
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(profile));
}

module.exports = { getUserProfile };
