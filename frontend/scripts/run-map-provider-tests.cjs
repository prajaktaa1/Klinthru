// SDK/DOM contracts only. No network, credentials or database writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function environment(key, fetch) {
  const nodes = [], timers = new Map(); let timerId = 0;
  class Element {
    constructor() { this.style = {}; this.dataset = {}; this.children = []; }
    appendChild(node) { this.children.push(node); nodes.push(node); return node; }
    prepend(node) { this.children.unshift(node); nodes.push(node); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    remove() { this.removed = true; }
  }
  const window = Object.assign(new EventTarget(), { setTimeout: fn => { timers.set(++timerId, fn); return timerId; } });
  const document = { createElement: () => new Element(), head: new Element(), getElementById: id => nodes.find(n => n.id === id && !n.removed) };
  const exports = {};
  const context = vm.createContext({ exports, window, document, fetch, AbortSignal, process: { env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: key } }, Event, Error, ResizeObserver: class { observe() {} disconnect() {} }, clearTimeout: id => timers.delete(id) });
  const source = fs.readFileSync(require.resolve('../src/lib/map-provider.ts'), 'utf8');
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { ...exports, window, document, nodes, timers, Element };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function mapEnvironment(env) {
  const container = new env.Element(), tiles = [];
  const map = { getContainer: () => container, getCenter: () => ({ lat: 24.4, lng: 54.4 }), getZoom: () => 7, on() {}, off() {} };
  const L = { tileLayer: (url, options) => { const handlers = {}; const tile = { url, options, handlers, on(name,fn) { handlers[name] = fn; return this; }, off() { Object.keys(handlers).forEach(name => delete handlers[name]); }, addTo() { tiles.push(this); return this; }, remove() { this.removed = true; } }; return tile; } };
  return { map, L, container, tiles };
}
async function main() {
  const missing = environment(''), fallback = mapEnvironment(missing);
  const attached = missing.attachBasemap(fallback.map, fallback.L, 'hybrid'); await flush();
  assert.equal(fallback.container.dataset.mapProvider, 'esri');
  assert.equal(fallback.tiles.length, 2); assert.equal(fallback.tiles[0].options.maxNativeZoom, 19); assert.equal(fallback.tiles[0].options.maxZoom, 21);
  assert.match(fallback.tiles[0].url,/World_Imagery/); assert.match(fallback.tiles[1].url,/Reference\/World_Boundaries_and_Places/);
  assert.match(fallback.tiles[0].options.attribution,/Powered by.*Esri.*Vantor.*Earthstar/);
  assert.match(fallback.tiles[1].options.attribution,/OpenStreetMap contributors/);
  assert.ok(fallback.tiles[1].options.zIndex > fallback.tiles[0].options.zIndex);
  assert.equal(missing.document.getElementById('klinthru-google-maps-api'),undefined,'Basemap must never load Google');
  fallback.tiles[0].handlers.tileerror(); assert.equal(fallback.container.dataset.basemapStatus,'degraded');
  assert.match(fallback.container.children.at(-1).textContent,/Esri.*unavailable/);
  fallback.tiles[0].handlers.tileload(); assert.equal(fallback.container.dataset.basemapStatus,'ready');
  attached.remove(); assert.ok(fallback.tiles.every(tile=>tile.removed));
  for(const type of ['satellite','street','terrain']) {
    const mode=environment('unit-test-only-key-not-used'), mapped=mapEnvironment(mode);
    mode.attachBasemap(mapped.map,mapped.L,type); assert.equal(mapped.tiles.length,1);
    assert.equal(mode.document.getElementById('klinthru-google-maps-api'),undefined);
  }

  assert.equal(typeof missing.loadGoogleMaps, 'undefined', 'The Leaflet map provider must not load Google Maps.');

  const events = new EventTarget(), exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/map-sync.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { window: events, exports });
  let refreshes = 0; const stop = exports.watchMapDataChanged(() => refreshes++);
  events.dispatchEvent(new Event(exports.MAP_DATA_CHANGED)); events.dispatchEvent(new Event('focus'));
  const storage = new Event('storage'); storage.key = 'klinthru-master-map-revision'; events.dispatchEvent(storage);
  const other = new Event('storage'); other.key = 'unrelated'; events.dispatchEvent(other);
  assert.equal(refreshes, 3); stop(); events.dispatchEvent(new Event('focus')); assert.equal(refreshes, 3);
  for (const result of [{lat:'24',lon:'54',address:{country_code:'om'}},{lat:'91',lon:'54',address:{country_code:'ae'}},{lat:'24',lon:'54'}, {lat:'',lon:'54',address:{country_code:'ae'}}]) {
    const search = environment('', async url => { assert.match(url,/addressdetails=1&countrycodes=ae/); return {ok:true,json:async()=>[result]}; });
    await assert.rejects(search.searchUaeLocation('test navigation only'),/No UAE location/);
  }
  console.log('PASS Esri imagery/reference labels, attribution, zoom, tile-error recovery, cleanup, open-geocoder validation and no Google basemap requests.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
