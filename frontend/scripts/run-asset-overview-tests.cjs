const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const filename = path.resolve(__dirname, "../src/app/asset-master/page.tsx");
const source = fs.readFileSync(filename, "utf8") + "\nexport { OverviewRouteMap, SegmentsPreview, AssetTypeSummary, summarizeAssetTypes, PipelineModal, formFromPipeline };";
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
const loaded = new Module(filename, module);
loaded.paths = module.paths;
loaded.require = (name) => {
  if (name === "@/components/ui") return { Panel: ({ children, className }) => React.createElement("section", { className }, children) };
  if (name === "@/components/saved-map-records") return { SavedMapRecords: () => null };
  if (name === "@/components/RouteEditor") return { RouteEditor: () => null };
  if (name === "@/lib/use-asset-map-layers") return { useAssetMapLayers: () => [{}] };
  if (name === "@/lib/dashboard-map-data") return { savedMapEndpoints: (geometry) => geometry?.coordinates?.length ? geometry.coordinates : undefined, savedMapCoordinate: (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude), savedMapRoute: (geometry) => Boolean(geometry?.coordinates?.length), savedSegmentMapRoute: (segment) => Boolean(segment?.routeGeometry?.coordinates?.length) };
  if (name === "@/lib/saved-pipeline-overlay") return { drawSavedPipelineOverlay: () => [], pipelineOverlayLabel: () => "Saved route" };
  if (name === "@/lib/pl001-illustrative-route") return { PL001_ILLUSTRATIVE_ROUTE_GIS_STATUS: "GIS Route Data Required", isPl001IllustrativeRoute: (pipelineCode) => pipelineCode === "PL-001" };
  if (name === "@/lib/chainage") return { tryKp: (value) => { const text = String(value ?? "").trim(); if (!text) return null; const parsed = Number(text.includes("+") ? text.replace("+", ".") : text); return Number.isFinite(parsed) ? parsed : null; } };
  if (name.startsWith("@/") || name === "next/link") return {};
  return require(name);
};
loaded._compile(compiled, filename);
const { OverviewRouteMap, SegmentsPreview, AssetTypeSummary, summarizeAssetTypes, PipelineModal, formFromPipeline } = loaded.exports;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const datedPipeline = { pipelineCode: "DATE-CHECK", pipelineName: "Date regression only", pipeMaterial: "Carbon Steel", pipeGrade: "X65", pipeLengthKm: 248, status: "Active", installationYear: 2015, installationDate: "2015-12-06T00:00:00.000Z" };
const formDates = formFromPipeline(datedPipeline);
assert.equal(formDates.installationDate, "2015-12-06");
assert.equal(formDates.installationYear, "2015");
assert.equal(formFromPipeline({ ...datedPipeline, installationDate: undefined }).installationDate, "", "Installation year must not invent a date");
const editForm = render(PipelineModal, { mode: "edit", pipeline: datedPipeline, busy: false, onClose() {}, onSave() {} });
assert.ok(editForm.includes('data-field-label="Installation Date"'));
assert.ok(editForm.includes('data-field-label="Commissioning Date"'), "Commissioning date must remain a separate editable field");
assert.doesNotMatch(source, /if \(routePointCount > 0 && routePointCount < 3\) throw/, "Unchanged legacy geometry must not block metadata saves; the route save helper validates changed geometry");
const segments = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, segmentId: `SEG-${i}`, startKp: String(i), endKp: String(i + 1), status: "Active" }));
const assets = [
  { id: "a1", assetId: "V-1", assetType: "VALVE", physicalStatus: "Active", segmentId: "s0" },
  { id: "a2", assetId: "P-1", assetType: "PUMP", physicalStatus: "Inactive", segmentId: "s6" },
  { id: "a3", assetId: "V-2", assetType: "VALVE", physicalStatus: "Active", segmentId: "s6" }
];
const list = render(SegmentsPreview, { segments, assets, error: false, onViewAll() {} });
for (const segment of segments) assert.ok(list.includes(segment.segmentId), `Missing ${segment.segmentId}`);
assert.ok(list.includes("Pipeline Segments (7)"));
assert.ok(list.includes(">0</td>"), "Segments without assets should show zero");
const summary = summarizeAssetTypes(assets);
assert.deepEqual(summary, [{ type: "Pump", total: 1, active: 0, inactive: 1 }, { type: "Valve", total: 2, active: 2, inactive: 0 }]);
const types = render(AssetTypeSummary, { summary, error: false });
assert.ok(types.includes("Pump") && types.includes("Valve"));
assert.ok(render(SegmentsPreview, { segments: [], assets: [], error: false }).includes("No segment records available"));
assert.ok(render(AssetTypeSummary, { summary: [], error: true }).includes("Asset summary unavailable"));

const route = { type: "LineString", coordinates: [[72, 18], [73, 19]] };
const pipeline = { pipelineName: "North <Main>", pipelineCode: "PL-01" };
const map = (extra) => render(OverviewRouteMap, { pipeline, segments: [], assets: [], error: false, ...extra });
assert.ok(map({}).includes("North &lt;Main&gt; / PL-01"), "Pipeline name/code must always be visible and escaped");
assert.ok(map({}).includes("GIS data required"));
assert.ok(!map({ segments: [{ ...segments[0], routeGeometry: route }] }).includes("GIS data required"), "Segment geometry should make the map available");
assert.ok(!map({ pipeline: { ...pipeline, routeGeometry: route }, error: true }).includes("GIS data required"), "An asset API error must not hide saved route geometry");
console.log("Asset overview rendering checks passed.");
