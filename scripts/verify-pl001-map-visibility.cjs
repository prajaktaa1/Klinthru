/** Read-only database snapshots + browser API replay. No live backend needed.
 * node scripts/verify-pl001-gis.cjs [Playwright module path] [frontend URL]
 * Every browser API request is intercepted; non-read methods are rejected.
 */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), backend = path.join(root, 'backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const { PrismaClient } = require(path.join(backend, 'node_modules/@prisma/client'));
const { chromium } = require(process.argv[2] || 'playwright');
const base = process.argv[3] || 'http://127.0.0.1:4000';
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

  assert.equal(source.segments.length,3); assert.equal(source.assets.length,7);
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1536,height:1050}});
    await context.addInitScript(()=>localStorage.setItem('klinthru-auth-token','readonly-map-check'));
    await context.route('**/api/**',async route=>{
      const req=route.request(),url=new URL(req.url()),pathname=url.pathname;
      if(!['GET','HEAD','OPTIONS'].includes(req.method())) {report.blockedWrites.push(req.method()+' '+pathname);return route.abort();}
      let body=[],status=200;
      if(pathname==='/api/auth/me')body={id:'readonly-map',name:'Read-only map test',role:'Engineer',email:'readonly@example.invalid'};
      else if(pathname==='/api/pipelines')body=pipelines;
      else if(/^\/api\/pipelines\/[^/]+$/.test(pathname))body=pipelines.find(p=>p.id===pathname.split('/').pop());
      else if(pathname==='/api/asset-master/segments')body=records.find(p=>p.id===url.searchParams.get('pipelineId'))?.segments||[];
      else if(pathname==='/api/asset-master/assets')body=records.find(p=>p.id===url.searchParams.get('pipelineId'))?.assets||[];
      else if(pathname==='/api/documents')body={total:0,items:[],page:1,pageSize:10};
      else {status=503;body={message:'Not included in read-only map check'};}
      await route.fulfill({status,json:body});
    });
    const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.pageErrors.push(e.message));
    async function check(name, container){
      const line=container.locator('path.saved-pipeline-overlay');await line.waitFor({state:'attached'});
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('path.saved-pipeline-overlay')).some(p=>p.getAttribute('d')?.includes('L')));
      assert.equal(await line.getAttribute('stroke'),'#0088ff');
      assert.match(await line.getAttribute('aria-label'),/PL-001 Incomplete Route/);
      assert.equal(await container.locator('.saved-pipeline-endpoint').count(),2);
      assert.match(await container.innerText(),/Saved start/);assert.match(await container.innerText(),/Saved end/);
      const frame=await container.boundingBox(),routeBox=await line.boundingBox();
      assert.ok(routeBox.width>10 && routeBox.height>0,name+' route has visible extent');
      assert.ok(routeBox.x>=frame.x && routeBox.y>=frame.y && routeBox.x+routeBox.width<=frame.x+frame.width && routeBox.y+routeBox.height<=frame.y+frame.height,name+' route fits map');
      await container.screenshot({path:path.join(out,name+'.png')});pass(name+' bright blue saved route, endpoints and framing');
    }
    await page.goto(base+'/asset-master',{waitUntil:'domcontentloaded'});
    await page.getByRole('combobox',{name:'Pipeline',exact:true}).selectOption(pl001.id);
    await check('Overview',page.locator('[aria-label^="Pipeline route and linked assets overview map:"]').locator('..'));
    await page.getByRole('tab',{name:'Map View',exact:true}).click();
    const workspace=page.getByLabel('Interactive pipeline map',{exact:true});
    await check('Map-View',workspace);
    await page.getByRole('button',{name:'Fit to Route',exact:true}).click();await check('Map-View-Fit',workspace);
    await page.getByLabel('Map layer Pipeline Route',{exact:true}).uncheck();assert.equal(await workspace.locator('.saved-pipeline-overlay').count(),0);
    await page.getByLabel('Map layer Pipeline Route',{exact:true}).check();await check('Map-View-Layer',workspace);
    await page.setViewportSize({width:900,height:1050});await page.getByRole('button',{name:'Fit to Route',exact:true}).click();await check('Map-View-900',workspace);
    await page.setViewportSize({width:1536,height:1050});
    await page.getByRole('tab',{name:'Assets',exact:true}).click();
    const assetRow=page.getByRole('row').filter({hasText:'VALV-0032'}).first();await assetRow.click();
    await check('Asset-Location',page.locator('[data-asset-map-status="ready"]'));
    await page.goto(base+'/dashboard',{waitUntil:'domcontentloaded'});
    await page.getByRole('combobox',{name:'Dashboard map pipeline',exact:true}).selectOption(pl001.id);
    await check('Executive-Dashboard',page.locator('[data-dashboard-map-status="ready"]'));
    await page.getByRole('button',{name:'Fit dashboard route',exact:true}).click();await check('Executive-Dashboard-Fit',page.locator('[data-dashboard-map-status="ready"]'));
    const map=page.getByLabel('Dashboard pipeline map',{exact:true});
    try {await map.locator('.leaflet-tile-loaded[src*="World_Imagery"]').first().waitFor({timeout:15000}); report.imagery='Live Esri satellite imagery loaded';} catch {report.imagery='Satellite tile network unavailable';}
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.blockedWrites,[]);
    report.saved={lengthKm:pl001.pipeLengthKm,segments:source.segments.length,assets:source.assets.length,routeVertices:pl001.routeGeometry.coordinates.length,gpsAssets:gpsAssets.length};
    pass('No browser errors or write requests; saved 248 km, 3 segments, 7 assets and two route vertices preserved');
  } finally {await browser.close();await db.$disconnect();fs.writeFileSync(path.join(out,'visibility-results.json'),JSON.stringify(report,null,2));}
}
main().catch(e=>{console.error(e);process.exitCode=1;db.$disconnect();});
