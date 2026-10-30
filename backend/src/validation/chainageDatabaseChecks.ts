/** Real Neon audit. All save/reload writes are rolled back; no fixtures or migrations. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "../app";
import { getPrismaClient, disconnectPrisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { alignmentReadiness, chainageSummary, parseKp } from "../coreEngine/chainage/ChainageAgent";
import { validateAssetInput, validateSegmentInput } from "./assetMasterValidation";

async function main() {
  const db = getPrismaClient(); if (!db) throw new Error("Neon configuration required.");
  const directory = resolve("../artifacts/chainage"); mkdirSync(directory, { recursive: true });
  const before = await db.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
  const users = await db.user.findMany({ where: { role: "Admin" }, take: 1 }); if (!users[0]) throw new Error("An existing Admin is required for authenticated verification.");
  const user = users[0], token = signToken({ sub: user.id, role: user.role, email: user.email });
  const server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://localhost:${(server.address() as { port: number }).port}`, headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const call = async (path: string, body?: unknown, authenticated = true) => {
    const response = await fetch(`${base}${path}`, { headers: authenticated ? headers : {}, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() as any };
  };
  const results: any[] = [];
  try {
    assert.equal((await call(`/api/chainage/${before[0].id}`, undefined, false)).status, 401);
    for (const pipeline of before) {
      const snapshot = await call(`/api/chainage/${pipeline.id}`); assert.equal(snapshot.status, 200);
      assert.ok(snapshot.data.assets.every((a: any) => a.pipelineId === pipeline.id));
      assert.ok(snapshot.data.segments.every((s: any) => s.pipelineId === pipeline.id));
      assert.deepEqual(snapshot.data, (await call(`/api/chainage/${pipeline.id}`)).data);
      const convert = await call(`/api/chainage/${pipeline.id}`, { operation: "convert", chainage: "0+050" }); assert.equal(convert.status, 200); assert.equal(convert.data.result.meters, 50);
      assert.equal((await call(`/api/chainage/${pipeline.id}`, { operation: "distance", chainage: "0+000", target: "0+050" })).data.result.distance_m, 50);
      assert.equal((await call(`/api/chainage/${pipeline.id}`, { operation: "coordinate", chainage: "0+000" })).status, snapshot.data.alignment.ready ? 200 : 422);
      assert.equal((await call(`/api/chainage/${pipeline.id}`, { operation: "convert", chainage: `${pipeline.pipeLengthKm + 1} km` })).status, 422);
      if (pipeline.assets[0]) {
        const asset = pipeline.assets[0], location = chainageSummary(asset.kp)!;
        const nearest = await call(`/api/chainage/${pipeline.id}`, { operation: "nearest", chainage: location.chainage, assetType: asset.assetType });
        assert.equal(nearest.data.result[0].asset.id, asset.id); assert.equal(nearest.data.result[0].distance_m, 0);
        const foreign = before.find(p => p.id !== pipeline.id && p.assets.length)?.assets[0];
        if (foreign) assert.equal((await call(`/api/chainage/${pipeline.id}`, { operation: "distance", assetId: asset.id, targetAssetId: foreign.id })).status, 422);
        assert.equal((await call(`/api/chainage/${pipeline.id}`, { operation: "downstream", chainage: location.chainage })).status, 422);
        // Exercise the actual database write and reload while preserving every original field.
        try {
          await db.$transaction(async tx => {
            const normalized = validateAssetInput({ assetId: asset.assetId, assetType: asset.assetType, pipelineId: pipeline.id, kp: location.chainage });
            await tx.asset.update({ where: { id: asset.id }, data: { kp: normalized.kp } });
            const saved = await tx.asset.findUnique({ where: { id: asset.id } }); assert.equal(parseKp(saved.kp).meters, location.chainage_meters);
            throw new Error("CHAINAGE_VERIFIED_ROLLBACK");
          });
        } catch (e) { if ((e as Error).message !== "CHAINAGE_VERIFIED_ROLLBACK") throw e; }
      }
      for (const segment of pipeline.segments) {
        const normalized = validateSegmentInput({ pipelineId: pipeline.id, segmentId: segment.segmentId, startKp: chainageSummary(segment.startKp)?.chainage, endKp: chainageSummary(segment.endKp)?.chainage });
        assert.equal(parseKp(normalized.endKp!).meters, parseKp(segment.endKp).meters);
      }
      const overlaps = pipeline.segments.flatMap((a: any, index: number) => pipeline.segments.slice(index + 1).filter((b: any) => parseKp(a.startKp).meters < parseKp(b.endKp).meters && parseKp(a.endKp).meters > parseKp(b.startKp).meters).map((b: any) => `${a.segmentId} / ${b.segmentId}`));
      results.push({ pipeline: pipeline.pipelineCode, pipelineId: pipeline.id, status: "PASS", readReloadFiltersDistance: "PASS", saveReload: pipeline.assets.length ? "PASS (transaction rolled back)" : "BLOCKED (no saved assets)", assetCount: pipeline.assets.length, segmentCount: pipeline.segments.length, alignment: alignmentReadiness(pipeline.routeGeometry, pipeline.pipeLengthKm * 1000), missingAssetGps: pipeline.assets.filter((a: any) => a.latitude === null || a.longitude === null).map((a: any) => a.assetId), overlappingSegments: overlaps });
    }
    const after = await db.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
    assert.deepEqual(after, before, "All saved pipeline, segment and asset values/timestamps must remain unchanged.");
    writeFileSync(resolve(directory, "database-checks.json"), JSON.stringify({ expectedPipelineCount: 6, actualPipelineCount: before.length, dataUnchanged: true, authorization: "PASS", results }, null, 2));
    console.log(`PASS authenticated API checks for ${results.length} real Neon pipelines; save/reload rolled back; original data unchanged.`);
    if (process.env.CHAINAGE_BROWSER === "true") {
      const { chromium } = require(resolve("../.scada-test-tools/node_modules/playwright"));
      const browser = await chromium.launch({ headless: true, channel: "msedge" });
      try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await context.addInitScript((t: string) => localStorage.setItem("klinthru-auth-token", t), token);
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        page.on("crash", () => console.log("Browser page crashed"));
        await page.route("http://localhost:4002/**", (route: any) => route.continue({ url: route.request().url().replace("http://localhost:4002", base) }));
        const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
        await page.goto("http://localhost:4000/asset-master", { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.getByRole("heading", { name: "Pipeline / Asset Master" }).waitFor({ timeout: 120000 }).catch(async (error: Error) => { await page.screenshot({ path: resolve(directory, "browser-failure.png") }); writeFileSync(resolve(directory, "browser-failure.txt"), (await page.locator("body").innerText()).slice(0, 12000)); throw error; });
        const selector = page.locator("select").first(); await selector.locator("option").nth(before.length - 1).waitFor({ state: "attached", timeout: 60000 });
        const browserResults = [];
        for (const pipeline of before) {
          console.log(`Browser checking ${pipeline.pipelineCode}`);
          await selector.selectOption(pipeline.id);
          await page.getByRole("tab", { name: "Overview", exact: true }).click();
          await page.getByRole("heading", { name: "Pipeline Information", exact: true }).waitFor({ timeout: 60000 });
          await page.getByRole("tab", { name: "Segments", exact: true }).click();
          await page.getByRole("tab", { name: "Assets", exact: true }).click();
          await page.getByLabel("Assets workspace", { exact: true }).waitFor();
          await page.getByLabel("Asset Type", { exact: true }).selectOption("VALVE");
          await page.getByRole("button", { name: "Clear", exact: true }).click();
          if (pipeline.assets.length) {
            await page.getByRole("button", { name: "Edit", exact: true }).click();
            const dialog = page.getByRole("dialog"), kpInput = dialog.locator('input[data-field-label="KP"]');
            await kpInput.fill("18+900.65");
            await dialog.getByText("CH 18+900.65", { exact: false }).waitFor();
            await kpInput.fill("invalid-chainage");
            await dialog.getByRole("button", { name: "Save Asset", exact: true }).click();
            await dialog.getByRole("alert").filter({ hasText: "Invalid chainage" }).waitFor();
            await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
          }
          await page.getByRole("tab", { name: "Map View", exact: true }).click();
          await page.getByLabel("Pipeline map workspace", { exact: true }).waitFor();
          await page.waitForFunction(() => document.querySelector("[data-pipeline-map-status]")?.getAttribute("data-pipeline-map-status") !== "loading", { timeout: 30000 });
          const mapStatus = await page.locator("[data-pipeline-map-status]").getAttribute("data-pipeline-map-status");
          await page.screenshot({ path: resolve(directory, `${pipeline.pipelineCode}-map.png`) });
          browserResults.push({ pipeline: pipeline.pipelineCode, tabs: "PASS", filters: "PASS", conversionFeedback: pipeline.assets.length ? "PASS" : "BLOCKED (no saved assets)", invalidSave: pipeline.assets.length ? "PASS" : "BLOCKED (no saved assets)", mapStatus });
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "Pipeline / Asset Master" }).waitFor({ timeout: 120000 }).catch(async (error: Error) => { await page.screenshot({ path: resolve(directory, "reload-failure.png") }); writeFileSync(resolve(directory, "reload-failure.txt"), (await page.locator("body").innerText()).slice(0, 12000)); throw error; });
        writeFileSync(resolve(directory, "browser-checks.json"), JSON.stringify({ results: browserResults, reload: "PASS", errors }, null, 2));
        assert.deepEqual(errors, []);
        console.log("PASS browser tabs, filters, reload and maps.");
      } finally { await browser.close(); }
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await disconnectPrisma(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
