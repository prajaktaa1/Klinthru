/** Read-only injected reporting API checks; no storage initialization, DB access or report generation. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
async function run() {
  const express = (await import("express")).default;
  const { reportsRouter } = await import("../routes/reports");
  const { store } = await import("../data/store");
  const { signToken } = await import("../lib/jwt");
  const user = {id:"isolated-report-owner",name:"Isolated actor",email:"actor@example.invalid",role:"Engineer" as const,passwordHash:"not-used",createdAt:new Date().toISOString()};
  const original = {findUserById:store.findUserById,findPipelineById:store.findPipelineById,listAssessments:store.listAssessments,listReports:store.listReports,listCpCalculations:store.listCpCalculations};
  store.findUserById = async id => id===user.id ? user : null;
  store.findPipelineById = async (id,scope) => {
    assert.ok(JSON.stringify(scope).includes(user.id),"Original owner scope must reach native repository");
    return id==="isolated-pipeline" ? {id,pipelineCode:"isolated",pipelineName:"Isolated test subject",status:"Active"} as NonNullable<Awaited<ReturnType<typeof store.findPipelineById>>> : null;
  };
  store.listAssessments = async () => [];
  store.listReports = async () => [];
  store.listCpCalculations = async () => [];
  const app=express();app.use("/api/reports",reportsRouter);const server=createServer(app);
  try {
    await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reports/workspace-data/`;
    assert.equal((await fetch(base+"isolated-pipeline")).status,401);
    const headers={Authorization:`Bearer ${signToken({sub:user.id,role:user.role,email:user.email})}`};
    assert.equal((await fetch(base+"unavailable-subject",{headers})).status,404);
    const response=await fetch(base+"isolated-pipeline",{headers});assert.equal(response.status,200);
    const body=await response.json() as {pipeline:{data:{id:string}};aiPredictions:{status:string;source:string;reason:string};existingReports:{count:number;recent:unknown[]}};
    assert.equal(body.pipeline.data.id,"isolated-pipeline");assert.equal(body.aiPredictions.status,"blocked");
    assert.equal(body.aiPredictions.source,"AIPredictionsReadiness");assert.equal(body.aiPredictions.reason,"readiness_only_no_prediction_results_returned");
    assert.equal(body.existingReports.count,0);assert.deepEqual(body.existingReports.recent,[]);
    console.log("AI IMG-09 reporting GET PASS: authentication, owner scope, unavailable pipeline404, exact response identity and explicit readiness-only AI block. Injected empty readers only; no DB/storage/report generation.");
  } finally { Object.assign(store,original);await new Promise<void>(resolve=>server.close(()=>resolve())); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
