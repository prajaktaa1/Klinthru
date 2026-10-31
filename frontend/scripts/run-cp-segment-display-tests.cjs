const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/cp-segment-display.ts"), "utf8")
  .replace(/export /g, "")
  .replace(/type LinkedSegmentLabel = \{ id: string; segmentId: string \};\r?\n/, "")
  .replace(/: string \| undefined/g, "")
  .replace(/: LinkedSegmentLabel\[\]/g, "")
  .replace(/\) \{/g, ") {");
const context = {};
vm.runInNewContext(`${source}\nthis.segmentDisplayName = segmentDisplayName;`, context);

const segments = [{ id: "db-segment-1", segmentId: "SEG-01" }];
assert.equal(context.segmentDisplayName("db-segment-1", segments), "SEG-01");
assert.equal(context.segmentDisplayName(undefined, segments), "Unavailable");
assert.equal(context.segmentDisplayName("unknown", segments), "unknown");

console.log("PASS CP test post segment display mapping");
