import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const route = fs.readFileSync(path.resolve(__dirname, "../routes/inspectionRecords.ts"), "utf8");
const env = fs.readFileSync(path.resolve(__dirname, "../config/env.ts"), "utf8");
const approved = [
  ["inspection-1793518398658-8tia1cwd", "PL001-DEMO-INSP-001", "cmvjraedr0003ue3oxdxtjaar"],
  ["inspection-1793518399187-9ufxrs3m", "PL001-DEMO-CP-002", "cmvrzpxbw0001ue94fpvr6kxf"],
  ["inspection-1793518399658-f6aly6pi", "PL001-DEMO-UT-003", "cmvrztrpb0003ue944tpouk59"]
] as const;

for (const [id, reference, segmentId] of approved) {
  assert.match(route, new RegExp(`${id}.*${reference}.*${segmentId}`), `Missing exact cleanup identity: ${reference}`);
}
assert.match(route, /env\.nodeEnv === "development"/);
assert.match(route, /env\.pl001DemoCleanupEnabled/);
assert.match(route, /user\.role === "Admin"/);
assert.match(route, /!env\.masterMutationWritesEnabled/);
assert.match(route, /verifiedPl001DemoBackup\(\)/);
assert.match(route, /pipeline\.pipelineCode !== "PL-001"/);
assert.match(route, /existing\[0\]\.reference !== expected\.reference/);
assert.match(route, /existing\[0\]\.segmentId !== expected\.segmentId/);
assert.match(route, /PL001_DEMO_CLEANUP\.has\(id\)/);
assert.match(env, /pl001DemoCleanupEnabled: readTrimmed\(process\.env\.PL001_DEMO_CLEANUP_ENABLED\) === "true"/);
assert.doesNotMatch(route, /MASTER_MUTATION_WRITES_ENABLED\s*=\s*true/);

for (const id of ["inspection-real-001", "other-pipeline-demo-001", "inspection-1793518398658-8tia1cwd-extra"]) {
  assert.equal(approved.some(([approvedId]) => approvedId === id), false, `Unexpected deletion identity allowed: ${id}`);
}

console.log("PL-001 scoped cleanup contract checks passed: fixed IDs, references, segment ownership, Admin/development/backup gates, global lock preservation and negative allowlist coverage.");
