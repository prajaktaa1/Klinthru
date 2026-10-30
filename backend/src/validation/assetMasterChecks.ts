import assert from "node:assert/strict";
import { createServer } from "node:http";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "asset-admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "asset-engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "asset-viewer-test-password";

const assetTypes = ["STATION", "VALVE", "TEST_POST", "RECTIFIER", "COMPRESSOR", "SENSOR", "PUMP", "METER", "PIG_LAUNCHER", "PIG_RECEIVER", "PIPELINE_FITTING", "FLANGE", "INSULATING_JOINT", "PIPELINE_CROSSING", "OTHER"] as const;

async function run() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");
  assert.equal(await initializeStorage(), "memory");
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    async function json(path: string, method: string, body?: unknown, token?: string) {
      return fetch(`${baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    }

    async function login(email: string, password: string) {
      const response = await json("/api/auth/login", "POST", { email, password });
      assert.equal(response.status, 200);
      return (await response.json() as { token: string }).token;
    }

    const engineer = await login("engineer@klinthru.local", "asset-engineer-test-password");
    const viewer = await login("viewer@klinthru.local", "asset-viewer-test-password");
    const pipelineResponse = await json("/api/pipelines", "POST", { pipelineCode: "ASSET-REGRESSION", pipelineName: "Asset Regression Pipeline", pipeMaterial: "Carbon Steel", pipeGrade: "API 5L X52", status: "Active" }, engineer);
    assert.equal(pipelineResponse.status, 201);
    const pipeline = await pipelineResponse.json() as { id: string };
    const segmentResponse = await json("/api/asset-master/segments", "POST", { pipelineId: pipeline.id, segmentId: "SEG-REGRESSION", startKp: "0", endKp: "50", coatingType: "FBE", cpType: "SACP", terrain: "Desert", status: "Active" }, engineer);
    assert.equal(segmentResponse.status, 201);
    const segment = await segmentResponse.json() as { id: string; coatingType: string; cpType: string; terrain: string; status: string };
    assert.equal(segment.coatingType, "FBE");
    assert.equal(segment.cpType, "SACP");
    assert.equal(segment.terrain, "Desert");
    assert.equal(segment.status, "Active");
    const segmentUpdate = await json(`/api/asset-master/segments/${segment.id}`, "PUT", { pipelineId: pipeline.id, segmentId: "SEG-REGRESSION", startKp: "0", endKp: "50", coatingType: "3LPE", cpType: "ICCP", terrain: "Coastal", status: "Maintenance" }, engineer);
    assert.equal(segmentUpdate.status, 200);
    const segmentRead = await json(`/api/asset-master/segments/${segment.id}`, "GET", undefined, engineer);
    const savedSegment = await segmentRead.json() as typeof segment;
    assert.equal(savedSegment.coatingType, "3LPE");
    assert.equal(savedSegment.cpType, "ICCP");
    assert.equal(savedSegment.terrain, "Coastal");
    assert.equal(savedSegment.status, "Maintenance");
    const invalidStatus = await json("/api/asset-master/segments", "POST", { pipelineId: pipeline.id, segmentId: "INVALID-STATUS", status: "Invented" }, engineer);
    assert.equal(invalidStatus.status, 400);

    const overlap = await json("/api/asset-master/segments", "POST", { pipelineId: pipeline.id, segmentId: "OVERLAPPING", startKp: "1+000", endKp: "2+000" }, engineer);
    assert.equal(overlap.status, 400);
    assert.match((await overlap.json() as { fields: { endKp: string } }).fields.endKp, /overlaps.*SEG-REGRESSION/);
    const adjacent = await json("/api/asset-master/segments", "POST", { pipelineId: pipeline.id, segmentId: "ADJACENT", startKp: "50", endKp: "60" }, engineer);
    assert.equal(adjacent.status, 201);
    const adjacentRecord = await adjacent.json() as { id: string };
    const invalidEdit = await json(`/api/asset-master/segments/${adjacentRecord.id}`, "PUT", { pipelineId: pipeline.id, segmentId: "ADJACENT", startKp: "49", endKp: "60" }, engineer);
    assert.equal(invalidEdit.status, 400);
    const unchanged = await json(`/api/asset-master/segments/${adjacentRecord.id}`, "GET", undefined, engineer);
    assert.equal((await unchanged.json() as { startKp: string }).startKp, "50");

    const viewerWrite = await json("/api/asset-master/assets", "POST", { pipelineId: pipeline.id, assetId: "VIEWER-BLOCKED", assetType: "OTHER", physicalStatus: "Active" }, viewer);
    assert.equal(viewerWrite.status, 403);

    const created: Array<{ id: string; assetId: string }> = [];
    for (const [index, assetType] of assetTypes.entries()) {
      const response = await json("/api/asset-master/assets", "POST", {
        pipelineId: pipeline.id,
        assetId: `ASSET-${index + 1}`,
        assetType,
        segmentId: segment.id,
        parentAssetId: created[0]?.id,
        latitude: 19 + index / 100,
        longitude: 73 + index / 100,
        kp: String(index),
        physicalStatus: index === 1 ? "Inactive" : "Active"
      }, engineer);
      assert.equal(response.status, 201, `${assetType} should save`);
      created.push(await response.json() as { id: string; assetId: string });
    }

    const duplicate = await json("/api/asset-master/assets", "POST", { pipelineId: pipeline.id, assetId: "asset-1", assetType: "OTHER", physicalStatus: "Active" }, engineer);
    assert.equal(duplicate.status, 409);

    const listed = await json(`/api/asset-master/assets?pipelineId=${pipeline.id}`, "GET", undefined, engineer);
    assert.equal(listed.status, 200);
    const records = await listed.json() as Array<{ assetType: string; physicalStatus: string; parentAssetId?: string; segmentId?: string; latitude?: number; longitude?: number }>;
    assert.equal(records.length, assetTypes.length);
    assert.deepEqual(new Set(records.map((record) => record.assetType)), new Set(assetTypes));
    assert.equal(records.filter((record) => record.parentAssetId === created[0].id).length, assetTypes.length - 1);
    assert.equal(records.find((record) => record.physicalStatus === "Inactive")?.latitude, 19.01);

    const edited = await json(`/api/asset-master/assets/${created[0].id}`, "PUT", { pipelineId: pipeline.id, assetId: "ASSET-1-EDITED", assetType: "STATION", segmentId: segment.id, latitude: 20, longitude: 74, physicalStatus: "Inactive" }, engineer);
    assert.equal(edited.status, 200);
    const reloaded = await json(`/api/asset-master/assets?pipelineId=${pipeline.id}`, "GET", undefined, engineer);
    const reloadedRecords = await reloaded.json() as Array<{ assetId: string; latitude?: number; longitude?: number; physicalStatus: string }>;
    const saved = reloadedRecords.find((record) => record.assetId === "ASSET-1-EDITED");
    assert.deepEqual(saved && { latitude: saved.latitude, longitude: saved.longitude, physicalStatus: saved.physicalStatus }, { latitude: 20, longitude: 74, physicalStatus: "Inactive" });
    console.log("Asset Master checks passed.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

void run().catch((error) => { console.error(error); process.exitCode = 1; });
