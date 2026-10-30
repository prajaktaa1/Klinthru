import assert from "node:assert/strict";
import { validateSegmentOverlap } from "./segmentOverlapValidation";
const peers = [{ id: "saved", pipelineId: "A", segmentId: "SAVED", startKp: "0", endKp: "5" }];
let checks = 0;
const accepts = (startKp: string | undefined, endKp: string | undefined, pipelineId = "A", id?: string) => { validateSegmentOverlap({ pipelineId, segmentId: "NEW", startKp, endKp }, peers, id); checks++; };
const rejects = (startKp: string, endKp: string, pattern = /overlaps/) => { assert.throws(() => validateSegmentOverlap({ pipelineId: "A", segmentId: "NEW", startKp, endKp }, peers), error => { const fields = (error as { fields?: Record<string, string> }).fields; return Boolean(fields && Object.values(fields).some(message => pattern.test(message))); }); checks++; };
rejects("1", "2"); // contained
rejects("0", "5"); // same interval, different segment
rejects("0", "7"); // containing
rejects("4", "6"); // partial overlap
rejects("0+500", "1+500"); // engineering input
rejects("4.9999", "5.0001"); // sub-metre boundary
rejects("5", "4", /greater/);
rejects("0", "", /both/);
rejects("", "5", /both/);
accepts("5", "8"); // adjacent, equal endpoint
accepts("7", "8"); // separated
accepts("0", "5", "B"); // independent pipeline
accepts("0", "5", "A", "saved"); // self-edit excludes self
accepts(undefined, undefined); // existing optional unlocated drafts
console.log(`PASS ${checks} segment overlap checks`);
