const assert = require("node:assert/strict");
const { readFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");

process.env.DATABASE_URL = "";
process.env.NODE_ENV = "test";
let engine;
try { engine = require("@electric-sql/pglite"); }
catch {
  for (const entry of process.env.PATH.split(require("node:path").delimiter)) {
    try { engine = require(resolve(entry, "../@electric-sql/pglite")); break; } catch {}
  }
}
if (!engine) throw new Error("Run with temporary @electric-sql/pglite tooling; no application dependency is required.");

async function run() {
  // Prisma decodes timestamp-without-timezone as UTC; match it in the isolated driver.
  const db = new engine.PGlite({ parsers: { 1114: value => new Date(value.replace(" ", "T") + "Z") } });
  await db.exec(`CREATE TABLE "User" (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE "Pipeline" (id TEXT PRIMARY KEY);
    CREATE TABLE "Asset" (id TEXT PRIMARY KEY, "pipelineId" TEXT, "assetId" TEXT);
    CREATE TABLE "SensorAssignment" (id TEXT PRIMARY KEY);
    CREATE TABLE "IntegrationConnector" (id TEXT PRIMARY KEY,name TEXT,"connectorType" TEXT,enabled BOOLEAN,status TEXT,"authorId" TEXT,"lastSuccessfulTestAt" TIMESTAMP,endpoint TEXT DEFAULT 'https://source.test.invalid',configuration JSONB DEFAULT '{}',"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "IntegrationEvent" (id TEXT PRIMARY KEY);`);
  await db.exec(readFileSync(resolve(__dirname, "../../prisma/migrations/202610091700_add_scada_overview/migration.sql"), "utf8"));
  await db.exec(readFileSync(resolve(__dirname, "../../prisma/migrations/202610091830_add_scada_operational_records/migration.sql"), "utf8"));
  await db.exec(readFileSync(resolve(__dirname, "../../prisma/migrations/202610101000_add_scada_logical_settings/migration.sql"), "utf8"));
  await db.exec(`INSERT INTO "Pipeline" VALUES ('test-pipeline');
    INSERT INTO "Asset" (id,"pipelineId",name,"facilityType","equipmentType") VALUES ('test-asset','test-pipeline','Test station','Inlet',NULL);
    INSERT INTO "IntegrationConnector" (id,name,"connectorType",enabled,status,"authorId") VALUES ('test-connector','Test source','REST',true,'Ready','test-admin');`);
  const prisma = require("../../dist/lib/prisma");
  let failQualityWrite = false;
  const databaseFor = driver => ({
    $queryRawUnsafe: async (sql, ...values) => { if (failQualityWrite && sql.includes('INSERT INTO "DataQualityRecord"')) { failQualityWrite = false; throw new Error("Injected late write failure"); } try { return (await driver.query(sql, values)).rows; } catch (error) { if (error.code !== "23505") console.error("Isolated SQL failed:", error.message); throw error; } },
    integrationConnector: {
      findFirst: async ({ where }) => (await driver.query('SELECT * FROM "IntegrationConnector" WHERE id=$1 AND ($2::text IS NULL OR "authorId"=$2) AND ($3::boolean IS NULL OR enabled=$3)', [where.id, where.authorId ?? null, where.enabled ?? null])).rows[0] ?? null,
      findMany: async ({ where }) => (await driver.query('SELECT * FROM "IntegrationConnector" WHERE ($1::text IS NULL OR "authorId"=$1)', [where.authorId ?? null])).rows
    },
    integrationEvent: { findMany: async () => (await driver.query('SELECT * FROM "IntegrationEvent"')).rows },
    sensorAssignment: { findFirst: async () => null }
  });
  const database = { ...databaseFor(db), $transaction: callback => db.transaction(tx => callback(databaseFor(tx))) };
  prisma.getPrismaClient = () => database;
  const { store } = require("../../dist/data/store");
  const users = { "test-admin": { id: "test-admin", name: "Test Admin", email: "admin@test.invalid", role: "Admin" }, "test-viewer": { id: "test-viewer", name: "Test Viewer", email: "viewer@test.invalid", role: "Viewer" } };
  users["test-engineer"] = { id: "test-engineer", name: "Test Engineer", email: "engineer@test.invalid", role: "Engineer" };
  for (const user of Object.values(users)) await db.query('INSERT INTO "User" (id,name) VALUES ($1,$2)', [user.id, user.name]);
  store.findUserById = async id => users[id] ?? null;
  store.findPipelineById = async (id, scope) => id === "test-pipeline" && (scope.viewerRole === "Admin" || scope.viewerUserId === "test-admin") ? { id, pipelineCode: "TEST", pipelineName: "Test pipeline", pipeLengthKm: 10 } : null;
  store.findAssetById = async (id, scope) => id === "test-asset" && (!scope || scope.viewerRole === "Admin" || scope.viewerUserId === "test-admin") ? { id, pipelineId: "test-pipeline", assetId: "TEST-ASSET", name: "Test station", physicalStatus: "Active" } : null;
  store.listAssets = async () => [{ id: "test-asset", assetId: "TEST-ASSET", name: "Test station", facilityType: "Inlet", pipelineId: "test-pipeline", latitude: 19, longitude: 73, kp: "0" }];
  store.listSegments = async () => [];
  const { createApp } = require("../../dist/app");
  const { signToken } = require("../../dist/lib/jwt");
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, role = "test-admin", method = "GET", body) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${signToken({ sub: role, email: users[role].email, role: users[role].role })}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal((await call("/api/scada/overview?pipelineId=test-pipeline", null)).status, 401);
    assert.equal((await call("/api/scada/overview?pipelineId=test-pipeline", "test-viewer")).status, 400);
    assert.equal((await call("/api/scada/tags", "test-viewer", "POST", {})).status, 403);
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-viewer", "POST", {})).status, 403);
    const tag = { id: "test-tag", sourceTagName: "pressure.pv", displayName: "Test pressure", measurementType: "Pressure", engineeringUnit: "barg", pipelineId: "test-pipeline", assetId: "test-asset", connectorId: "test-connector", sourceSystemId: "test-source", scanIntervalSeconds: 1, staleAfterSeconds: 600, high: 100, thresholdSource: "Source operational alarm" };
    assert.equal((await call("/api/scada/tags", "test-admin", "POST", tag)).status, 201);
    assert.equal((await call("/api/scada/tags", "test-admin", "POST", tag)).status, 409);
    const empty = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(empty.status, "Not Connected", JSON.stringify(empty)); assert.equal(empty.tags[0].processStatus, "Unknown"); assert.equal(empty.kpis.equipmentIssues, null);
    const now = new Date().toISOString();
    failQualityWrite = true;
    const failedBatch = { readings: [{ tagId: "test-tag", sourceTimestamp: now, sourceTimezone: "UTC", engineeringUnit: "barg", value: 12, quality: "Good", sequence: "rollback" }], alarms: [{ tagId: "test-tag", sourceAlarmId: "rollback-alarm", description: "Rollback alarm", sourcePriority: "Minor", severity: "Medium", raisedAt: now, sourceStatus: "Active" }], events: [{ eventId: "rollback-event", pipelineId: "test-pipeline", tagId: "test-tag", eventType: "Test", severity: "Info", description: "Rollback event", occurredAt: now, sourceSystemId: "test-source" }] };
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", failedBatch)).status, 500);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "SharedTimeSeriesReading"')).rows[0].count, 0, "Late failure must roll back all readings");
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "ScadaAlarm"')).rows[0].count, 0, "Late failure must roll back alarms");
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "ScadaEvent"')).rows[0].count, 0, "Late failure must roll back events");
    const batch = { readings: [{ tagId: "test-tag", sourceTimestamp: now, sourceTimezone: "UTC", engineeringUnit: "barg", value: 70, quality: "Good" }], alarms: [{ tagId: "test-tag", sourceAlarmId: "test-source-alarm", description: "Test alarm", sourcePriority: "Minor", severity: "Medium", raisedAt: now, sourceStatus: "Active", measuredValue: 70, threshold: 100, comparator: ">" }] };
    const result = await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", batch);
    assert.equal(result.status, 200); const ingestionResult = await result.json(); assert.equal(ingestionResult.accepted, 1); assert.equal(ingestionResult.duplicate, 0); assert.equal(ingestionResult.alarmsProcessed, 1); assert.equal(ingestionResult.qualityRecordsProcessed, 1);
    assert.equal((await (await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", batch)).json()).duplicate, 1);
    const current = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(current.status, "Live", JSON.stringify({ status: current.status, tags: current.tags, sources: current.sources })); assert.equal(current.tags[0].reading.value, 70); assert.equal(current.kpis.activeAlarms, 1);
    assert.equal(current.tags[0].reading.sourceTimestamp, now); assert.equal(current.alarms[0].sourcePriority, "Minor"); assert.equal(current.alarms[0].severity, "Medium");
    const config = await (await call("/api/scada/configuration?pipelineId=test-pipeline")).json();
    assert.equal(config.polling,null); assert.equal(config.routing,null); assert.deepEqual(config.units,[]);
    assert.equal(config.unitDictionaryAvailable,false);
    const configuredTag = config.tags[0];
    const settings = { expectedUpdatedAt: configuredTag.updatedAt, displayName: configuredTag.displayName, description: "Edited through logical settings", measurementType: "Pressure", scanIntervalSeconds: configuredTag.scanIntervalSeconds, staleAfterSeconds: configuredTag.staleAfterSeconds, highHigh: 120, high: 100, low: 20, lowLow: 10, thresholdSource: "Approved operating limits", groupName: "Operations", historianEnabled: true, displayPrecision: 3, active: true };
    assert.equal((await call("/api/scada/tags/test-tag", "test-viewer", "PATCH", settings)).status, 403);
    const updated = await call("/api/scada/tags/test-tag", "test-admin", "PATCH", settings);
    assert.equal(updated.status, 200, await updated.clone().text());
    assert.equal((await updated.json()).groupName, "Operations");
    assert.equal((await call("/api/scada/tags/test-tag", "test-admin", "PATCH", settings)).status, 409);
    const afterConfig = await (await call("/api/scada/configuration?pipelineId=test-pipeline")).json();
    assert.equal(config.changes.length, 1, "Duplicate registration must not add an audit record");
    assert.equal(afterConfig.changes.length, config.changes.length + 1); assert.equal(afterConfig.changes[0].actorName, "Test Admin");
    const currentSettings = { ...settings, expectedUpdatedAt: afterConfig.tags[0].updatedAt };
    assert.equal((await call("/api/scada/tags/test-tag", "test-engineer", "PATCH", currentSettings)).status, 403);
    assert.equal((await call("/api/scada/tags/test-tag", "test-admin", "PATCH", { ...currentSettings, low: 200 })).status, 400);
    assert.equal((await call("/api/scada/tags/test-tag", "test-admin", "PATCH", { ...currentSettings, connectorId: "foreign" })).status, 400);
    assert.equal((await call("/api/asset-master/assets/test-asset", "test-viewer")).status, 404);
    assert.equal((await call("/api/asset-master/assets/test-asset")).status, 200);
    const periodResponse = await call("/api/scada/data-quality?pipelineId=test-pipeline&hours=168");
    assert.equal(periodResponse.status, 200, await periodResponse.clone().text());
    const qualityPeriod = await periodResponse.json(); assert.equal(qualityPeriod.trend.length, 24); assert.equal(qualityPeriod.heatmap.length, 24);
    assert.equal(qualityPeriod.expected, Math.ceil((Date.parse(qualityPeriod.end) - Math.max(Date.parse(qualityPeriod.start), Date.parse(configuredTag.activeFrom))) / (configuredTag.scanIntervalSeconds * 1000)), "Buckets must not double-count scan slots");
    assert.equal(qualityPeriod.expected, qualityPeriod.trend.reduce((sum, point) => sum + point.expected, 0));
    assert.equal(qualityPeriod.deltas.valid, null, "Absent previous telemetry must not yield a fabricated delta");
    assert.equal(qualityPeriod.previous.totalReadings, 0);
    assert.equal((await call("/api/scada/data-quality?pipelineId=test-pipeline&hours=17")).status, 400);
    assert.equal((await call("/api/scada/data-quality?pipelineId=test-pipeline", "test-viewer")).status, 400);
    const extended = { events: [{ eventId: "test-event", pipelineId: "test-pipeline", tagId: "test-tag", eventType: "Valve Stroke Test Completed", severity: "Info", description: "Valve stroke test completed", occurredAt: now, status: "Closed", sourceSystemId: "test-source" }], anomalies: [{ anomalyId: "test-anomaly", tagId: "test-tag", anomalyType: "Spike", severity: "Medium", description: "Pressure spike", detectedAt: now }], indicators: [{ indicatorId: "test-indicator", pipelineId: "test-pipeline", name: "Pressure Cycle Count", value: 4, engineeringUnit: "cycles", measuredAt: now, sourceSystemId: "test-source" }] };
    const extendedResult = await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", extended); assert.equal(extendedResult.status, 200); const extendedJson = await extendedResult.json(); assert.equal(extendedJson.eventsProcessed, 1); assert.equal(extendedJson.anomaliesProcessed, 1); assert.equal(extendedJson.indicatorsProcessed, 1);
    const extendedOverview = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json(); assert.equal(extendedOverview.events.length, 1); assert.equal(extendedOverview.anomalies.length, 1); assert.equal(extendedOverview.indicators.length, 1);
    const alarmRow = (await db.query('SELECT id FROM "ScadaAlarm" WHERE "sourceAlarmId"=$1', ["test-source-alarm"])).rows[0]; const noteResponse = await call(`/api/scada/alarms/${alarmRow.id}/notes`, "test-admin", "POST", { note: "Investigated source alarm", followUp: "Review threshold" }); assert.equal(noteResponse.status, 201);
    assert.equal((await call(`/api/scada/alarms/${alarmRow.id}/notes`, "test-viewer", "POST", { note: "Denied" })).status, 403);
    assert.equal((await call(`/api/scada/alarms/${alarmRow.id}/acknowledge`, "test-viewer", "PATCH", {})).status, 403);
    assert.equal((await call(`/api/scada/alarms/${alarmRow.id}/notes`, "test-admin", "POST", { note: " " })).status, 400);
    const savedNotes = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(savedNotes.alarms[0].notes[0].followUp, "Review threshold");
    assert.equal(savedNotes.dataQuality.heatmap.length, 24);
    assert.equal((await call("/api/scada/configuration?pipelineId=test-pipeline")).status, 200);
    assert.equal((await call("/api/scada/configuration?pipelineId=test-pipeline", "test-viewer")).status, 400);
    await db.query('UPDATE "IntegrationConnector" SET "authorId"=$1 WHERE id=$2', ["test-engineer", "test-connector"]);
    assert.equal((await call(`/api/scada/alarms/${alarmRow.id}/notes`, "test-engineer", "POST", { note: "Inaccessible pipeline" })).status, 400, "Connector ownership must not bypass pipeline access");
    assert.equal((await call(`/api/scada/alarms/${alarmRow.id}/acknowledge`, "test-engineer", "PATCH", {})).status, 400, "Acknowledgement requires pipeline access");
    await db.query('UPDATE "IntegrationConnector" SET "authorId"=$1 WHERE id=$2', ["test-admin", "test-connector"]);
    const acknowledgement = await call(`/api/scada/alarms/${alarmRow.id}/acknowledge`, "test-admin", "PATCH", {});
    assert.equal(acknowledgement.status, 200);
    const acknowledged = await acknowledgement.json();
    assert.equal(acknowledged.klinthruStatus, "Acknowledged");
    assert.equal(acknowledged.sourceStatus, "Active");
    await db.exec(`INSERT INTO "Pipeline" VALUES ('foreign-pipeline');`);
    await db.query('INSERT INTO "ScadaEvent" (id,"eventId","pipelineId","eventType",severity,description,"occurredAt","sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8)', ["foreign-event-row", "foreign-event", "foreign-pipeline", "Foreign", "Info", "Preserve foreign event", now, "foreign-source"]);
    const collision = await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", { events: [{ ...extended.events[0], eventId: "foreign-event", description: "Overwrite attempt" }] });
    assert.equal(collision.status, 400, "Record IDs must not overwrite another pipeline's records");
    assert.equal((await db.query('SELECT description FROM "ScadaEvent" WHERE "eventId"=$1', ["foreign-event"])).rows[0].description, "Preserve foreign event");
    await db.query('INSERT INTO "ScadaAnomaly" (id,"anomalyId","pipelineId","anomalyType",severity,description,"detectedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp)', ["foreign-anomaly-row", "foreign-anomaly", "foreign-pipeline", "Spike", "Info", "Preserve anomaly", now]);
    await db.query('INSERT INTO "ScadaIndicator" (id,"indicatorId","pipelineId",name,value,"measuredAt","sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6::timestamp,$7)', ["foreign-indicator-row", "foreign-indicator", "foreign-pipeline", "Foreign indicator", 9, now, "foreign-source"]);
    await db.query('INSERT INTO "DataQualityRecord" (id,"recordId","pipelineId",quality,"recordedAt") VALUES ($1,$2,$3,$4,$5::timestamp)', ["foreign-quality-row", "foreign-quality", "foreign-pipeline", "Bad", now]);
    for (const collisionBody of [
      { anomalies: [{ ...extended.anomalies[0], anomalyId: "foreign-anomaly" }] },
      { indicators: [{ ...extended.indicators[0], indicatorId: "foreign-indicator" }] },
      { qualityRecords: [{ recordId: "foreign-quality", tagId: "test-tag", quality: "Good", recordedAt: now }] }
    ]) assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", collisionBody)).status, 400);
    const extendedReplay = await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", extended);
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", { events: [{ ...extended.events[0], eventId: "invalid-source", sourceSystemId: "unregistered" }] })).status, 400);
    assert.equal(extendedReplay.status, 200);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "ScadaEvent" WHERE "eventId"=$1', ["test-event"])).rows[0].count, 1);
    const history = await (await call("/api/scada/tags/test-tag/history?hours=24")).json();
    assert.equal(history.points.length, 1); assert.equal(history.points[0].value, 70);
    assert.equal(history.summary.average, 70);
    assert.equal(history.summary.min, 70);
    for (const aggregation of ["Raw", "Average", "Min", "Max", "Sum"]) {
      const response = await call(`/api/scada/tags/test-tag/history?hours=24&aggregation=${aggregation}`);
      assert.equal(response.status, 200); const result = await response.json(); assert.equal(result.aggregation, aggregation); assert.equal(result.points[0].value, 70);
    }
    assert.equal((await call("/api/scada/tags/test-tag/history?aggregation=Injected")).status, 400);
    assert.ok(history.summary.completenessPercent < 1, "One reading must not mean 100% completeness");
    assert.ok(history.summary.expectedSlots > 1);
    const csv = await call("/api/reports/scada-export?pipelineId=test-pipeline&format=csv&tagIds=test-tag&hours=24&resolutionMinutes=5");
    assert.equal(csv.status, 200); assert.match(csv.headers.get("content-type"), /text\/csv/);
    assert.match(await csv.text(), /test-tag/);
    assert.equal((await call("/api/reports/scada-export?pipelineId=test-pipeline&format=csv&tagIds=foreign-tag")).status, 400);
    assert.equal((await call("/api/reports/scada-export?pipelineId=test-pipeline&format=csv&tagIds=test-tag&start=invalid")).status, 400);
    const bucketTime = Math.floor(Date.now() / 3600000) * 3600000 - 2 * 3600000;
    const uneven = { readings: [10, 20, 90].map((value, index) => ({ ...batch.readings[0], value, sequence: `statistics-${index}`, sourceTimestamp: new Date(bucketTime - (index === 2 ? 3600000 : 0) + index * 1000).toISOString() })) };
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", uneven)).status, 200);
    const accurate = await (await call("/api/scada/tags/test-tag/history?hours=24&resolutionMinutes=60")).json();
    assert.equal(accurate.summary.min, 10); assert.equal(accurate.summary.max, 90);
    assert.equal(accurate.summary.average, 47.5, "Average must weight raw samples, not averaged buckets");
    for (const [aggregation, expected] of [["Min",10],["Max",90],["Sum",190]]) {
      const aggregated = await (await call(`/api/scada/tags/test-tag/history?hours=24&resolutionMinutes=1440&aggregation=${aggregation}`)).json();
      const values = aggregated.points.map(point => point.value).filter(value => value !== null);
      assert.equal(aggregation === "Sum" ? values.reduce((sum,value) => sum+value,0) : aggregation === "Min" ? Math.min(...values) : Math.max(...values), expected);
      assert.equal(aggregated.summary.average, 47.5, "Summary must remain raw-sample weighted");
    }
    assert.ok(accurate.summary.completenessPercent < 1);
    const missingReading = { readings: [{ ...batch.readings[0], sourceTimestamp: new Date(Date.now()-600000).toISOString(), value: null, quality: "Missing", sequence: "missing-slot" }] };
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", missingReading)).status, 200);
    const afterMissing = await (await call("/api/scada/tags/test-tag/history?hours=24&resolutionMinutes=60")).json();
    assert.equal(afterMissing.summary.observedSlots,accurate.summary.observedSlots,"Explicit Missing must not count as observed telemetry");
    assert.equal((await call("/api/scada/tags/test-tag/history?hours=NaN")).status, 400);
    assert.equal((await call("/api/scada/tags/test-tag/history", "test-viewer")).status, 400);
    const exportResponse = await call("/api/reports/scada-export?pipelineId=test-pipeline");
    assert.equal(exportResponse.status, 200); assert.match(exportResponse.headers.get("content-disposition"), /attachment/);
    const bad = { readings: [{ ...batch.readings[0], sourceTimestamp: new Date(Date.now() + 1).toISOString(), value: "NaN", quality: "Good" }] };
    assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", bad)).status, 200);
    const stored = (await db.query('SELECT * FROM "SharedTimeSeriesReading" WHERE "rawValue"=$1::jsonb', [JSON.stringify("NaN")])).rows[0];
    assert.equal(stored.quality, "Bad"); assert.equal(stored.value, null); assert.equal(stored.rawValue, "NaN");
    const storedQuality = (await db.query('SELECT quality FROM "DataQualityRecord" WHERE "tagId"=$1 AND "recordedAt"=$2::timestamp', [stored.tagId, stored.sourceTimestamp.toISOString()])).rows[0];
    assert.equal(storedQuality.quality, stored.quality, "Quality records must match validated reading quality");
    const qualityAt = new Date(Date.now() - 2 * 3600000).toISOString();
    const qualityResponse = await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", { qualityRecords: [{ recordId: "test-quality-record", tagId: "test-tag", quality: "Bad", reason: "Source validation failure", recordedAt: qualityAt }] });
    assert.equal(qualityResponse.status, 200);
    assert.equal((await qualityResponse.json()).qualityRecordsProcessed, 1);
    const qualityDetails = await (await call("/api/scada/data-quality?pipelineId=test-pipeline&hours=24")).json();
    assert.ok(qualityDetails.exceptions.some(item => item.details === "Source validation failure" && item.quality === "Bad"));
    const qualityOverview = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(qualityOverview.dataQuality.heatmap.find(point => point.bucket.slice(0, 13) === qualityAt.slice(0, 13)).quality, "Bad", "Heatmap must include ingested quality records");
    const replay = { readings: [{ ...batch.readings[0], sourceTimestamp: new Date(Date.now() - 3600000).toISOString(), sequence: "late" }] };
    await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", replay);
    const afterReplay = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.notEqual(afterReplay.tags[0].reading.sourceTimestamp, replay.readings[0].sourceTimestamp);
    await db.query('UPDATE "IntegrationConnector" SET status=$1 WHERE id=$2', ["Failed", "test-connector"]);
    const failed = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(failed.status, "Stale"); assert.equal(failed.tags[0].processStatus, "Stale");
    assert.equal((await call("/api/scada/plc-command", "test-admin", "POST", {})).status, 404);
    await db.query('INSERT INTO "ScadaEvent" (id,"eventId","pipelineId","eventType",severity,description,"occurredAt","sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8)', ["unmapped-event-row","unmapped-event","test-pipeline","Private","Info","Unmapped source event",now,"unmapped-source"]);
    await db.query('INSERT INTO "ScadaIndicator" (id,"indicatorId","pipelineId",name,value,"measuredAt","sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6::timestamp,$7)', ["unmapped-indicator-row","unmapped-indicator","test-pipeline","Private indicator",9,now,"unmapped-source"]);
    users["test-admin"].role = "Viewer";
    const scopedOverview = await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();
    assert.equal(scopedOverview.events.some(event => event.eventId === "unmapped-event"),false);
    assert.equal(scopedOverview.indicators.some(indicator => indicator.indicatorId === "unmapped-indicator"),false);
    assert.equal(scopedOverview.events.some(event => event.eventId === "test-event"),true);
    users["test-admin"].role = "Admin";
    if (process.env.SCADA_BROWSER_BASE) {
      await db.query('UPDATE "IntegrationConnector" SET status=$1 WHERE id=$2', ["Ready", "test-connector"]);
      for (const fixture of [{ id: "test-flow", measurementType: "Flow", engineeringUnit: "m3/h", value: 120.12345 }, { id: "test-temperature", measurementType: "Temperature", engineeringUnit: "C", value: 42 }]) {
        assert.equal((await call("/api/scada/tags", "test-admin", "POST", { ...tag, id: fixture.id, sourceTagName: fixture.id, displayName: fixture.id, measurementType: fixture.measurementType, engineeringUnit: fixture.engineeringUnit })).status, 201);
        assert.equal((await call("/api/integrations/connectors/test-connector/scada-ingestion", "test-admin", "POST", { readings: [{ tagId: fixture.id, sourceTimestamp: new Date().toISOString(), sourceTimezone: "UTC", engineeringUnit: fixture.engineeringUnit, value: fixture.value, quality: "Good" }] })).status, 200);
      }
      let playwright;
      try { playwright = require("playwright"); } catch {}
      for (const entry of process.env.PATH.split(require("node:path").delimiter)) {
        try { playwright = require(resolve(entry, "../playwright")); break; } catch {}
      }
      if (!playwright) throw new Error("Temporary playwright tooling is required for browser verification.");
      const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
      const artifactPath = resolve(__dirname, "../../../.scada-verification");
      mkdirSync(artifactPath, { recursive: true });
      try {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
          await db.query('UPDATE "ScadaAlarm" SET "klinthruStatus"=$1,"acknowledgedAt"=NULL,"acknowledgedBy"=NULL WHERE "tagId"=$2', ["Unacknowledged", "test-tag"]);
          const context = await browser.newContext({ viewport });
          await context.addInitScript(() => localStorage.setItem("klinthru-auth-token", "isolated-test-session"));
          await context.route("**/api/**", async route => {
            const url = new URL(route.request().url());
            if (url.pathname === "/api/auth/me") return route.fulfill({ json: users["test-admin"] });
            if (url.pathname === "/api/pipelines") return route.fulfill({ json: [{ id: "test-pipeline", pipelineCode: "TEST", pipelineName: "Test pipeline", pipeLengthKm: 10 }] });
            const response = await call(url.pathname + url.search, "test-admin", route.request().method(), route.request().postDataJSON() ?? undefined);
            await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
          });
          const page = await context.newPage(), browserErrors = [];
          page.on("pageerror", error => browserErrors.push(error.message));
          await page.goto(process.env.SCADA_BROWSER_BASE + "/scada", { waitUntil: "domcontentloaded", timeout: 60000 });
          try { await page.getByRole("button", { name: /Stations Online/ }).waitFor({ timeout: 30000 }); }
          catch (error) { await page.screenshot({ path: resolve(artifactPath, `failure-${viewport.width}.png`), fullPage: true }); writeFileSync(resolve(artifactPath, `failure-${viewport.width}.json`), JSON.stringify({ browserErrors, text: await page.locator("body").innerText() }, null, 2)); throw error; }
          await page.getByRole("button", { name: /Configure View/ }).click();
          await page.getByRole("button", { name: /Configure View/ }).click();
          for (const tabName of ["Overview", "Pipeline View", "Stations & Facilities", "Real-Time Data", "Trends & Historical", "Alarms & Events", "Data Quality", "Configuration"]) {
            await page.getByRole("tab", { name: tabName, exact: true }).click();
            assert.equal(await page.getByRole("tab", { name: tabName, exact: true }).getAttribute("aria-selected"), "true");
            await page.screenshot({ path: resolve(artifactPath, `${tabName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${viewport.width}.png`), fullPage: true });
            writeFileSync(resolve(artifactPath, `${tabName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${viewport.width}.txt`), await page.locator("body").innerText());
            console.log(`BROWSER ${viewport.width} ${tabName}: selected; horizontal overflow=${await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
            if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) console.log("OVERFLOW", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => element.getBoundingClientRect().right > innerWidth && getComputedStyle(element).overflowX !== "auto").slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent.slice(0, 100), right: element.getBoundingClientRect().right })))));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${tabName} must fit ${viewport.width}px`);
            if (tabName === "Pipeline View") {
              await page.getByRole("button", { name: "Zoom in", exact: true }).click();
              assert.equal(await page.getByRole("button", { name: "Zoom out", exact: true }).isEnabled(), true);
              await page.getByRole("button", { name: "Zoom out", exact: true }).click();
              await page.getByRole("button", { name: "Map layers", exact: true }).click();
              assert.equal(await page.getByRole("checkbox", { name: /Satellite Imagery/ }).isDisabled(), true);
              await page.getByRole("heading", { name: "Pipeline Profile", exact: true }).waitFor();
            }
            if (tabName === "Overview") {
              await page.getByRole("button", { name: "Open alarm test-source-alarm", exact: true }).click();
              await page.getByRole("heading", { name: "Alarm Details & Actions", exact: true }).waitFor();
              await page.getByRole("button", { name: "Close alarm details", exact: true }).click();
              await page.getByRole("tab", { name: "Overview", exact: true }).click();
            }
            if (tabName === "Stations & Facilities") {
              await page.getByRole("button", { name: /TEST-ASSET/ }).first().click();
              await page.getByRole("heading", { name: "Selected Tag Details", exact: true }).waitFor();
              await page.getByRole("button", { name: "Close tag details", exact: true }).click();
            }
            if (tabName === "Alarms & Events") {
              assert.equal(await page.getByText("test-event", { exact: true }).count(), 1);
              await page.getByRole("textbox", { name: "Search alarms or events", exact: true }).fill("test-event");
              await page.getByRole("button", { name: "Apply", exact: true }).click();
              assert.equal(await page.getByText("Test alarm", { exact: true }).count(), 0);
              await page.getByRole("textbox", { name: "Search alarms or events", exact: true }).fill("");
              await page.getByRole("button", { name: "Apply", exact: true }).click();
              await page.getByRole("button", { name: "test-event", exact: true }).click();
              await page.getByRole("heading", { name: "Event Details", exact: true }).waitFor();
              await page.getByRole("button", { name: "Close event details", exact: true }).click();
              await page.getByRole("button", { name: "test-tag", exact: true }).first().click();
              await page.getByRole("button", { name: "Root Cause & Notes", exact: true }).click();
              await page.getByPlaceholder("Add root cause analysis or operator note").fill(`Browser note ${viewport.width}`);
              await page.getByPlaceholder("Follow-up action (optional)").fill("Browser follow-up");
              const noteSaved = page.waitForResponse(response => response.url().includes("/notes") && response.request().method() === "POST");
              await page.getByRole("button", { name: "Add Note", exact: true }).click();
              assert.equal((await noteSaved).status(), 201);
              await page.getByText(`Browser note ${viewport.width}`, { exact: true }).waitFor();
              await page.getByRole("button", { name: "Actions", exact: true }).click();
              const acknowledged = page.waitForResponse(response => response.url().includes("/acknowledge") && response.request().method() === "PATCH");
              await page.getByRole("button", { name: "Acknowledge", exact: true }).last().click();
              assert.equal((await acknowledged).status(), 200);
              await page.getByRole("button", { name: "Acknowledged", exact: true }).waitFor();
              assert.equal((await db.query('SELECT "sourceStatus" FROM "ScadaAlarm" WHERE "tagId"=$1', ["test-tag"])).rows[0].sourceStatus, "Active");
            }
            if (tabName === "Configuration") {
              await page.getByText("Test source", { exact: true }).first().waitFor();
              await page.getByRole("combobox", { name: "Edit configured tag", exact: true }).selectOption("test-tag");
              await page.getByLabel("Tag Group", { exact: true }).fill(`Operations ${viewport.width}`);
              await page.getByRole("button", { name: "Compare Config", exact: true }).click();
              await page.getByText("Comparison refreshed", { exact: true }).waitFor();
              await page.getByLabel("Import logical configuration", { exact: true }).setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ connectorId: "foreign" })) });
              await page.getByRole("alert").filter({ hasText: "Import contains unsupported fields" }).waitFor();
              await page.getByLabel("Import logical configuration", { exact: true }).setInputFiles({ name: "settings.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ groupName: `Imported ${viewport.width}` })) });
              await page.getByLabel("Tag Group", { exact: true }).evaluate(element => { if (!element.value.startsWith("Imported")) throw new Error("Import did not populate draft"); });
              await page.getByLabel("Tag Group", { exact: true }).fill(`Operations ${viewport.width}`);
              const saved = page.waitForResponse(response => response.url().includes("/scada/tags/test-tag") && response.request().method() === "PATCH");
              await page.getByRole("button", { name: "Save Changes", exact: true }).click();
              assert.equal((await saved).status(), 200);
              const persistedConfig = await (await call("/api/scada/configuration?pipelineId=test-pipeline")).json();
              assert.equal(persistedConfig.tags.find(tag => tag.id === "test-tag").groupName, `Operations ${viewport.width}`);
              await page.getByRole("button", { name: "Refresh configuration", exact: true }).click();
              const alerts = (await page.getByRole("alert").allTextContents()).filter(text => text.trim());
              assert.deepEqual(alerts, []);
            }
            if (tabName === "Real-Time Data") {
              await page.getByRole("combobox", { name: "Source filter", exact: true }).selectOption("test-connector");
              assert.match(await page.locator("table").innerText(), /Received \(UTC\)/);
              assert.match(await page.locator("table").innerText(), /Source Timezone/);
              await page.getByRole("combobox", { name: "Source filter", exact: true }).selectOption("All");
              await page.getByRole("combobox", { name: "Rows per page", exact: true }).selectOption("25");
              assert.equal(await page.getByRole("combobox", { name: "Rows per page", exact: true }).inputValue(), "25");
              await page.getByRole("combobox", { name: "Tag type filter", exact: true }).selectOption("Flow");
              assert.equal(await page.getByRole("button", { name: "test-tag", exact: true }).count(), 0);
              assert.equal(await page.getByRole("button", { name: "test-flow", exact: true }).count(), 1);
              assert.match(await page.locator("table tbody").innerText(), /120\.12/);
              assert.match(await page.locator("table tbody").innerText(), /m3\/h/);
              await page.getByRole("combobox", { name: "Tag type filter", exact: true }).selectOption("All Tag Types");
              await page.getByRole("combobox", { name: "Status filter", exact: true }).selectOption("Bad");
              assert.equal(await page.getByRole("button", { name: "test-flow", exact: true }).count(), 0);
              assert.equal(await page.getByRole("button", { name: "test-tag", exact: true }).count(), 1);
              await page.getByRole("combobox", { name: "Status filter", exact: true }).selectOption("All Statuses");
              await page.getByRole("textbox", { name: "Search tags, description or unit", exact: true }).fill("no-such-tag");
              await page.getByText("No configured tag records available", { exact: true }).waitFor();
              await page.getByRole("textbox", { name: "Search tags, description or unit", exact: true }).fill("");
              await page.getByRole("checkbox", { name: "Select all visible tags", exact: true }).check();
              assert.equal(await page.getByRole("checkbox", { name: "Select test-flow", exact: true }).isChecked(), true);
            }
            if (tabName === "Trends & Historical") {
              for (const aggregation of ["Raw","Min","Max","Sum","Average"]) {
                const fetched = page.waitForResponse(response => response.url().includes("/history?") && response.url().includes(`aggregation=${aggregation}`));
                await page.getByRole("combobox", { name: "Historical aggregation", exact: true }).selectOption(aggregation);
                assert.equal((await fetched).status(), 200);
              }
              await page.getByRole("button", { name: "Manage", exact: true }).click();
              assert.equal(await page.locator("#scada-selected-tags input").first().evaluate(element => element === document.activeElement), true);
              await page.getByRole("combobox", { name: "Historical resolution", exact: true }).selectOption("60");
              await page.getByRole("button", { name: "Custom", exact: true }).click();
              assert.equal(await page.getByLabel("Historical start", { exact: true }).evaluate(element => element === document.activeElement), true);
              await page.getByRole("button", { name: "1D", exact: true }).click();
              await page.getByRole("button", { name: "7D", exact: true }).click();
              await page.getByRole("button", { name: "Download Data", exact: true }).waitFor();
              const csvReady = page.waitForEvent("download");
              await page.getByRole("button", { name: "Download Data", exact: true }).click();
              const csvDownload = await csvReady;
              await csvDownload.saveAs(resolve(artifactPath, `historical-${viewport.width}.csv`));
              assert.match(readFileSync(await csvDownload.path(), "utf8"), /test-flow/);
            }
            if (tabName === "Data Quality") {
              await page.getByRole("combobox", { name: "Quality source type filter", exact: true }).selectOption("REST");
              assert.equal(await page.getByRole("combobox", { name: "Quality source type filter", exact: true }).inputValue(), "REST");
              await page.locator('[data-testid="quality-heatmap-row"]').first().locator('span').first().waitFor({ state: "attached" });
              assert.equal(await page.locator('[data-testid="quality-heatmap-row"]').first().locator('span').count(), 24);
              for (const hours of ["168", "720", "24"]) {
                const loaded = page.waitForResponse(response => response.url().includes(`/scada/data-quality?pipelineId=test-pipeline&hours=${hours}`));
                await page.getByRole("combobox", { name: "Quality time range", exact: true }).selectOption(hours);
                assert.equal((await loaded).status(), 200);
                await page.getByRole("img", { name: "Missing sampling slots and data availability", exact: true }).waitFor();
              }
              await page.getByRole("combobox", { name: "Missing data chart mode", exact: true }).selectOption("Count");
              await page.getByRole("combobox", { name: "Quality issue filter", exact: true }).selectOption("Bad");
              await page.getByRole("heading", { name: "Recommended Actions", exact: true }).waitFor();
            }
          }
          await page.getByRole("tab", { name: "Real-Time Data", exact: true }).click();
          await page.getByRole("button", { name: "test-tag", exact: true }).first().click();
          await page.getByRole("heading", { name: "Selected Tag", exact: true }).waitFor();
          await page.getByRole("button", { name: "Favorite tag", exact: true }).click();
          assert.equal(await page.getByRole("button", { name: "Favorite tag", exact: true }).getAttribute("aria-pressed"), "true");
          await page.getByRole("button", { name: "Close selected tag", exact: true }).click();
          await page.getByRole("button", { name: "test-tag", exact: true }).first().click();
          assert.equal(await page.getByRole("button", { name: "Favorite tag", exact: true }).getAttribute("aria-pressed"), "true", "Favorite must survive drawer remount");
          for (const detail of ["Properties", "Alarms (1)", "History", "Related", "Live Data"]) await page.getByRole("tab", { name: detail, exact: true }).click();
          await page.getByRole("tab", { name: "Alarms (1)", exact: true }).click();
          await page.getByRole("button", { name: "test-tag", exact: true }).last().click();
          await page.getByRole("heading", { name: "Alarm Details & Actions", exact: true }).waitFor();
          await page.getByRole("button", { name: "Close alarm details", exact: true }).click();
          await page.getByRole("tab", { name: "Stations & Facilities", exact: true }).click();
          await page.getByRole("button", { name: /TEST-ASSET/ }).first().click();
          await page.getByRole("button", { name: "View Trend", exact: true }).click();
          assert.equal(await page.getByRole("checkbox").first().isChecked(), true);
          await page.getByRole("link", { name: "View Asset", exact: true }).click();
          await page.getByRole("heading", { name: "Test station", exact: true }).waitFor();
          assert.match(await page.locator("body").innerText(), /Physical Status/);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.screenshot({ path: resolve(artifactPath, `asset-master-${viewport.width}.png`), fullPage: true });
          await page.getByRole("link", { name: "SCADA", exact: true }).first().click();
          await page.getByRole("button", { name: /Stations Online/ }).waitFor();
          await page.getByRole("tab", { name: "Overview", exact: true }).click();
          await page.getByRole("img", { name: /test-tag Pressure trend/ }).first().waitFor();
          const exported = page.waitForEvent("download");
          await page.getByRole("button", { name: "Export", exact: true }).click();
          const download = await exported;
          await download.saveAs(resolve(artifactPath, `operations-${viewport.width}.json`));
          assert.match(readFileSync(await download.path(), "utf8"), /test-pipeline/);
          assert.equal(await page.locator('img[alt="KLINTHRU"]').count(), 0, "SCADA header logo must be absent");
          await page.getByRole("heading", { name: "SCADA", exact: true }).waitFor();
          assert.equal(await page.locator('img[alt="Klinthru"]').first().evaluate(img => img.complete && img.naturalWidth > 0), true, "Sidebar logo must remain");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Viewport must not overflow horizontally");
          await page.screenshot({ path: resolve(artifactPath, `img01-${viewport.width}.png`), fullPage: true });
          assert.deepEqual(browserErrors, []);
          await context.close();
        }
        users["test-admin"].role = "Viewer";
        const viewerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
        try {
          await db.query('UPDATE "ScadaAlarm" SET "klinthruStatus"=$1 WHERE "tagId"=$2', ["Unacknowledged", "test-tag"]);
          await viewerContext.addInitScript(() => localStorage.setItem("klinthru-auth-token", "isolated-viewer-session"));
          await viewerContext.route("**/api/**", async route => {
            const url = new URL(route.request().url());
            if (url.pathname === "/api/auth/me") return route.fulfill({ json: users["test-admin"] });
            if (url.pathname === "/api/pipelines") return route.fulfill({ json: [{ id: "test-pipeline", pipelineCode: "TEST", pipelineName: "Test pipeline" }] });
            const response = await call(url.pathname + url.search, "test-admin", route.request().method(), route.request().postDataJSON() ?? undefined);
            await route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
          });
          const viewerPage = await viewerContext.newPage();
          await viewerPage.goto(process.env.SCADA_BROWSER_BASE + "/scada");
          await viewerPage.getByRole("button", { name: /Stations Online/ }).waitFor();
          await viewerPage.getByRole("tab", { name: "Configuration", exact: true }).click();
          await viewerPage.getByRole("combobox", { name: "Edit configured tag", exact: true }).selectOption("test-tag");
          assert.equal(await viewerPage.getByLabel("Tag Group", { exact: true }).isDisabled(), true);
          assert.equal(await viewerPage.getByRole("button", { name: "Save Changes", exact: true }).count(), 0);
          assert.equal(await viewerPage.getByRole("button", { name: "Add Tag", exact: true }).count(), 0);
          await viewerPage.getByRole("tab", { name: "Alarms & Events", exact: true }).click();
          await viewerPage.getByRole("button", { name: "test-tag", exact: true }).first().click();
          await viewerPage.getByRole("button", { name: "Root Cause & Notes", exact: true }).click();
          assert.equal(await viewerPage.getByRole("button", { name: "Add Note", exact: true }).count(), 0);
          await viewerPage.getByRole("button", { name: "Actions", exact: true }).click();
          assert.equal(await viewerPage.getByRole("button", { name: "Acknowledge", exact: true }).last().isDisabled(), true);
          await viewerPage.screenshot({ path: resolve(artifactPath, "viewer-permissions-390.png"), fullPage: true });
          console.log("BROWSER Viewer: logical settings disabled; Save/Add Tag/Add Note hidden; acknowledgement disabled.");
        } finally { users["test-admin"].role = "Admin"; await viewerContext.close(); }
        console.log("SCADA browser checks passed: desktop/tablet/mobile, all eight tabs, tag drawer tabs, filters, selection, chart SVG, logo, Configure View, notes/follow-up, JSON/CSV downloads, no horizontal overflow or runtime errors.");
      } finally { await browser.close(); }
    }
    console.log("SCADA PostgreSQL/API checks passed: migration SQL, ownership/auth, registration, deduplication, alarms, live/stale states, invalid-value retention, replay, history, Reports export and no PLC route.");
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
