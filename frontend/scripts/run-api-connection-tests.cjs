const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.resolve(__dirname, "../src/lib/apiClient.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let fetchResult;
let timerCallback;
let cleared = 0;
const context = {
  exports: {}, process: { env: {} }, AbortController, DOMException, TypeError, URLSearchParams,
  setTimeout: (callback, delay) => { assert.equal(delay, 30000); timerCallback = callback; return 1; },
  clearTimeout: () => { cleared++; },
  fetch: (...args) => fetchResult(...args),
  require: (name) => {
    if (name === "@/lib/authStorage") return { getStoredAuthToken: () => null };
    if (name === "@/lib/saveDiagnostics") return { logSaveDiagnostic: () => {}, getSanitizedRequestPath: (p) => p, getSanitizedErrorName: (e) => e.name };
    throw new Error(`Unexpected runtime dependency: ${name}`);
  }
};
vm.runInNewContext(compiled, context);
const api = context.exports;

async function run() {
  fetchResult = async () => { timerCallback(); throw new DOMException("Aborted", "AbortError"); };
  await assert.rejects(api.fetchInspectionRecords("pipeline"), (error) => error instanceof api.ApiTimeoutError && !/not running/i.test(error.message));
  fetchResult = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(api.fetchInspectionRecords("pipeline"), (error) => error instanceof api.BackendUnavailableError);
  fetchResult = async () => ({ ok: false, status: 503, clone: () => ({ json: async () => ({ message: "Database unavailable" }) }) });
  await assert.rejects(api.fetchInspectionRecords("pipeline"), (error) => error instanceof api.ApiError && error.status === 503 && error.message === "Database unavailable");
  fetchResult = async (url) => { assert.ok(url.endsWith("pipelineId=pipe%20one")); return { ok: true, json: async () => [{ id: "inspection" }] }; };
  assert.deepEqual(await api.fetchInspectionRecords("pipe one"), [{ id: "inspection" }]);
  assert.equal(cleared, 4, "Every request must clear its timer");
  console.log("API connection checks passed: timeout, connection failure, server failure, successful inspection reload.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
