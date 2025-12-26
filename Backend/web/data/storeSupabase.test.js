/* eslint-disable no-console */
const assert = require("assert");
const path = require("path");

function createSupabaseMock() {
  const store = {
    analyses: [],
    analysis_issues: []
  };

  const supabaseMock = {
    store,
    failIssueInsert: false,
    from: (table) => new Query(table, supabaseMock)
  };

  class Query {
    constructor(table, supabase) {
      this.table = table;
      this.supabase = supabase;
      this.filters = [];
      this.selectCountOpts = null;
      this.selectFields = null;
    }

    select(fields, opts = {}) {
      this.selectFields = fields;
      this.selectCountOpts = opts;
      return this;
    }

    eq(field, value) {
      this.filters.push({ field, op: "eq", value });
      return this;
    }

    gte(field, value) {
      this.filters.push({ field, op: "gte", value });
      return this;
    }

    order() {
      return this;
    }

    delete() {
      this.mode = "delete";
      return this;
    }

    async insert(rows) {
      if (this.table === "analysis_issues" && this.supabase.failIssueInsert) {
        return { error: new Error("issue insert fail") };
      }
      store[this.table].push(...rows);
      return { data: rows, error: null };
    }

    async maybeSingle() {
      const rows = this._filtered();
      if (rows.length === 0) return { data: null, error: null };
      if (rows.length > 1) return { data: null, error: new Error("multiple rows") };
      return { data: rows[0], error: null };
    }

    then(onFulfilled, onRejected) {
      try {
        const result = this._final();
        return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
      } catch (err) {
        if (onRejected) return Promise.resolve(onRejected(err));
        return Promise.reject(err);
      }
    }

    _filtered() {
      return store[this.table].filter((row) => {
        return this.filters.every((f) => {
          if (f.op === "eq") return row[f.field] === f.value;
          if (f.op === "gte") return row[f.field] >= f.value;
          return true;
        });
      });
    }

    _final() {
      if (this.mode === "delete") {
        const rows = this._filtered();
        const ids = new Set(rows.map((r) => r.id));
        store[this.table] = store[this.table].filter((r) => !ids.has(r.id));
        return { error: null };
      }
      const rows = this._filtered();
      if (this.selectCountOpts?.head) {
        return { count: rows.length, error: null };
      }
      return { data: rows, error: null };
    }
  }

  return {
    get store() {
      return supabaseMock.store;
    },
    get failIssueInsert() {
      return supabaseMock.failIssueInsert;
    },
    set failIssueInsert(v) {
      supabaseMock.failIssueInsert = v;
    },
    from: supabaseMock.from
  };
}

function loadStoreWithMock(supabaseAdmin) {
  const supabasePath = path.join(__dirname, "../db/supabase.js");
  const storePath = path.join(__dirname, "./storeSupabase.js");
  delete require.cache[supabasePath];
  delete require.cache[storePath];
  require.cache[supabasePath] = { exports: { supabaseAdmin } };
  return require(storePath);
}

async function testValidationMissingFields() {
  const mock = createSupabaseMock();
  const store = loadStoreWithMock(mock);

  await assert.rejects(
    () => store.addAnalysis("u1", { projectName: "p", scores: { summary: { overall: 1, quality_level: "A" } } }),
    /analysis.id/
  );

  await assert.rejects(
    () => store.addAnalysis("u1", { id: "a1", scores: { summary: { overall: 1, quality_level: "A" } } }),
    /analysis.projectName/
  );

  await assert.rejects(
    () => store.addAnalysis("u1", { id: "a1", projectName: "p", scores: { summary: { quality_level: "A" } } }),
    /analysis.scores.summary.overall/
  );

  await assert.rejects(
    () =>
      store.addAnalysis("u1", {
        id: "a1",
        projectName: "p",
        scores: { summary: { overall: 1, quality_level: "A" } },
        issues: [{ message: "m" }]
      }),
    /issue\[0\].file/
  );

  await assert.rejects(
    () =>
      store.addAnalysis("u1", {
        id: "a1",
        projectName: "p",
        scores: { summary: { overall: 1, quality_level: "A" } },
        issues: [{ file: "f" }]
      }),
    /issue\[0\].message/
  );

  console.log("✓ validation rejects missing required fields");
}

async function testRollbackOnIssueInsertFailure() {
  const mock = createSupabaseMock();
  mock.failIssueInsert = true;
  const store = loadStoreWithMock(mock);

  await assert.rejects(
    () =>
      store.addAnalysis("u1", {
        id: "a1",
        projectName: "p",
        scores: { summary: { overall: 1, quality_level: "A" } },
        issues: [{ file: "f", message: "m" }]
      }),
    /issue insert fail/
  );

  assert.strictEqual(mock.store.analyses.length, 0, "analysis should be rolled back when issues fail");
  console.log("✓ rollback cleans orphan analysis on issue insert failure");
}

async function testAuthGuards() {
  const mock = createSupabaseMock();
  const store = loadStoreWithMock(mock);

  await assert.rejects(() => store.countAnalysesTotal(), /authenticated/);
  await assert.rejects(() => store.getAnalysisById(), /authenticated/);

  console.log("✓ auth guards reject missing userId for count/get");
}

async function main() {
  await testValidationMissingFields();
  await testRollbackOnIssueInsertFailure();
  await testAuthGuards();
  console.log("All tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
