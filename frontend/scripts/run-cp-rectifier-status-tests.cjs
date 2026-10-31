const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/cp-rectifier-status.ts"), "utf8")
  .replace(/export type RectifierOperationalStatus = [^;]+;\r?\n/, "")
  .replace(/export /g, "")
  .replace(/: RectifierOperationalStatus/g, "")
  .replace(/: string \| null \| undefined/g, "")
  .replace(/\) \{/g, ") {");
const context = {};
vm.runInNewContext(`${source}\nthis.getRectifierOperationalStatus = getRectifierOperationalStatus;\nthis.isRectifierOperationalOnline = isRectifierOperationalOnline;`, context);

assert.equal(context.getRectifierOperationalStatus("Active", null), "Not Available", "master Active without telemetry must not become Online");
assert.equal(context.getRectifierOperationalStatus(null, null), "Not Available", "missing telemetry must be Not Available");
assert.equal(context.getRectifierOperationalStatus("Active", "2026-10-31T00:00:00.000Z"), "Online", "telemetry Active may become Online");
assert.equal(context.getRectifierOperationalStatus("Offline", "2026-10-31T00:00:00.000Z"), "Offline");
assert.equal(context.getRectifierOperationalStatus("Maintenance", "2026-10-31T00:00:00.000Z"), "Warning");
assert.equal(context.isRectifierOperationalOnline("Active", null), false);
assert.equal(context.isRectifierOperationalOnline("Active", "2026-10-31T00:00:00.000Z"), true);

console.log("PASS CP rectifier telemetry status separation");
