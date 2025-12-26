// Greeting utility
function greetUser(name) {
  // This is a simple greeting function
  return `Hello, ${name}! Welcome to the sample project.`;
}

// duplicated-ish function to give JSCPD something to see
function greetAdmin(name) {
  // This is a simple greeting function
  return `Hello, ${name}! Welcome to the admin panel.`;
}

module.exports = { greetUser, greetAdmin };
