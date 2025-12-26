/* eslint-disable no-console */
const assert = require("assert");
const { computeScores, resolveWeights } = require("./scorer");

function testNoInputs() {
  const res = computeScores({});
  assert.strictEqual(res.meta.codeLines, 0);
  assert.strictEqual(res.meta.commentLines, 0);
  assert.strictEqual(res.metrics.style, 100);
  assert.strictEqual(res.metrics.complexity, 100);
  assert.strictEqual(res.metrics.duplication, 100);
  assert.strictEqual(res.metrics.comment, 20);
  assert.ok(typeof res.summary.overall === "number");
}

function testLintOverride() {
  const res = computeScores({ lintErrorsOverride: 50, cloc: { SUM: { code: 1000, comment: 0 } } });
  assert.strictEqual(res.meta.lintErrors, 50);
  assert.ok(res.metrics.style < 100);
}

function testComplexityOverride() {
  const res = computeScores({ complexityAvgOverride: 12, cloc: { SUM: { code: 1000, comment: 0 } } });
  assert.strictEqual(res.meta.complexityAvg, 12);
  assert.strictEqual(res.metrics.complexity, 40);
}

function testCommentDensityLow() {
  const res = computeScores({ cloc: { SUM: { code: 200, comment: 0 } } });
  assert.strictEqual(res.meta.commentDensity, 0);
  assert.strictEqual(res.metrics.comment, 20);
}

function testCommentDensityOptimal() {
  const res = computeScores({ cloc: { SUM: { code: 200, comment: 30 } } });
  assert.ok(res.meta.commentDensity >= 10 && res.meta.commentDensity <= 25);
  assert.strictEqual(res.metrics.comment, 100);
}

function testDuplicationStringPercent() {
  const res = computeScores({ jscpd: { statistics: { total: { percentage: "6" } } }, cloc: { SUM: { code: 1000, comment: 0 } } });
  assert.strictEqual(res.meta.dupPercent, 6);
  assert.strictEqual(res.metrics.duplication, 80);
}

function testWeightsNormalize() {
  const weights = { style: 2, complexity: 0, duplication: 0, comment: 0 };
  const resolved = resolveWeights(weights);
  assert.strictEqual(resolved.style, 1);
  assert.strictEqual(resolved.complexity, 0);
  const res = computeScores({ cloc: { SUM: { code: 1000, comment: 100 } }, weights });
  assert.strictEqual(res.summary.overall, res.metrics.style);
}

function testDeterministicCreatedAt() {
  const fixed = new Date("2025-01-01T00:00:00.000Z");
  const res = computeScores({ cloc: { SUM: { code: 100, comment: 10 } }, now: fixed });
  assert.strictEqual(res.created_at, fixed.toISOString());
}

function main() {
  testNoInputs();
  testLintOverride();
  testComplexityOverride();
  testCommentDensityLow();
  testCommentDensityOptimal();
  testDuplicationStringPercent();
  testWeightsNormalize();
  testDeterministicCreatedAt();
  console.log("scorer tests passed");
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
