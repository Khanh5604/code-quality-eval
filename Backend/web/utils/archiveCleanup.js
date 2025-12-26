const fs = require("fs");
const path = require("path");

function getTotalBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((sum, entry) => {
    const p = path.join(dir, entry);
    try {
      const st = fs.statSync(p);
      return st.isFile() ? sum + st.size : sum;
    } catch {
      return sum;
    }
  }, 0);
}

function removeOldFiles({ archiveDir, ttlMs, log }) {
  if (!fs.existsSync(archiveDir)) return { deleted: 0, freed: 0 };
  const now = Date.now();
  let deleted = 0;
  let freed = 0;

  for (const entry of fs.readdirSync(archiveDir)) {
    const p = path.join(archiveDir, entry);
    let stat;
    try {
      stat = fs.statSync(p);
    } catch (err) {
      log(`stat fail ${entry}: ${err.message}`);
      continue;
    }
    if (!stat.isFile()) continue;
    const age = now - stat.mtimeMs;
    if (age > ttlMs) {
      try {
        fs.unlinkSync(p);
        deleted += 1;
        freed += stat.size;
      } catch (err) {
        log(`delete fail ${entry}: ${err.message}`);
      }
    }
  }

  return { deleted, freed };
}

function humanBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function scheduleArchiveCleanup({ archiveDir, ttlHours = 168, intervalHours = 6, warnThresholdBytes }) {
  const log = (msg) => process.stdout.write(`[archive-cleanup] ${msg}\n`);
  const ttlMs = Math.max(1, ttlHours) * 3600000;
  const intervalMs = Math.max(1, intervalHours) * 3600000;

  const run = () => {
    getTotalBytes(archiveDir); // pre-calc triggers stat errors early; value unused
    const { deleted, freed } = removeOldFiles({ archiveDir, ttlMs, log });
    const after = getTotalBytes(archiveDir);

    if (deleted > 0 || freed > 0) {
      log(`cleanup done: deleted=${deleted}, freed=${humanBytes(freed)}, remaining=${humanBytes(after)}`);
    }

    if (warnThresholdBytes && after > warnThresholdBytes) {
      log(`WARNING archive size ${humanBytes(after)} exceeds threshold ${humanBytes(warnThresholdBytes)}`);
    }
  };

  run();
  setInterval(run, intervalMs);
}

module.exports = { scheduleArchiveCleanup };
