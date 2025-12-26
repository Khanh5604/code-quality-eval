// tools/aggregate-cli.js
const fs = require("fs");
const path = require("path");
const { computeScores } = require("./scorer");

const ROOT = process.cwd();
const reportsDir = path.join(ROOT, "reports");

function readJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return fallback;
  }
}

const eslint = readJSON(path.join(reportsDir, "eslint.json"), []);
const cloc = readJSON(path.join(reportsDir, "cloc.json"), {});
const jscpd = readJSON(path.join(reportsDir, "jscpd-report.json"), {});

const out = computeScores({
  eslint,
  cloc,
  jscpd,
  projectName: "sample-project"
});

fs.writeFileSync(
  path.join(reportsDir, "report-normalized.json"),
  JSON.stringify(out, null, 2),
  "utf8"
);

console.log("OK -> reports/report-normalized.json");
