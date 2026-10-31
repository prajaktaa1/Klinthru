/** Read-only database snapshots + browser API replay. No live backend needed.
 * node scripts/verify-pl001-gis.cjs [Playwright module path] [frontend URL]
 * Every browser API request is intercepted; non-read methods are rejected.
 */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), backend = path.join(root, 'backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const { PrismaClient } = require(path.join(backend, 'node_modules/@prisma/client'));
const { chromium } = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://127.0.0.1:4010';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local frontend only');
const db = new PrismaClient(), out = path.join(root, 'artifacts/uae-esri-satellite/pl001-browser');
const report = { checkedAt: new Date().toISOString(), checks: [], blockedWrites: [], pageErrors: [], apiRequests: [],googleRequests:[] };
const hash = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function snapshot() {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return tx.pipeline.findMany({ orderBy: { id: 'asc' }, include: { segments: { orderBy: { id: 'asc' } }, assets: { orderBy: { id: 'asc' } } } });
  });
}
const pass = message => { report.checks.push(message); console.log('PASS ' + message); };
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const before = await snapshot(); report.beforeSha256 = hash(before);
  // Null fields become undefined just as the existing API's optional fields do.
  const records = JSON.parse(JSON.stringify(before), (key, value) => value === null ? undefined : value);
  const pipelines = records.map(({ assets, segments, ...p }) => p);
  const pl001 = pipelines.find(p => p.pipelineCode === 'PL-001'), pl002 = pipelines.find(p => p.pipelineCode === 'PL-002');
  assert.ok(pl001 && pl002); assert.equal(pl001.pipeLengthKm, 248); assert.equal(pl001.routeGeometry.coordinates.length, 2);
  const source = records.find(p => p.id === pl001.id), gpsAssets = source.assets.filter(a => Number.isFinite(a.latitude) && Number.isFinite(a.longitude));
  assert.equal(gpsAssets.length, 1); assert.equal(gpsAssets[0].assetId, 'VALV-0032');
  let browser, page, failLeaflet = true, mismatchDetails = false, failAssets = false;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1536, height: 1050 } });
    await context.route('https://maps.googleapis.com/**', async route => { report.googleRequests.push('Google request blocked by test'); await route.abort(); });
    await context.addInitScript(() => localStorage.setItem('klinthru-auth-token', 'intercepted-readonly-browser-check'));
    await context.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), pathname = url.pathname;
      report.apiRequests.push(req.method() + ' ' + pathname + url.search);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { report.blockedWrites.push(req.method() + ' ' + pathname); await route.abort(); return; }
      let body, status = 200;
      if (pathname === '/api/auth/me') body = { id: 'readonly-replay-user', name: 'Read-only verification', role: 'Engineer', email: 'readonly@example.invalid' };
      else if (pathname === '/api/pipelines') body = pipelines;
      else if (/^\/api\/pipelines\/[^/]+$/.test(pathname)) {
        const id = pathname.split('/').pop(); body = mismatchDetails && id === pl001.id ? pl002 : pipelines.find(p => p.id === id);
      } else if (pathname === '/api/asset-master/segments') body = records.find(p => p.id === url.searchParams.get('pipelineId'))?.segments || [];
      else if (pathname === '/api/asset-master/assets' && !failAssets) body = records.find(p => p.id === url.searchParams.get('pipelineId'))?.assets || [];
      else if (pathname === '/api/documents') body = { total: 0, items: [], page: 1, pageSize: 1 };
      else { status = 503; body = { message: 'Module not included in read-only GIS replay' }; }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    // Exercise the real loader failure/retry, not an injected Leaflet implementation.
    await context.route('**/leaflet@*/dist/leaflet.js', async route => { if (failLeaflet) await route.abort(); else await route.continue(); });
    page = await context.newPage(); page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(base + '/asset-master', { waitUntil: 'domcontentloaded' });
    const picker = page.getByRole('combobox', { name: 'Pipeline', exact: true });
    await picker.selectOption(pl001.id);
    await page.getByRole('tab', { name: 'Map View', exact: true }).click();
    await page.getByRole('button', { name: 'Retry map', exact: true }).waitFor();
    failLeaflet = false;
    await page.getByRole('button', { name: 'Retry map', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'GIS Route Data Required' }).first().waitFor();
    await page.waitForFunction(() => document.querySelector('[data-map-provider="esri"]'));
    assert.equal(await page.locator('.leaflet-overlay-pane path.leaflet-interactive').count(), 0, 'Endpoint line and chainage markers must not be drawn');
    await page.locator('.leaflet-marker-icon[title="VALV-0032"]').waitFor();
    try {
      await page.waitForFunction(() => document.querySelector('.leaflet-tile-loaded[src*="World_Imagery"]'), null, { timeout: 15000 });
      await page.waitForFunction(() => document.querySelector('.leaflet-tile-loaded[src*="World_Boundaries_and_Places"]'), null, { timeout: 15000 });
      report.imagery = 'PASS: live Esri imagery and reference-label tiles loaded';
    } catch { report.imagery = 'BLOCKED: imagery or label tile network unavailable; vector rendering checked independently'; }
    assert.match(await page.locator('.leaflet-control-attribution').first().innerText(),/Powered by Esri/);
    assert.equal(await page.getByRole('button',{name:'Fit to Route',exact:true}).isDisabled(),true,'PL-001 has no accepted alignment to fit');
    for(let i=0;i<8;i++) await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    await page.locator('.leaflet-marker-icon[title="VALV-0032"]').waitFor();
    await page.getByLabel('More map fitting options',{exact:true}).click();
    await page.getByRole('button',{name:'Fit all assets',exact:true}).click();
    await page.setViewportSize({width:900,height:1050});
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    await page.setViewportSize({width:1536,height:1050});
    await page.getByLabel('More map fitting options',{exact:true}).click();
    await page.getByRole('button',{name:'Fit all assets',exact:true}).click();
    await page.getByRole('status').filter({ hasText: 'Chainage markers: BLOCKED' }).waitFor();
    await page.getByLabel('Interactive pipeline map',{exact:true}).screenshot({ path: path.join(out, 'PL-001-map.png') });
    for(let i=0;i<7;i++) await page.getByRole('button',{name:'Zoom out',exact:true}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('[aria-label="Saved pipeline route and asset locations"] img.leaflet-tile')).every(img=>img.complete),null,{timeout:15000});
    await page.getByLabel('Interactive pipeline map',{exact:true}).screenshot({ path: path.join(out, 'UAE-labels.png') });
    await page.getByLabel('More map fitting options',{exact:true}).click();
    await page.getByRole('button',{name:'Fit all assets',exact:true}).click();
    pass('PL-001 Leaflet retry, Esri imagery/reference labels, attribution, high zoom and Fit all assets work; Fit to Route and invalid route/KP markers stay blocked');
    await page.getByRole('textbox', { name: 'Search map by KP, asset, segment or location' }).fill('10+000');
    await page.getByRole('button', { name: 'Search map', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Saved alignment length differs' }).first().waitFor();
    pass('PL-001 KP search explains geometry-distance mismatch without generating coordinates');
    await picker.selectOption(pl002.id);
    await page.getByRole('status').filter({ hasText: 'GIS Route Data Required' }).first().waitFor();
    assert.equal(await page.locator('.leaflet-marker-icon[title="VALV-0032"]').count(), 0);
    await picker.selectOption(pl001.id);
    await page.locator('.leaflet-marker-icon[title="VALV-0032"]').waitFor();
    pass('Pipeline selection removes PL-001 markers in PL-002 and restores only PL-001 saved records on return');
    mismatchDetails = true;
    await page.evaluate(() => window.dispatchEvent(new Event('klinthru-master-map-data-changed')));
    await page.getByText(/Pipeline response does not match the selected pipeline/).waitFor();
    assert.equal(await picker.inputValue(), pl001.id);
    mismatchDetails = false;
    await page.evaluate(() => window.dispatchEvent(new Event('klinthru-master-map-data-changed')));
    await page.locator('.leaflet-marker-icon[title="VALV-0032"]').waitFor();
    pass('Mismatched detail responses cannot replace the selected pipeline; refresh recovers');
    const priorReads = report.apiRequests.filter(p => p === 'GET /api/pipelines').length;
    await page.getByRole('button', { name: 'Add Pipeline', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('klinthru-master-map-data-changed')));
    // A round-trip to the next animation frame gives the effect a chance to run.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(report.apiRequests.filter(p => p === 'GET /api/pipelines').length, priorReads, 'Do not refresh over an open form');
    const deferred = page.waitForResponse(response => new URL(response.url()).pathname === '/api/pipelines');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await deferred;
    await page.locator('.leaflet-marker-icon[title="VALV-0032"]').waitFor();
    pass('Master change notifications received during an edit are deferred until the form closes');

    await page.goto(base + '/dashboard', { waitUntil: 'domcontentloaded' });
    const owner = page.getByLabel('Saved Asset Master dashboard map', { exact: true });
    const mapPicker = page.getByRole('combobox', { name: 'Dashboard map pipeline', exact: true });
    await mapPicker.selectOption(pl001.id);
    async function ready(assetCount) {
      await page.waitForFunction(n => { const map = document.querySelector('[data-dashboard-map-status="ready"]'); return map && map.dataset.pipelineRouteCount === '0' && map.dataset.segmentRouteCount === '0' && map.dataset.locatedAssetCount === String(n); }, assetCount);
    }
    await ready(1);
    await page.waitForFunction(()=>document.querySelector('[aria-label="Dashboard pipeline map"][data-map-provider="esri"]'));
    assert.equal(await page.getByRole('combobox', { name: 'Dashboard pipeline', exact: true }).inputValue(), pl001.id);
    await owner.getByRole('status').filter({ hasText: 'GIS Route Data Required' }).waitFor();
    await owner.locator('summary').click();
    assert.match(await owner.getByLabel('Mapped pipeline records').innerText(), /248 km/);
    await page.screenshot({ path: path.join(out, 'PL-001-dashboard.png'), fullPage: true });
    pass('Dashboard pipeline selector synchronizes with map selector; PL-001 retains 248 km, one saved asset and zero accepted routes');
    const readCount = () => report.apiRequests.filter(p => p === 'GET /api/pipelines/' + pl001.id).length;
    for (const kind of ['same-tab', 'cross-tab', 'focus']) {
      const count = readCount();
      const reloaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/pipelines/' + pl001.id);
      await page.evaluate(kind => {
        if (kind === 'same-tab') window.dispatchEvent(new Event('klinthru-master-map-data-changed'));
        else if (kind === 'focus') window.dispatchEvent(new Event('focus'));
        else window.dispatchEvent(new StorageEvent('storage', { key: 'klinthru-master-map-revision', newValue: 'verification-only' }));
      }, kind);
      await reloaded;
      await page.waitForFunction(() => document.querySelector('[data-dashboard-map-status="ready"]'));
      await ready(1); assert.ok(readCount() > count, kind + ' must refetch saved details');
    }
    pass('Same-tab change, cross-tab storage event and window focus each reload Dashboard saved map data');
    failAssets = true;
    await page.evaluate(() => window.dispatchEvent(new Event('klinthru-master-map-data-changed')));
    await owner.getByRole('status').filter({ hasText: 'Assets unavailable' }).waitFor();
    assert.equal(await page.locator('[data-located-asset-count="1"]').count(), 0);
    failAssets = false;
    await page.evaluate(() => window.dispatchEvent(new Event('klinthru-master-map-data-changed')));
    await ready(1);
    pass('Failed asset refresh removes stale markers, reports the failure and recovers on refresh');
    assert.deepEqual(report.blockedWrites, []); assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.googleRequests,[]);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.failure = error.stack;
    if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser?.close();
    const after = await snapshot(); report.afterSha256 = hash(after); report.dataUnchanged = report.beforeSha256 === report.afterSha256;
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2));
    assert.equal(report.dataUnchanged, true, 'Original pipeline/segment/asset records must remain unchanged');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
