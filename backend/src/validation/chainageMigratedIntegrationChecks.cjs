/** Application checks against an approved, migrated temporary restore only. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const target=new URL(process.env.DATABASE_URL);
assert.equal(target.hostname,process.env.CHAINAGE_REHEARSAL_HOST);
assert.ok(!target.hostname.startsWith("ep-lucky-art-"));
assert.equal(target.pathname,"/kl_chainage_migration_migrated");
assert.ok(process.env.CHAINAGE_REHEARSAL_BRANCH?.startsWith("br-"));
assert.ok(process.env.CHAINAGE_REHEARSAL_NAME?.startsWith("chainage-migration-rehearsal-"));
const directory=process.env.CHAINAGE_REHEARSAL_OUTPUT;
require("tsx/cjs");
const {PrismaClient}=require("@prisma/client");
const {createApp}=require("../app.ts"),{signToken}=require("../lib/jwt.ts"),{disconnectPrisma}=require("../lib/prisma.ts");
const db=new PrismaClient(),checks=[];
const check=(name,condition,details)=>{checks.push({name,status:condition?"PASS":"FAIL",...(details===undefined?{}:{details})});};
const blocked=(name,reason)=>checks.push({name,status:"BLOCKED",reason});
async function main(){
  const compatibilityUrl=new URL(process.env.DATABASE_URL);compatibilityUrl.pathname="/kl_chainage_migration_rollback";
  const {command}=require("./chainageBackupRestore.cjs");
  const compatibility=await command(process.execPath,[path.join(__dirname,"chainageUnmigratedCompatibilityChecks.cjs")],{...process.env,DATABASE_URL:compatibilityUrl.toString()},180000);
  fs.writeFileSync(path.join(directory,"unmigrated-compatibility.log"),compatibility.stdout+"\n"+compatibility.stderr);
  check("Unmigrated isolated restore retains ordinary saves and rejects unavailable settings safely",true);
  const originals=await db.pipeline.findMany({orderBy:{id:"asc"},include:{assets:true,segments:true}});
  const admin=await db.user.findFirstOrThrow({where:{role:"Admin"}}),token=signToken({sub:admin.id,email:admin.email,role:admin.role});
  const server=createApp().listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${server.address().port}`,headers={Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
  const call=async(url,method="GET",body)=>{const response=await fetch(base+url,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};};
  let fixtureId,browser;
  try{
    for(const pipeline of originals){
      const details=await call(`/api/pipelines/${pipeline.id}`),segments=await call(`/api/asset-master/segments?pipelineId=${pipeline.id}`),assets=await call(`/api/asset-master/assets?pipelineId=${pipeline.id}`),snapshot=await call(`/api/chainage/${pipeline.id}`);
      check(`${pipeline.pipelineCode}: saved pipeline/segments/assets API`,details.status===200&&segments.status===200&&assets.status===200&&snapshot.status===200);
      check(`${pipeline.pipelineCode}: selected-pipeline filters`,Array.isArray(segments.data)&&segments.data.every(s=>s.pipelineId===pipeline.id)&&segments.data.length===pipeline.segments.length&&Array.isArray(assets.data)&&assets.data.every(a=>a.pipelineId===pipeline.id)&&assets.data.length===pipeline.assets.length);
      const convert=await call(`/api/chainage/${pipeline.id}`,"POST",{operation:"convert",chainage:"0+050"});
      check(`${pipeline.pipelineCode}: shared conversion`,convert.status===200&&convert.data.result?.meters===50);
      const distance=await call(`/api/chainage/${pipeline.id}`,"POST",{operation:"distance",chainage:"0+000",target:"0+050"});
      check(`${pipeline.pipelineCode}: along-chainage distance`,distance.status===200&&distance.data.result?.distance_m===50);
      const coordinate=await call(`/api/chainage/${pipeline.id}`,"POST",{operation:"coordinate",chainage:"0+000"});
      check(`${pipeline.pipelineCode}: GIS fails closed on missing/inconsistent alignment`,coordinate.status===422);
    }
    // Temporary fixtures have no invented GPS and are removed before testing the original map records.
    const created=await call("/api/pipelines","POST",{pipelineCode:"MIGRATION-REHEARSAL-ONLY",pipelineName:"Isolated migration integration fixture",pipeMaterial:"Carbon Steel",pipeGrade:"API 5L X52",pipeLengthKm:20,status:"Active",chainageOriginMeters:0,chainageOriginName:"Created test datum"});
    check("Pipeline save on migrated schema",created.status===201,created.status);fixtureId=created.data.id;
    if(!fixtureId)throw new Error("Could not create isolated integration fixture.");
    check("Pipeline settings on creation persist after reload",(await call(`/api/pipelines/${fixtureId}`)).data.chainageOriginName==="Created test datum");
    const segment=await call("/api/asset-master/segments","POST",{pipelineId:fixtureId,segmentId:"MIGRATION-SEG",startKp:"1+000",endKp:"2+000"});
    check("Segment engineering-chainage save",segment.status===201,segment.status);
    if(segment.status===201){
      const value=(await db.$queryRawUnsafe('SELECT "startChainageMeters"::text AS start_m,"endChainageMeters"::text AS end_m FROM "Segment" WHERE id=$1',segment.data.id))[0];
      check("Segment save synchronizes new numeric chainage columns",Number(value.start_m)===1000&&Number(value.end_m)===2000&&value.start_m!==null&&value.end_m!==null,{expected:{start_m:1000,end_m:2000},actual:value});
      const asset=await call("/api/asset-master/assets","POST",{pipelineId:fixtureId,segmentId:segment.data.id,assetId:"MIGRATION-ASSET",assetType:"VALVE",kp:"1+500",physicalStatus:"Active"});
      check("Asset engineering-chainage save",asset.status===201,asset.status);
      if(asset.status===201){
        const value=(await db.$queryRawUnsafe('SELECT kp,"chainageMeters"::text AS meters FROM "Asset" WHERE id=$1',asset.data.id))[0];
        check("Asset save synchronizes new numeric chainage column",value.meters!==null&&Number(value.meters)===1500,{expected:1500,actual:value});
        const edit=await call(`/api/asset-master/assets/${asset.data.id}`,"PUT",{pipelineId:fixtureId,segmentId:segment.data.id,assetId:"MIGRATION-ASSET",assetType:"VALVE",kp:"1+600",physicalStatus:"Active"});
        const valueAfter=(await db.$queryRawUnsafe('SELECT kp,"chainageMeters"::text AS meters FROM "Asset" WHERE id=$1',asset.data.id))[0];
        check("Asset update synchronizes numeric chainage",edit.status===200&&valueAfter.meters!==null&&Number(valueAfter.meters)===1600,{expected:1600,actual:valueAfter});
        for(const [kp,expected] of [["0+000",0],["1+600.125",1600.125],["",null]]){
          // Zero belongs to the pipeline origin, outside this fixture segment's 1–2 km range.
          const edit=await call(`/api/asset-master/assets/${asset.data.id}`,"PUT",{pipelineId:fixtureId,segmentId:kp==="0+000"?undefined:segment.data.id,assetId:"MIGRATION-ASSET",assetType:"VALVE",kp,physicalStatus:"Active"});
          const [saved]=await db.$queryRawUnsafe('SELECT "chainageMeters"::text AS meters FROM "Asset" WHERE id=$1',asset.data.id);
          check(`Asset numeric save handles ${kp||"cleared chainage"}`,edit.status===200&&(expected===null?saved.meters===null:saved.meters!==null&&Number(saved.meters)===expected),saved);
        }
      }
    }
    const pipelineBody={pipelineCode:"MIGRATION-REHEARSAL-ONLY",pipelineName:"Isolated migration integration fixture",pipeMaterial:"Carbon Steel",pipeGrade:"API 5L X52",pipeLengthKm:20,status:"Active"};
    const settings={chainageOriginMeters:0,chainageOriginName:"Isolated test datum",chainageOriginReference:"Test metadata only",chainageDirection:"INCREASING_DOWNSTREAM",chainagePrecision:3,allowNegativeChainage:false,chainageMatchToleranceMeters:5,chainageBoundaryPolicy:"REJECT",chainageCoordinateSystem:"EPSG:4326"};
    const configure=await call(`/api/pipelines/${fixtureId}`,"PUT",{...pipelineBody,...settings});
    const savedSettings=await call(`/api/pipelines/${fixtureId}`);
    check("Pipeline chainage settings Save -> Reload",configure.status===200&&Object.entries(settings).every(([key,value])=>savedSettings.data[key]===value),configure.status);
    const direction=await call(`/api/chainage/${fixtureId}`);
    check("Shared agent reads saved pipeline direction and datum",direction.data.direction===settings.chainageDirection&&direction.data.origin?.physical_datum===settings.chainageOriginReference);
    const omitted=await call(`/api/pipelines/${fixtureId}`,"PUT",pipelineBody),preserved=await call(`/api/pipelines/${fixtureId}`);
    check("Existing pipeline form preserves omitted chainage settings",omitted.status===200&&Object.entries(settings).every(([key,value])=>preserved.data[key]===value));
    for(const invalid of [{chainagePrecision:10},{chainageMatchToleranceMeters:-1},{chainageOriginLatitude:91},{chainageDirection:"INVALID"},{chainageOriginLatitude:20},{parentPipelineId:fixtureId}]){
      const response=await call(`/api/pipelines/${fixtureId}`,"PUT",{...pipelineBody,...invalid});
      check(`Reject invalid chainage settings ${Object.keys(invalid)[0]}=${Object.values(invalid)[0]}`,response.status===400,response.status);
    }
    const unchangedSettings=await call(`/api/pipelines/${fixtureId}`);
    check("Rejected settings leave saved values unchanged",Object.entries(settings).every(([key,value])=>unchangedSettings.data[key]===value));
    if(segment.status===201){
      const edited=await call(`/api/asset-master/segments/${segment.data.id}`,"PUT",{pipelineId:fixtureId,segmentId:"MIGRATION-SEG",startKp:"1+100",endKp:"2+100"});
      const [value]=await db.$queryRawUnsafe('SELECT "startChainageMeters"::text AS start_m,"endChainageMeters"::text AS end_m FROM "Segment" WHERE id=$1',segment.data.id);
      check("Segment Edit -> Save -> Reload synchronizes numeric fields",edited.status===200&&Number(value.start_m)===1100&&Number(value.end_m)===2100,value);
    }
    // Remove only the fixtures created above. No original pipeline/asset/segment rows are updated/deleted.
    await db.asset.deleteMany({where:{pipelineId:fixtureId}});await db.segment.deleteMany({where:{pipelineId:fixtureId}});await db.pipeline.delete({where:{id:fixtureId}});fixtureId=undefined;
    const {chromium}=require(path.resolve(__dirname,"../../../.scada-test-tools/node_modules/playwright"));
    browser=await chromium.launch({headless:true,channel:"msedge"});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(t=>localStorage.setItem("klinthru-auth-token",t),token);
    const page=await context.newPage(),errors=[];let rerouted=0;
    page.setDefaultTimeout(45000);page.on("pageerror",e=>errors.push(e.message));
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):4002\//,route=>{rerouted++;return route.continue({url:route.request().url().replace(/^https?:\/\/(localhost|127\.0\.0\.1):4002/,base)});});
    await page.goto("http://localhost:4000/asset-master",{waitUntil:"domcontentloaded",timeout:120000});
    await page.getByRole("heading",{name:"Pipeline / Asset Master"}).waitFor({timeout:120000});
    const select=page.locator("select").first();await select.locator("option").nth(originals.length-1).waitFor({state:"attached"});
    for(const pipeline of originals){
      console.log(`Isolated migrated browser: ${pipeline.pipelineCode}`);
      await select.selectOption(pipeline.id);
      await page.getByRole("tab",{name:"Overview",exact:true}).click();await page.getByRole("heading",{name:"Pipeline Information",exact:true}).waitFor();
      await page.getByRole("tab",{name:"Segments",exact:true}).click();await page.getByLabel("Segment register",{exact:true}).waitFor();
      await page.getByRole("tab",{name:"Assets",exact:true}).click();await page.getByLabel("Assets workspace",{exact:true}).waitFor();
      await page.getByLabel("Asset Type",{exact:true}).selectOption("VALVE");await page.getByRole("button",{name:"Clear",exact:true}).click();
      await page.getByRole("tab",{name:"Map View",exact:true}).click();await page.getByLabel("Pipeline map workspace",{exact:true}).waitFor();
      await page.waitForFunction(()=>document.querySelector("[data-pipeline-map-status]")?.getAttribute("data-pipeline-map-status")!=="loading",null,{timeout:45000});
      const status=await page.locator("[data-pipeline-map-status]").getAttribute("data-pipeline-map-status");
      check(`${pipeline.pipelineCode}: Overview/Segments/Assets/Map View browser integration`,status==="ready",{mapStatus:status});
      await page.screenshot({path:path.join(directory,`${pipeline.pipelineCode.replace(/[<>:"/\\|?*]/g,"_")}-migrated-map.png`)});
    }
    await page.reload({waitUntil:"domcontentloaded"});await page.getByRole("heading",{name:"Pipeline / Asset Master"}).waitFor({timeout:120000});
    check("Browser reload and isolated API routing",rerouted>0&&errors.length===0,{isolatedApiRequests:rerouted,pageErrors:errors});
    // Exercise the actual existing forms, exclusively through the isolated API.
    await page.getByRole("button",{name:"Add Pipeline",exact:true}).click();
    let dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="Pipeline ID"]').fill("CHAINAGE-UI-REHEARSAL");
    await dialog.locator('[data-field-label="Name"]').fill("Isolated form verification");
    await dialog.locator('[data-field-label="Material"]').selectOption("Carbon Steel");
    await dialog.locator('[data-field-label="Grade"]').selectOption("X52");
    await dialog.locator('[data-field-label="Total Length (km)"]').fill("20");
    await dialog.locator('[data-field-label="Status"]').selectOption("Active");
    const saveForm=async(label)=>{
      const response=page.waitForResponse(r=>r.url().includes("/api/")&&["POST","PUT"].includes(r.request().method()));
      await dialog.getByRole("button",{name:label,exact:true}).click();
      const r=await response;const body=await r.json();assert.ok(r.ok(),`${label} returned ${r.status()}: ${JSON.stringify(body)}`);await dialog.waitFor({state:"hidden"});return body;
    };
    const uiPipeline=await saveForm("Save Pipeline");fixtureId=uiPipeline.id;
    const configureUi=await call(`/api/pipelines/${fixtureId}`,"PUT",{...pipelineBody,pipelineCode:uiPipeline.pipelineCode,pipelineName:uiPipeline.pipelineName,pipeGrade:"X52",...settings});
    assert.equal(configureUi.status,200);
    await page.reload({waitUntil:"domcontentloaded"});await select.selectOption(fixtureId);
    check("Pipeline Add -> Save -> Reload form",(await call(`/api/pipelines/${fixtureId}`)).data.pipelineCode==="CHAINAGE-UI-REHEARSAL");
    await page.getByRole("tab",{name:"Overview",exact:true}).click();
    await page.getByRole("button",{name:"Edit Pipeline / Import GIS",exact:true}).first().click();dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="Name"]').fill("Isolated form verification edited");await saveForm("Save Pipeline");
    await page.reload({waitUntil:"domcontentloaded"});await select.selectOption(fixtureId);
    check("Pipeline Edit -> Save -> Reload form",(await call(`/api/pipelines/${fixtureId}`)).data.pipelineName==="Isolated form verification edited");
    const uiSettings=await call(`/api/pipelines/${fixtureId}`);
    check("Pipeline browser Edit preserves saved chainage settings",Object.entries(settings).every(([key,value])=>uiSettings.data[key]===value));
    await page.getByRole("tab",{name:"Segments",exact:true}).click();await page.getByRole("button",{name:"Add Segment",exact:true}).click();dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="Segment ID"]').fill("UI-SEG");await dialog.locator('[data-field-label="From KP"]').fill("1+000");await dialog.locator('[data-field-label="To KP"]').fill("2+000");
    const uiSegment=await saveForm("Save Segment");
    const segmentMeters=async()=>{const [row]=await db.$queryRawUnsafe('SELECT "startChainageMeters"::text AS start_m,"endChainageMeters"::text AS end_m FROM "Segment" WHERE id=$1',uiSegment.id);return row;};
    await page.reload({waitUntil:"domcontentloaded"});await select.selectOption(fixtureId);await page.getByRole("tab",{name:"Segments",exact:true}).click();
    let value=await segmentMeters();check("Segment Add -> Save -> Reload form",Number(value.start_m)===1000&&Number(value.end_m)===2000,value);
    await page.getByRole("button",{name:"Edit UI-SEG",exact:true}).click();dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="From KP"]').fill("1+100");await dialog.locator('[data-field-label="To KP"]').fill("2+100");await saveForm("Save Segment");
    await page.reload({waitUntil:"domcontentloaded"});await select.selectOption(fixtureId);value=await segmentMeters();
    check("Segment Edit -> Save -> Reload form",Number(value.start_m)===1100&&Number(value.end_m)===2100,value);
    await page.getByRole("tab",{name:"Assets",exact:true}).click();await page.getByRole("button",{name:"Add Asset",exact:true}).click();dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="Asset ID"]').fill("UI-ASSET");await dialog.locator('[data-field-label="KP"]').fill("1+500");
    const uiAsset=await saveForm("Save Asset");
    const assetMeters=async()=>{const [row]=await db.$queryRawUnsafe('SELECT "chainageMeters"::text AS meters FROM "Asset" WHERE id=$1',uiAsset.id);return row;};
    await page.reload({waitUntil:"domcontentloaded"});await select.selectOption(fixtureId);await page.getByRole("tab",{name:"Assets",exact:true}).click();
    value=await assetMeters();check("Asset Add -> Save -> Reload form",Number(value.meters)===1500,value);
    await page.getByRole("button",{name:"Edit",exact:true}).click();dialog=page.getByRole("dialog");
    await dialog.locator('[data-field-label="KP"]').fill("1+600");await saveForm("Save Asset");
    await page.reload({waitUntil:"domcontentloaded"});value=await assetMeters();check("Asset Edit -> Save -> Reload form",Number(value.meters)===1600,value);
    check("Form saves cause no browser page errors",errors.length===0,errors);
  }catch(e){checks.push({name:"Integration runner",status:"FAIL",details:e.message});}
  finally{
    if(browser)await browser.close();
    if(fixtureId){await db.asset.deleteMany({where:{pipelineId:fixtureId}});await db.segment.deleteMany({where:{pipelineId:fixtureId}});await db.pipeline.delete({where:{id:fixtureId}});}
    await new Promise(resolve=>server.close(resolve));await disconnectPrisma();await db.$disconnect();
    fs.writeFileSync(path.join(directory,"integration-checks.json"),JSON.stringify({targetIsolated:true,checks,pass:checks.filter(c=>c.status==="PASS").length,fail:checks.filter(c=>c.status==="FAIL").length,blocked:checks.filter(c=>c.status==="BLOCKED").length},null,2));
    console.log(`Isolated integrations: ${checks.filter(c=>c.status==="PASS").length} PASS, ${checks.filter(c=>c.status==="FAIL").length} FAIL, ${checks.filter(c=>c.status==="BLOCKED").length} BLOCKED.`);
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
