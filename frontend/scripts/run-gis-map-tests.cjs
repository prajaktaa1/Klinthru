const assert = require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {savedMapRoute,savedMapCoordinate,scopeMasterMap}=require('../src/lib/dashboard-map-data.ts');
const {alignmentLength}=require('../../backend/src/coreEngine/chainage/ChainageAgent.ts');
const {pipelineAlignment}=require('../src/lib/map-chainage.ts');
const {parseLineString,parseCsv}=require('../src/lib/gis-route.ts');
// Synthetic regression fixtures only, never persisted as real pipeline GIS.
const route={type:'LineString',coordinates:[[54,24],[54.01,24.02],[54.03,24.025]]},km=alignmentLength(route)/1000;
assert.deepEqual(savedMapRoute(route,km),[[24,54],[24.02,54.01],[24.025,54.03]]);
for(const bad of [null,{type:'LineString',coordinates:[[54,24],[55,25]]},{type:'LineString',coordinates:[[54,24],[200,25],[55,25]]},{type:'LineString',coordinates:[[54,24],[54,24],[54,24]]}]) assert.equal(savedMapRoute(bad),null);
assert.equal(savedMapRoute(route,km*2),null);assert.equal(savedMapRoute(route,0),null);
assert.equal(savedMapCoordinate(91,54),false);assert.equal(savedMapCoordinate(24,181),false);assert.equal(savedMapCoordinate('24',54),false);
assert.deepEqual(parseLineString(JSON.stringify(route)),route.coordinates);assert.throws(()=>parseLineString(JSON.stringify({type:'LineString',coordinates:[[54,24],[55,25]]})));
assert.throws(()=>parseCsv('longitude,latitude\n54,24\n,25\n55,26'));
assert.equal(pipelineAlignment({routeGeometry:route,pipeLengthKm:km}).ready,false);
assert.equal(pipelineAlignment({routeGeometry:route,pipeLengthKm:km,chainageOriginMeters:1000}).ready,true);
const bundles=[{pipeline:{id:'p'},segments:[{id:'s',segmentId:'SEG',pipelineId:'p'}],assets:[{id:'a',pipelineId:'p',segmentId:'SEG'},{id:'b',pipelineId:'q',segmentId:'s'}],errors:[]}];
assert.deepEqual(scopeMasterMap(bundles,'p','s')[0].assets.map(a=>a.id),['a']);assert.equal(scopeMasterMap(bundles,'q','').length,0);
console.log('PASS GIS coordinate, route, distance, import, datum and selection regression checks.');
