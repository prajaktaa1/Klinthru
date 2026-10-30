// GET-only Neon control-plane review. Never create snapshots/branches or perform restores.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const cli = path.join(process.env.APPDATA, "npm/node_modules/neonctl/bin/cli.js");
const directory = path.resolve(__dirname, "../../../artifacts/chainage/migration-review");
function read(args) {
  const result=spawnSync(process.execPath,[cli,...args,"--output","json","--no-analytics"],{encoding:"utf8",timeout:30000,windowsHide:true,env:{...process.env,CI:"true"}});
  if(result.status!==0) return {blocked:true,error:(result.stderr||result.error?.message||"Neon metadata unavailable").replace(/Bearer\s+\S+/gi,"Bearer [redacted]").slice(-1200)};
  try { return JSON.parse(result.stdout); } catch { return {blocked:true,error:"Neon CLI did not return parseable JSON."}; }
}
const projects=read(["projects","list"]);
const host=new URL(process.env.DATABASE_URL).hostname.replace("-pooler.",".");
let target=null;
const failures=[];
if(Array.isArray(projects)) for(const project of projects) {
  const endpoints=read(["api",`/projects/${project.id}/endpoints`,"--method","GET"]);
  if(endpoints.blocked) {failures.push({project:project.name,error:endpoints.error});continue;}
  const matched=(endpoints.endpoints||endpoints||[]).find(e=>e.host===host);
  if(matched) {target={project,endpoint:matched};break;}
}
if(!target) throw new Error("Could not positively match DATABASE_URL to a Neon project endpoint; no recovery readiness claim is safe.");
const projectId=target.project.id;
const branches=read(["branches","list","--project-id",projectId]);
const snapshots=read(["snapshots","list","--project-id",projectId]);
const branch=Array.isArray(branches)?branches.find(b=>b.id===target.endpoint.branch_id):null;
const safeBranch=b=>({id:b.id,name:b.name,parent_id:b.parent_id??null,parent_timestamp:b.parent_timestamp??null,created_at:b.created_at,updated_at:b.updated_at,state:b.current_state,protected:b.protected});
const safeSnapshot=s=>({id:s.id,name:s.name,branch_id:s.branch_id,created_at:s.created_at,expires_at:s.expires_at,lsn:s.lsn,timestamp:s.timestamp});
const snapshotRows=Array.isArray(snapshots)?snapshots:(snapshots.snapshots||[]);
const result={readOnly:true,project:{id:projectId,name:target.project.name,postgres_version:target.project.pg_version,history_retention_seconds:target.project.history_retention_seconds,history_retention_hours:target.project.history_retention_seconds/3600},endpoint:{id:target.endpoint.id,branch_id:target.endpoint.branch_id,hostMatched:true},target_branch:branch?safeBranch(branch):null,existing_branches:Array.isArray(branches)?branches.map(safeBranch):branches,snapshots:snapshots.blocked?snapshots:snapshotRows.map(safeSnapshot),backup_created:false,restore_executed:false,migration_executed:false,metadataFailures:failures,tooling:{pg_dump:"18.6 installed at C:/Program Files/PostgreSQL/18/bin/pg_dump.exe",pg_restore:"18.6 installed at C:/Program Files/PostgreSQL/18/bin/pg_restore.exe"}};
fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,"recovery-readiness.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
