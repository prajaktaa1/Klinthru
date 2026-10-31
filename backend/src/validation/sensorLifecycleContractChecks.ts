import assert from "node:assert/strict";

import {
  assertValidLifecycleTransition,
  calibrationInputSchema,
  configurationInputSchema,
  hardwareEventInputSchema,
  maintenanceInputSchema
} from "./sensorLifecycleValidation";

const timestamp = "2026-01-01T00:00:00.000Z";

assert.equal(calibrationInputSchema.safeParse({ sensorId: "sensor-1", status: "Valid", calibratedAt: timestamp }).success, true);
assert.equal(maintenanceInputSchema.safeParse({ maintenanceType: "Inspection", priority: "Medium", status: "Pending" }).success, true);
assert.equal(hardwareEventInputSchema.safeParse({ eventType: "Offline", severity: "Warning", status: "Open", occurredAt: timestamp, message: "No heartbeat", source: "gateway" }).success, true);
assert.equal(configurationInputSchema.safeParse({ version: 1, status: "Draft", payload: { samplingIntervalSeconds: 60 } }).success, true);
assert.equal(calibrationInputSchema.safeParse({ sensorId: "sensor-1", status: "Invented" }).success, false);
assert.equal(configurationInputSchema.safeParse({ version: 0, status: "Draft", payload: {} }).success, false);
assert.doesNotThrow(() => assertValidLifecycleTransition("maintenance", "Pending", "In Progress"));
assert.throws(() => assertValidLifecycleTransition("maintenance", "Completed", "Pending"));
assert.doesNotThrow(() => assertValidLifecycleTransition("event", "Open", "Acknowledged"));
assert.throws(() => assertValidLifecycleTransition("configuration", "Published", "Draft"));
console.log("Sensor lifecycle validation checks passed.");
