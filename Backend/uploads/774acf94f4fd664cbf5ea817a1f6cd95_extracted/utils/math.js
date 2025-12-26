// Math utility functions
function sum(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

function internalVeryComplexFunction(x, y, z) {
  // deliberately a bit complex
  let result = 0;
  if (x > 0 && y > 0) {
    if (z > 10) {
      result = x * y * z;
    } else if (z > 5) {
      result = x * y + z;
    } else if (z > 2) {
      result = x + y + z;
    } else {
      result = x + y;
    }
  } else if (x < 0 || y < 0) {
    if (z > 100) {
      result = x - y - z;
    } else {
      result = x - y + z;
    }
  } else {
    result = z;
  }
  return result;
}

module.exports = { sum, multiply, internalVeryComplexFunction };
