#!/usr/bin/env node
/*
 * Dedupe analysis_issues rows caused by previous double-insert.
 * Keeps the first occurrence per (analysis_id, tool, file_path, line, column_number, rule, message).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
require("dotenv").config();
const { supabaseAdmin } = require("../web/db/supabaseAdmin");

const PAGE_SIZE = 1000;

async function fetchAllIssues() {
  let from = 0;
  let to = PAGE_SIZE - 1;
  let done = false;
  const all = [];

  while (!done) {
    const { data, error } = await supabaseAdmin
      .from("analysis_issues")
      .select("id,analysis_id,tool,file_path,line,column_number,rule,message", { count: "estimated" })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);

    if (data.length < PAGE_SIZE) {
      done = true;
    } else {
      from += PAGE_SIZE;
      to += PAGE_SIZE;
    }
  }

  return all;
}

function findDuplicates(rows) {
  const seen = new Map();
  const dupIds = [];

  for (const row of rows) {
    const key = [
      row.analysis_id,
      row.tool || "",
      row.file_path || "",
      row.line || 0,
      row.column_number || 0,
      row.rule || "",
      row.message || ""
    ].join("|");

    if (!seen.has(key)) {
      seen.set(key, row.id);
    } else {
      dupIds.push(row.id);
    }
  }

  return dupIds;
}

async function deleteDuplicates(ids) {
  if (ids.length === 0) return { deleted: 0 };

  const { error } = await supabaseAdmin.from("analysis_issues").delete().in("id", ids);
  if (error) throw error;
  return { deleted: ids.length };
}

async function main() {
  try {
    const rows = await fetchAllIssues();
    process.stdout.write(`Fetched ${rows.length} issue rows\n`);

    const dupIds = findDuplicates(rows);
    process.stdout.write(`Found ${dupIds.length} duplicates\n`);

    const { deleted } = await deleteDuplicates(dupIds);
    process.stdout.write(`Deleted ${deleted} duplicate rows\n`);
  } catch (err) {
    process.stderr.write(`Dedupe failed: ${err.message || err}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
