function sum(a, b) {
  return a + b;
}

function badFunction(x) {
  if (x > 10) {
    console.log("big");
  } else if (x > 5) {
    console.log("medium");
  } else if (x > 3) {
    console.log("small");
  } else if (x > 1) {
    console.log("tiny");
  } else {
    console.log("zero");
  }
}

sum(1, 2);
badFunction(7);
