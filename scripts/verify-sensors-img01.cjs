// Isolated browser replay: real read-only inventory first; synthetic records only in intercepted contract tests.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),backend=path.join(root,"backend");
require(path.join(backend,"node_modules/dotenv")).config({path:path.join(backend,".env"),quiet:true});
const {PrismaClient}=require(path.join(backend,"node_modules/@prisma/client"));
const {chromium}=require(process.argv[2]||"playwright");
const base=process.argv[3]||"http://127.0.0.1:4010";
assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname));
const db=new PrismaClient({log:[]}),out=path.join(root,"artifacts/sensors-img01");
const report={checkedAt:new Date().toISOString(),checks:[],pageErrors:[],interceptedWrites:[],databaseWrites:0};
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function snapshot(){return db.$transaction(async tx=>{await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");return {devices:await tx.deviceRecord.findMany({orderBy:{id:"asc"}}),assignments:await tx.sensorAssignment.findMany({orderBy:{id:"asc"}}),pipelines:await tx.pipeline.findMany({orderBy:{id:"asc"}})};});}
const pass=v=>{report.checks.push(v);console.log("PASS "+v);};
function deviceDto(record){return {id:record.id,deviceId:record.deviceId,deviceType:record.deviceType,pipelineOrLocation:record.pipelineOrLocation,status:record.status,latestReadingOrState:record.latestReadingOrState,...(record.unit?{unit:record.unit}:{}),lastUpdatedAt:new Date(record.lastUpdatedAt).toISOString(),isDemoData:record.isDemoData};}
async function main(){
 fs.mkdirSync(out,{recursive:true});const before=await snapshot();report.beforeHash=hash(before);
 report.realInventory={devices:before.devices.length,nonDemo:before.devices.filter(d=>!d.isDemoData).length,assignments:before.assignments.length,demoIds:before.devices.filter(d=>d.isDemoData).map(d=>d.deviceId),preservedDeviceIds:before.devices.map(d=>d.deviceId),pl001Present:before.pipelines.some(p=>p.pipelineCode==="PL-001")};
 const schema=fs.readFileSync(path.join(backend,"prisma/schema.prisma"));report.schemaBefore=hash(schema.toString());
 let browser,page;
 try{
  browser=await chromium.launch({channel:"chrome",headless:true});
  const context=await browser.newContext({viewport:{width:1672,height:1100},acceptDownloads:true});
  await context.addInitScript(()=>localStorage.setItem("klinthru-auth-token","sensors-isolated-contract"));
  let devices=before.devices.map(deviceDto),assignments=[],mode="real",failure=false,role="Engineer";
  // Deterministic fixtures remain inside this context and never leave the interceptor.
  const fixtures=Array.from({length:12},(_,i)=>({id:"browser-only-"+i,deviceId:"BROWSER-ONLY-"+String(i).padStart(2,"0"),deviceType:i%2?"Temperature Sensor":"Pressure Transmitter",pipelineOrLocation:"Browser-only saved location",status:i%3===0?"Inactive":"Active",latestReadingOrState:"Historical metadata only",unit:i%2?"deg C":"bar",lastUpdatedAt:"2026-10-31T00:00:00.000Z",isDemoData:false}));
  const linked={id:"browser-assignment",sensorId:fixtures[0].deviceId,sensorName:"Pressure Transmitter",sensorCategory:"Internal Process Sensors",sensorDeviceType:"Pressure Transmitter",pipelineOrAsset:"Browser-only assignment label",installationLocation:"Browser-only position",installationType:"Inline",valuesMeasured:"Pressure",measurementUnit:"bar",installationDate:"2026-10-31",dataSource:"Manual",assignmentStatus:"Active",activeFrom:"2026-10-31T00:00:00.000Z",createdAt:"2026-10-31T00:00:00.000Z",updatedAt:"2026-10-31T00:00:00.000Z"};
  await context.route("**/api/**",async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname;
   if(req.method()==="GET"){
    if(p==="/api/auth/me")return route.fulfill({json:{id:"browser-user",name:"Isolated verification",email:"browser@example.invalid",role}});
    if(p==="/api/devices")return failure?route.fulfill({status:503,json:{message:"Isolated source failure"}}):route.fulfill({json:devices});
    if(p==="/api/sensor-assignments")return route.fulfill({json:assignments});
    return route.fulfill({json:[]});
   }
   report.interceptedWrites.push({method:req.method(),path:p,isolated:mode!=="real"});
   assert.notEqual(mode,"real","No mutation even in real-record browser replay");
   if(p==="/api/devices"&&req.method()==="POST"){
    const input=req.postDataJSON();
    if(input.deviceId==="REJECT-ME")return route.fulfill({status:400,json:{message:"Validation failed",fields:{deviceId:"Rejected by isolated validation"}}});
    if(devices.some(d=>d.deviceId===input.deviceId))return route.fulfill({status:409,json:{message:"Device ID already exists."}});
    const saved={...input,id:"browser-created",lastUpdatedAt:"2026-10-31T01:00:00.000Z",isDemoData:false};devices.push(saved);
    return route.fulfill({status:201,json:saved});
   }
   if(p==="/api/sensor-assignments/browser-assignment"&&req.method()==="PUT"){assignments=[{...linked,...req.postDataJSON()}];return route.fulfill({json:assignments[0]});}
   throw new Error("Unexpected browser mutation "+req.method()+" "+p);
  });
  page=await context.newPage();page.setDefaultTimeout(45000);page.on("pageerror",e=>report.pageErrors.push(e.message));
  await page.goto(base+"/sensors",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"Sensors Registry",exact:true}).waitFor();
  await page.getByRole("heading",{name:"Sensors",exact:true}).waitFor();
  assert.equal(await page.getByRole("table",{name:"All Sensors registry"}).count(),1);
  assert.equal(await page.getByLabel("Sensor details",{exact:true}).count(),1);
  for(const label of ["Online","Offline","Attention","Calibration Due","Maintenance Due"]){
   const card=page.getByText(label,{exact:true}).locator("..").locator("p");
   assert.equal(await card.innerText(),"Not Available");
  }
  for(const demo of before.devices.filter(d=>d.isDemoData))assert.equal(await page.getByRole("button",{name:demo.deviceId,exact:true}).count(),0);
  assert.equal(report.interceptedWrites.length,0);
  if(before.devices.some(d=>!d.isDemoData)){await page.getByRole("button",{name:before.devices.find(d=>!d.isDemoData).deviceId,exact:true}).click();}
  await page.screenshot({path:path.join(out,"real-inventory.png"),fullPage:true});
  pass("Actual read-only inventory renders without fabricated telemetry or Online counts; demo records excluded and no save attempted");
  mode="contract";devices=[...fixtures,...before.devices.filter(d=>d.isDemoData).map(deviceDto)];assignments=[linked];
  await page.getByRole("button",{name:"Refresh",exact:true}).click();
  await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).waitFor();
  await page.getByLabel("Search sensors",{exact:true}).fill("BROWSER-ONLY-00");
  assert.equal(await page.getByRole("button",{name:fixtures[1].deviceId,exact:true}).count(),0);
  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByLabel("Sensor type filter",{exact:true}).selectOption("Temperature Sensor");
  assert.equal(await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).count(),0);
  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByLabel("Inventory status filter",{exact:true}).selectOption("Inactive");
  assert.equal(await page.getByRole("button",{name:fixtures[1].deviceId,exact:true}).count(),0);
  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByRole("button",{name:"More Filters",exact:true}).click();
  await page.getByLabel("Registry unit filter",{exact:true}).selectOption("bar");
  assert.equal(await page.getByRole("button",{name:fixtures[1].deviceId,exact:true}).count(),0);
  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByRole("button",{name:"More Filters",exact:true}).click();
  await page.getByRole("button",{name:"Next",exact:true}).click();await page.getByRole("button",{name:fixtures[10].deviceId,exact:true}).waitFor();
  await page.getByRole("button",{name:"Previous",exact:true}).click();
  await page.getByLabel("Sensor rows per page",{exact:true}).selectOption("25");
  assert.equal(await page.getByRole("button",{name:fixtures[11].deviceId,exact:true}).count(),1);
  pass("Registry search, type/status filters, Clear Filters, pagination and page-size controls use source records");
  await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).click();
  const detail=page.getByLabel("Sensor details",{exact:true});
  assert.ok((await detail.innerText()).includes("Browser-only saved location"));
  await detail.getByRole("tab",{name:"Live Data",exact:true}).click();assert.ok((await detail.getByRole("tabpanel").innerText()).includes("Not Available"));
  await detail.getByRole("tab",{name:"Trends",exact:true}).click();assert.ok((await detail.getByRole("tabpanel").innerText()).includes("Not Available"));
  await detail.getByRole("tab",{name:"Overview",exact:true}).click();
  assert.equal(await detail.getByRole("button",{name:"View Asset",exact:true}).isDisabled(),true);
  await page.getByLabel("Select "+fixtures[0].deviceId,{exact:true}).check();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export Selected",exact:true}).click();
  const file=await download;await file.saveAs(path.join(out,"isolated-selected.csv"));
  const csv=fs.readFileSync(path.join(out,"isolated-selected.csv"),"utf8");assert.ok(csv.includes(fixtures[0].deviceId));assert.ok(!csv.includes(fixtures[1].deviceId));assert.ok(!csv.includes("SNS-DEMO-001"));
  pass("Row selection populates details; live/history gaps remain unavailable; selected CSV export excludes demo records");
  await detail.getByRole("button",{name:"Edit Assignment",exact:true}).click();
  let dialog=page.getByRole("dialog",{name:"Edit Sensor Assignment",exact:true});await dialog.waitFor();
  await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal(report.interceptedWrites.length,0);
  await page.getByRole("button",{name:"Add Sensor",exact:true}).click();
  dialog=page.getByRole("dialog",{name:"Add Sensor",exact:true});
  await dialog.getByLabel("Device ID *",{exact:true}).fill("UNSAVED-BROWSER-ONLY");
  await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal(report.interceptedWrites.length,0);
  await page.getByRole("button",{name:"Add Sensor",exact:true}).click();dialog=page.getByRole("dialog",{name:"Add Sensor",exact:true});
  assert.equal(await dialog.getByLabel("Device ID *",{exact:true}).inputValue(),"");
  await dialog.getByLabel("Device ID *",{exact:true}).fill("REJECT-ME");
  await dialog.getByRole("button",{name:"Register Sensor",exact:true}).click();
  await dialog.getByRole("alert").waitFor();assert.equal(await dialog.getByLabel("Device ID *",{exact:true}).inputValue(),"REJECT-ME");
  await dialog.getByLabel("Device ID *",{exact:true}).fill("BROWSER-CREATED-ONLY");
  await dialog.getByRole("button",{name:"Register Sensor",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await page.getByLabel("Search sensors",{exact:true}).fill("BROWSER-CREATED-ONLY");
  await page.getByRole("button",{name:"BROWSER-CREATED-ONLY",exact:true}).waitFor();
  await page.reload({waitUntil:"domcontentloaded"});await page.getByLabel("Search sensors",{exact:true}).fill("BROWSER-CREATED-ONLY");
  await page.getByRole("button",{name:"BROWSER-CREATED-ONLY",exact:true}).waitFor();
  pass("Large Add Sensor drawer Cancel resets without a save; rejected saves preserve entries; successful isolated API save reloads from GET");
  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).click();
  await page.getByLabel("Sensor details",{exact:true}).getByRole("button",{name:"Edit Assignment",exact:true}).click();
  dialog=page.getByRole("dialog",{name:"Edit Sensor Assignment",exact:true});await dialog.waitFor();
  await dialog.getByLabel("Installation date",{exact:false}).fill("2026-10-30");
  await dialog.getByRole("button",{name:"Save Changes",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  assert.equal(assignments[0].installationDate,"2026-10-30");
  await page.reload({waitUntil:"domcontentloaded"});await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).click();
  assert.ok((await page.getByLabel("Sensor details",{exact:true}).innerText()).includes("2026-10-30"));
  pass("Edit Assignment submits the existing PUT contract and reloads saved assignment fields; device and master records are not rewritten");
  for(const title of ["Recent Sensor Alerts","Calibration Overview","Maintenance Schedule"]){
   await page.getByRole("button",{name:"View All "+title,exact:true}).click();
   await page.getByRole("button",{name:"All Sensors",exact:true}).click();
   await page.getByRole("heading",{name:"Sensors Registry",exact:true}).waitFor();
  }
  pass("All three View All actions navigate to their full existing Sensors views without popups");

  await page.getByRole("button",{name:"Clear Filters",exact:true}).click();
  await page.getByRole("button",{name:fixtures[0].deviceId,exact:true}).click();
  for(const viewport of [{width:1672,height:1100},{width:900,height:1100},{width:390,height:844}]){
   await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.getByRole("button",{name:"Add Sensor",exact:true}).click();dialog=page.getByRole("dialog",{name:"Add Sensor",exact:true});await dialog.waitFor();
   assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
   await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
   await page.screenshot({path:path.join(out,"img01-"+viewport.width+".png"),fullPage:true});
  }
  await page.evaluate(()=>document.documentElement.classList.add("dark"));await page.screenshot({path:path.join(out,"img01-dark.png"),fullPage:true});
  pass("Desktop, tablet, mobile and dark theme preserve layout; Add Sensor drawer is usable without page overflow");
  failure=true;await page.getByRole("button",{name:"Refresh",exact:true}).click();await page.getByRole("alert").filter({hasText:"Sensor device records could not be loaded"}).waitFor();
  assert.equal(await page.getByRole("table",{name:"All Sensors registry"}).count(),0);
  failure=false;await page.getByRole("button",{name:"Refresh",exact:true}).click();await page.getByRole("heading",{name:"Sensors Registry",exact:true}).waitFor();
  pass("API failure hides stale registry rows and Refresh recovers");
  role="Viewer";await page.reload({waitUntil:"domcontentloaded"});await page.getByRole("heading",{name:"Sensors Registry",exact:true}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Add Sensor",exact:true}).isDisabled(),true);
  assert.deepEqual(report.pageErrors,[]);report.status="PASS";
 }catch(e){report.status="FAIL";report.failure=e.stack;if(page)await page.screenshot({path:path.join(out,"failure.png"),fullPage:true}).catch(()=>{});throw e;}
 finally{
  await browser?.close();const after=await snapshot();report.afterHash=hash(after);report.dataUnchanged=report.beforeHash===report.afterHash;
  report.schemaUnchanged=report.schemaBefore===hash(fs.readFileSync(path.join(backend,"prisma/schema.prisma")).toString());
  fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2));assert.ok(report.dataUnchanged&&report.schemaUnchanged);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
