// Browser regression against saved development data via a separate read-only
// test server. Test credentials are accepted only by this process, never by
// the running application. No user or fixture records are added to the DB.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({path:path.resolve(__dirname,'../../.env'),quiet:true});
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-lucky-art-azl730oe.c-3.ap-southeast-1.aws.neon.tech');
process.env.NODE_ENV='test';
process.env.JWT_SECRET='isolated-read-only-gps-browser-test-secret';
const {createApp}=require('../app');
const {store}=require('../data/store');
const {disconnectPrisma}=require('../lib/prisma');
const express=require('express');
const bcrypt=require('bcrypt');
const {chromium}=require(path.resolve(__dirname,'../../../.scada-test-tools/node_modules/playwright'));
const overviewMode=process.argv.includes('--overview-segments');
const out=path.resolve(__dirname,overviewMode?'../../../artifacts/pl001-overview-segments':'../../../artifacts/pl001-gps-map');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],apiFailures:[],blockedWrites:[],usingSeparateReadOnlyTestBackend:true};
const user={id:'isolated-gps-browser-check',name:'Isolated GPS Browser Check',email:'gps-check@example.invalid',role:'Admin',passwordHash:bcrypt.hashSync('isolated-gps-check-password',8),createdAt:new Date().toISOString()};
store.findUserByEmail=async email=>email===user.email?user:null;
store.findUserById=async id=>id===user.id?user:null;
const application=express();
application.use((req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!(req.method==='POST'&&req.path==='/api/auth/login')){report.blockedWrites.push(req.method+' '+req.path);res.status(405).json({message:'Read-only GPS verification server'});return;}next();});
application.use(createApp());
let server,browser,page;
(async()=>{try{
 server=application.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const api='http://127.0.0.1:'+server.address().port;
 const login=await fetch(api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'isolated-gps-check-password'})});assert.equal(login.status,200);const {token}=await login.json();
 const read=async endpoint=>{const res=await fetch(api+endpoint,{headers:{Authorization:'Bearer '+token}});assert.equal(res.status,200,endpoint);return res.json();};
 const pipelines=await read('/api/pipelines');const pipeline=pipelines.find(p=>p.pipelineCode==='PL-001');assert.ok(pipeline);
 const [segments,assets]=await Promise.all([read('/api/asset-master/segments?pipelineId='+pipeline.id),read('/api/asset-master/assets?pipelineId='+pipeline.id)]);
 assert.equal(segments.length,5);assert.equal(assets.length,7);assert.equal(assets.find(a=>a.assetId==='SNS-DEMO-001').segmentId,segments.find(s=>s.segmentId==='SEG-04').id);
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1536,height:1080}});
 await context.addInitScript(token=>localStorage.setItem('klinthru-auth-token',token),token);
 await context.route(/^https?:\/\/(localhost|127\.0\.0\.1):4002\//,route=>route.continue({url:route.request().url().replace(/^https?:\/\/(localhost|127\.0\.0\.1):4002/,api)}));
 page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(api)&&r.status()>=400)report.apiFailures.push({url:new URL(r.url()).pathname,status:r.status()});});
 await page.goto('http://localhost:4000/asset-master?pipelineId='+pipeline.id,{waitUntil:'domcontentloaded',timeout:120000});
 if(overviewMode){await require('./pl001OverviewSegmentsChecks.cjs')(page,pipeline,segments,assets,read,report);report.status='PASS';return;}
 const panel=()=>page.locator('[data-record-pipeline-id="'+pipeline.id+'"]');
 async function verify(){await page.locator('[data-pipeline-map-status="ready"]').waitFor();await panel().waitFor();assert.equal(await panel().locator('[data-segment-record-id]').count(),5);assert.equal(await panel().locator('[data-asset-record-id]').count(),7);assert.equal(await page.locator('.saved-pipeline-overlay').count(),0,'Incomplete route must have no connecting line');assert.equal(await page.locator('.saved-pipeline-endpoint').count(),2);await page.getByRole('button',{name:'Select saved asset VALV-0032',exact:true}).waitFor();const sensor=await panel().locator('[data-asset-record-id="'+assets.find(a=>a.assetId==='SNS-DEMO-001').id+'"]').innerText();assert.ok(sensor.includes('SEG-04'));}
 await verify();report.checks.push('Saved API data: five segments, seven assets, persisted SEG-04 sensor assignment, two endpoints and no invented route');
 await page.getByRole('button',{name:'Select saved asset VALV-0032',exact:true}).click();await page.getByRole('button',{name:'Copy asset coordinates',exact:true}).waitFor();assert.ok((await page.locator('[aria-label="Pipeline map workspace"]').innerText()).includes('24.1025, 54.6712'));
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 await page.getByRole('button',{name:'Select saved asset SNS-DEMO-001',exact:true}).click();assert.ok((await page.locator('[aria-label="Pipeline map workspace"]').innerText()).includes('GPS Required'));
 const search=page.getByRole('textbox',{name:'Search map by KP, asset, segment or location'});await search.fill('SEG-05');await search.press('Enter');assert.ok((await page.locator('[aria-label="Pipeline map workspace"]').innerText()).includes('No segment route coordinates saved'));
 report.checks.push('Asset selection, missing-GPS handling, segment search and zoom controls');
 const refreshed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/asset-master/assets'&&r.status()===200);await page.getByRole('button',{name:'Refresh saved map data',exact:true}).click();await refreshed;await verify();
 await page.reload({waitUntil:'domcontentloaded'});await verify();report.checks.push('Map Refresh fetches saved API records; browser reload preserves all five segments and seven assets');
 const dark=page.getByRole('button',{name:'Switch to dark mode',exact:true});await dark.click();await page.getByRole('button',{name:'Switch to light mode',exact:true}).waitFor();await verify();await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();await verify();report.checks.push('Existing dark/light theme controls preserve the saved map records');
 const selector=page.getByRole('combobox',{name:'Pipeline',exact:true});const other=pipelines.find(p=>p.id!==pipeline.id);if(other){await selector.selectOption(other.id);await page.waitForFunction(id=>!document.querySelector('[data-record-pipeline-id="'+id+'"]'),pipeline.id);await selector.selectOption(pipeline.id);await verify();report.checks.push('Pipeline selection clears previous records and restores only PL-001 on return');}
 await page.screenshot({path:path.join(out,'gps-map-browser.png'),fullPage:true});assert.deepEqual(report.errors,[]);assert.deepEqual(report.blockedWrites,[]);assert.deepEqual(report.apiFailures,[]);
 report.status='PASS';
 }catch(e){report.status='FAIL';report.failure=e.stack;if(page){report.pageText=(await page.locator('body').innerText()).slice(0,12000);await page.screenshot({path:path.join(out,'gps-map-failure.png'),fullPage:true}).catch(()=>{});}throw e;}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await disconnectPrisma();fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})().catch(()=>{process.exitCode=1;});
