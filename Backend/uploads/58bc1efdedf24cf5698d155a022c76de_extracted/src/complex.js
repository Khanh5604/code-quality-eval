export function riskyClassifier(x) {
  // Intentional complex branching
  if (x > 90) {
    console.log("A");
  } else if (x > 80) {
    console.log("B");
  } else if (x > 70) {
    console.log("C");
  } else if (x > 60) {
    console.log("D");
  } else if (x > 50) {
    console.log("E");
  } else {
    console.log("F");
  }

  // Using undefined variable to trigger no-undef (error)
  return x + missingValue;
}
