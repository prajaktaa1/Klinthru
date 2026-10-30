/** UAE search UI probe; all application mutations are blocked at the browser boundary. */
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});assert.ok(new URL(process.env.DATABASE_URL).hostname.startsWith("ep-lucky-art-"));require("tsx/cjs");
const {PrismaClient}=require("@prisma/client"),{createApp}=require("../app.ts"),{signToken}=require("../lib/jwt.ts"),{disconnectPrisma}=require("../lib/prisma.ts");
async function main(){
 const db=new PrismaClient(),user=await db.$transaction(async tx=>{await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");return tx.user.findFirstOrThrow({where:{role:"Admin"},select:{id:true,email:true,role:true}});});
 const token=signToken({sub:user.id,email:user.email,role:user.role}),server=createApp().listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));const base=`http://127.0.0.1:${server.address().port}`;
 const {chromium}=require(path.resolve(__dirname,"../../../.scada-test-tools/node_modules/playwright")),browser=await chromium.launch({headless:true,channel:"msedge"});
 const report={status:"RUNNING",applicationWritesAllowed:false,google:"Not configured; user requested Esri fallback"};
 try{
  const context=await browser.newContext();await context.addInitScript(t=>localStorage.setItem("klinthru-auth-token",t),token);const page=await context.newPage();
  await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):4002\//,route=>route.request().method()==="GET"?route.continue({url:route.request().url().replace(/^https?:\/\/(localhost|127\.0\.0\.1):4002/,base)}):route.abort());
  await page.goto("http://localhost:4000/asset-master",{waitUntil:"domcontentloaded",timeout:120000});await page.getByRole("heading",{name:"Pipeline / Asset Master"}).waitFor({timeout:120000});await page.getByRole("button",{name:"Add Pipeline",exact:true}).click();const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Start location UAE search",{exact:true}).fill("Abu Dhabi");
  const request=page.waitForRequest(r=>r.url().startsWith("https://nominatim.openstreetmap.org/search"));await dialog.getByRole("button",{name:"Find",exact:true}).first().click();
  const q=new URL((await request).url());assert.equal(q.searchParams.get("countrycodes"),"ae");report.uaeCountryRestriction="PASS";
  await page.waitForFunction(()=>{const input=document.querySelector('[aria-label="Start location latitude"]'),alert=document.querySelector('[role="dialog"] [role="alert"]');return Boolean(input?.value)||Boolean(alert);},null,{timeout:20000});
  const lat=await dialog.getByLabel("Start location latitude",{exact:true}).inputValue(),lng=await dialog.getByLabel("Start location longitude",{exact:true}).inputValue();
  if(lat&&lng){assert.ok(Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180);report.status="PASS";report.liveUaeSearch="PASS: public provider returned a real UAE match";}else{report.status="BLOCKED";report.liveUaeSearch=await dialog.getByRole("alert").innerText();}
  await dialog.getByText("0 points",{exact:true}).waitFor();report.searchDoesNotGeneratePipelineGeometry="PASS";
 }catch(e){report.status="FAIL";report.error=e.message;process.exitCode=1;}
 finally{await browser.close();await new Promise(r=>server.close(r));await disconnectPrisma();await db.$disconnect();const directory=path.resolve(__dirname,"../../../artifacts/gis-editor");fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,"uae-search.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
