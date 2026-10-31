const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../src/lib/pipeline-save.ts");
const originalTsLoader = Module._extensions[".ts"];
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "./gis-route") {
    return path.resolve(__dirname, "../src/lib/gis-route.ts");
  }
  return originalResolveFilename.call(this, request, parent, ...rest);
};
Module._extensions[".ts"] = (mod, file) => {
  const input = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(input, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  mod._compile(output, file);
};
const source = fs.readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const loaded = new Module(filename, module);
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { routeGeometryForSave } = loaded.exports;

const invalidExisting = { type: "LineString", coordinates: [[52.7382345, 24.1457581], [53.478834, 23.8115092]] };
const originalText = JSON.stringify(invalidExisting);
const preserved = routeGeometryForSave(originalText, originalText, invalidExisting);
assert.strictEqual(preserved, invalidExisting, "Unchanged metadata save must preserve the exact existing route object");
assert.equal(JSON.stringify(preserved), originalText, "Unchanged metadata save must preserve route JSON content");

const edited = JSON.stringify({ type: "LineString", coordinates: [[52, 24], [52.5, 24.5], [53, 24]] });
assert.equal(routeGeometryForSave(edited, originalText, invalidExisting).coordinates.length, 3, "Changed routes must pass strict GIS parsing");
assert.throws(() => routeGeometryForSave("", originalText, invalidExisting), /cannot be cleared/, "Clearing an existing route must be rejected");
assert.throws(() => routeGeometryForSave(JSON.stringify({ type: "LineString", coordinates: [[52, 24], [53, 25]] }), originalText, invalidExisting), /at least three/, "Changed two-point routes must be rejected");
assert.equal(routeGeometryForSave("", "", undefined), null, "New pipelines may omit route geometry");

console.log("Pipeline save safety tests passed.");
if (originalTsLoader) Module._extensions[".ts"] = originalTsLoader;
Module._resolveFilename = originalResolveFilename;
