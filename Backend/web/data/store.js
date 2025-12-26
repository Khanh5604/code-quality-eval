// web/data/store.js
const fs = require("fs");
const path = require("path");

const REPORT_FILE = path.join(__dirname, "..", "..", "reports", "analyses.json");

function readAll() {
  if (!fs.existsSync(REPORT_FILE)) {
    return [];
  }
  const data = fs.readFileSync(REPORT_FILE, "utf8");
  return JSON.parse(data || "[]");
}

function saveAll(list) {
  fs.writeFileSync(REPORT_FILE, JSON.stringify(list, null, 2), "utf8");
}

function addAnalysis(analysis) {
  const list = readAll();
  list.push(analysis);
  saveAll(list);
  return analysis;
}

function getAnalysisById(id) {
  const list = readAll();
  return list.find(a => a.id === id);
}

function getAllAnalyses() {
  return readAll();
}

module.exports = {
  addAnalysis,
  getAnalysisById,
  getAllAnalyses
};
