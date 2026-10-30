/** Isolated development contract tests. No DB/storage initialization, model execution or seeds. */
import assert from "node:assert/strict";
process.env.DATABASE_URL = ""; process.env.NODE_ENV = "test";
import { AiContractError, type Json } from "../aiPredictions/contracts";
import { canonicalJson, immutableJson, manifestHash, verifyHash } from "../aiPredictions/integrity";
import { authorizeAi, type AiGrant } from "../aiPredictions/permissions";
import { captureAiSnapshot, type ResolvedSource } from "../aiPredictions/snapshotService";
import { prepareScenario } from "../aiPredictions/scenarioService";
import { validateHumanPromotion, candidateRetrainingPurpose, type ModelEvidence } from "../aiPredictions/modelGovernance";
import { createAtomicRunReservationStore, type ReservationDatabase } from "../aiPredictions/runRepository";
import { reserveAiRun, type RunFingerprint } from "../aiPredictions/idempotency";
import { prepareAiRun, type RunEvidence } from "../aiPredictions/runService";
import type { AuthUser } from "../types/domain";

const user: AuthUser = { id: "isolated-owner", name: "Isolated actor", email: "actor@example.invalid", role: "Admin" };
const now = new Date("2026-10-21T00:00:00Z");
const grant: AiGrant = { userId: user.id, pipelineId: "isolated-pipeline", actions: ["read","run","promote"],
  policyVersion: "isolated-policy", approvedById: "independent-grant-reviewer", validFrom: "2026-01-01", expiresAt: "2027-01-01" };
const failure = (code: string) => (e: unknown) => e instanceof AiContractError && e.code === code;
async function run() {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  assert.equal(manifestHash({ b: 2, a: 1 }), manifestHash({ a: 1, b: 2 }));
  for (const bad of [NaN, Infinity, undefined, new Date(), [undefined], new Array(2)]) assert.throws(() => canonicalJson(bad));
  const cyclic: unknown[] = []; cyclic.push(cyclic); assert.throws(() => canonicalJson(cyclic));
  const original = { features: { native: 1 } }, frozen = immutableJson(original); original.features.native = 2;
  assert.equal((frozen as typeof original).features.native, 1); assert.ok(Object.isFrozen(frozen.features));
  assert.throws(() => verifyHash({ changed: true }, manifestHash(frozen)), failure("integrity_mismatch"));
  assert.throws(() => authorizeAi(user,"read",grant.pipelineId,[],now), failure("ai_permission_denied"));
  for (const change of [{ pipelineId: "other" },{ revokedAt: "2026-01-01" },{ expiresAt: "2025-01-01" },{ approvedById: user.id },{ actions: [] }])
    assert.throws(() => authorizeAi(user,"read",grant.pipelineId,[{...grant,...change}],now));
  assert.equal(authorizeAi(user,"read",grant.pipelineId,[grant],now),grant);
  const reference = { sourceModule: "ILI", sourceType: "IliAnomaly", sourceRecordId: "isolated-anomaly", sourceRevision: "isolated-revision" };
  const content = { ...reference, pipelineId: grant.pipelineId, observedAt: "2026-01-01", availableAt: "2026-01-02", values: { depth: 1 }, units: { depth: "mm" }, quality: { source: "isolated" } };
  const source: ResolvedSource = { ...content, sourceHash: manifestHash(content), revisionVerified: true };
  const input = { user, pipelineId: grant.pipelineId, cutoffAt: "2026-02-01", capturedAt: now.toISOString(), modelVersionId: "isolated-model-version",
    configurationRevisionId: "isolated-config", featureSetVersion: "isolated-features", featureSchemaVersion: "isolated-schema", featureValues: { depth: 1 }, sources: [reference] };
  const snapshot = await captureAiSnapshot(input, async () => source); verifyHash(snapshot.manifest,snapshot.contentHash);
  await assert.rejects(captureAiSnapshot(input,async () => null),failure("source_unavailable"));
  await assert.rejects(captureAiSnapshot(input,async () => ({...source,availableAt:"2026-03-01"})),failure("future_source"));
  await assert.rejects(captureAiSnapshot(input,async () => ({...source,observedAt:"2026-03-01"})),failure("future_source"));
  await assert.rejects(captureAiSnapshot(input,async () => ({...source,sourceRevision:"other"})),failure("source_unavailable"));
  await assert.rejects(captureAiSnapshot(input,async () => ({...source,values:{depth:9}})),failure("integrity_mismatch"));
  await assert.rejects(captureAiSnapshot({...input,sources:[reference,reference]},async () => source),failure("duplicate_source"));
  const policy = { approved:true,version:"isolated-only",parameters:{pressure:{unit:"isolated-unit",minimum:1,maximum:2}} };
  assert.throws(() => prepareScenario(snapshot,{pressure:{value:1,unit:"isolated-unit"}},null),failure("scenario_policy_missing"));
  const scenario=prepareScenario(snapshot,{pressure:{value:1,unit:"isolated-unit"}},policy);
  assert.equal(scenario.simulated,false); assert.notEqual(scenario.contentHash,snapshot.contentHash); verifyHash(snapshot.manifest,snapshot.contentHash);
  const invalidParameters: Array<Record<string,{value:number;unit:string}>> = [{pressure:{value:3,unit:"isolated-unit"}},{pressure:{value:1,unit:"different"}},{unknown:{value:1,unit:"isolated-unit"}}];
  for (const p of invalidParameters) assert.throws(() => prepareScenario(snapshot,p,policy));
  const evidence: ModelEvidence = { modelVersionId:"isolated-version",validationModelVersionId:"isolated-version",pipelineId:grant.pipelineId,
    candidateCreatedById:"candidate-actor",validatedById:"validation-actor",validationId:"isolated-validation",passed:true,qualityPassed:true,
    benchmarkVersion:"isolated-benchmark",artifactHash:manifestHash({artifact:"test-only"}),validationArtifactHash:manifestHash({artifact:"test-only"}),
    evidenceDocumentVersionId:"isolated-evidence",lifecycle:"Approved",sequence:2 };
  const decision={expectedSequence:2,validationId:evidence.validationId,evidenceDocumentVersionId:evidence.evidenceDocumentVersionId,reason:"Isolated control test"};
  assert.equal(validateHumanPromotion(user,[grant],evidence,decision,now).action,"promote");
  assert.throws(() => validateHumanPromotion(user,[grant],{...evidence,candidateCreatedById:user.id},decision,now),failure("independent_approval_required"));
  assert.throws(() => validateHumanPromotion(user,[grant],{...evidence,validatedById:user.id},decision,now),failure("independent_approval_required"));
  assert.throws(() => validateHumanPromotion(user,[grant],{...evidence,passed:false},decision,now),failure("promotion_evidence_missing"));
  assert.throws(() => validateHumanPromotion(user,[grant],{...evidence,validationModelVersionId:"other"},decision,now),failure("promotion_evidence_missing"));
  assert.throws(() => validateHumanPromotion(user,[grant],evidence,{...decision,expectedSequence:1},now),failure("governance_conflict"));
  assert.equal(candidateRetrainingPurpose(),"candidate-validation");

  // Serialized in-memory transaction port exercises contract retries; not a PostgreSQL concurrency claim.
  const requests: any[] = [], keys: any[] = []; let serial=Promise.resolve(), transactions=0;
  const database: ReservationDatabase = { $transaction(fn,options) {
    assert.equal(options.isolationLevel,"Serializable"); transactions++;
    const task=serial.then(()=>fn({ aiRunKey:{async findUnique(a:any){const q=a.where.ownerId_requestKey;const k=keys.find(k=>k.ownerId===q.ownerId&&k.requestKey===q.requestKey);return k?{...k,request:requests.find(r=>r.id===k.requestId)}:null;},async create(a:any){keys.push(a.data);return a.data;}},
      aiRunRequest:{async findUnique(a:any){const q=a.where.ownerId_fingerprint;return requests.find(r=>r.ownerId===q.ownerId&&r.fingerprint===q.fingerprint)??null;},async create(a:any){const row={...a.data,id:`isolated-request-${requests.length}`,run:null};requests.push(row);return row;}} }));
    serial=task.then(()=>undefined,()=>undefined);return task;
  } };
  const store=createAtomicRunReservationStore(database,user.id);
  const manifest: RunFingerprint={ownerId:user.id,pipelineId:grant.pipelineId,snapshotHash:snapshot.contentHash,modelVersionId:input.modelVersionId,
    artifactHash:evidence.artifactHash,featureSetVersion:input.featureSetVersion,configurationRevisionId:input.configurationRevisionId,predictionType:"isolated-type",
    horizon:{unit:"isolated",value:1},parameters:{},purpose:"prediction",executionManifest:{version:"isolated"},scenarioBaseline:null};
  const reservations=await Promise.all([reserveAiRun(store,"key-a",manifest),reserveAiRun(store,"key-a",manifest),reserveAiRun(store,"key-b",manifest)]);
  assert.equal(new Set(reservations.map(r=>r.requestId)).size,1);assert.equal(requests.length,1);assert.equal(keys.length,2);
  await assert.rejects(reserveAiRun(store,"key-b",{...manifest,parameters:{changed:true}}),failure("idempotency_conflict"));
  await reserveAiRun(store,"key-c",{...manifest,parameters:{changed:true}});assert.equal(requests.length,2);assert.ok(transactions>=5);
  const runEvidence:RunEvidence={pipelineId:grant.pipelineId,ownerId:user.id,nativePipelineAccess:true,sourcesAuthorized:true,
    snapshotId:"isolated-snapshot",snapshot:snapshot.manifest as Json,snapshotHash:snapshot.contentHash,snapshotModelVersionId:input.modelVersionId,snapshotConfigurationRevisionId:input.configurationRevisionId,
    modelVersionId:input.modelVersionId,lifecycle:"Approved",artifactHash:evidence.artifactHash,artifactVerified:true,artifactDocumentApproved:true,
    configurationRevisionId:input.configurationRevisionId,configurationApproved:true,featureSetVersion:input.featureSetVersion,methodologyVersion:"isolated-method",
    inputSchemaVersion:"isolated-input",validateInput:()=>true,validateRequest:()=>true};
  const runInput={pipelineId:grant.pipelineId,modelVersionId:input.modelVersionId,configurationRevisionId:input.configurationRevisionId,snapshotId:"isolated-snapshot",
    predictionType:manifest.predictionType,horizon:manifest.horizon,parameters:manifest.parameters,executionManifest:manifest.executionManifest};
  await prepareAiRun(user,[grant],runEvidence,runInput,"preflight",store,now);
  const count=requests.length;
  for(const patch of [{lifecycle:"Validation"},{artifactVerified:false},{configurationApproved:false},{methodologyVersion:null},{validateRequest:()=>false}])
    await assert.rejects(prepareAiRun(user,[grant],{...runEvidence,...patch},runInput,"blocked",store,now));
  assert.equal(requests.length,count,"Rejected model inputs cannot reserve a run");
  await apiChecks();
  console.log("AI development PASS: finite immutable hashes, exact cutoff/revision/ACL, explicit grants, approved run preflight, durable retry aliases, independent promotion, hypothetical-only clone and authenticated fail-closed APIs. No DB, seeds, forecasts, simulator or model executed.");
}

async function apiChecks() {
  const express=(await import("express")).default;
  const {createServer}=await import("node:http");const{store}=await import("../data/store");const{signToken}=await import("../lib/jwt");
  const{createAiDevelopmentRouter}=await import("../aiPredictions/developmentRoutes");
  const{createAiResultsRepository}=await import("../aiPredictions/resultsRepository");
  const sqlCalls: Array<{sql:string;values:unknown[]}>=[];
  const fixtureDatabase={async $queryRawUnsafe<T>(sql:string,...values:unknown[]):Promise<T>{
    assert.ok(sql.startsWith("SELECT "));sqlCalls.push({sql,values});
    return (sql.includes("to_jsonb")?[{item:{id:"isolated-record",ownerId:user.id,pipelineId:grant.pipelineId,runId:"isolated-run"}}]:
      sql.includes('FROM public."AiModelRun"')?[{snapshotId:"isolated-snapshot"}]:[{sourceRecordId:"isolated-source",sourceRevision:"isolated-revision"}]) as T;
  }};
  await assert.rejects(createAiResultsRepository(()=>fixtureDatabase,async()=>false).read("results",user,grant.pipelineId),failure("ai_source_access_unavailable"));
  const saved=await createAiResultsRepository(()=>fixtureDatabase,async(_u,p,s)=>p===grant.pipelineId&&s[0].sourceRecordId==="isolated-source").read("results",user,grant.pipelineId);
  assert.equal(saved.items.length,1);assert.ok(sqlCalls[0].sql.includes('t."ownerId" = $1')&&sqlCalls[0].sql.includes('t."pipelineId" = $2'));
  assert.deepEqual(sqlCalls[0].values,[user.id,grant.pipelineId]);
  const original=store.findUserById;store.findUserById=async id=>id===user.id?{...user,passwordHash:"not-used",createdAt:now.toISOString()}:null;
  let databaseCalls=0;
  const repository=createAiResultsRepository(()=>{databaseCalls++;return null;},async()=>false);
  const app=express();app.use(express.json());app.use("/default",createAiDevelopmentRouter());
  app.use("/granted",createAiDevelopmentRouter({grants:async()=>[grant],pipelineAccess:async(_u,p)=>p===grant.pipelineId,repository,now:()=>now}));
  const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const base=`http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
    const headers={Authorization:`Bearer ${signToken({sub:user.id,role:user.role,email:user.email})}`,"Content-Type":"application/json","Idempotency-Key":"isolated-http-key"};
    assert.equal((await fetch(base+"/default/results?pipelineId="+grant.pipelineId)).status,401);
    const denied=await fetch(base+"/default/results?pipelineId="+grant.pipelineId,{headers});assert.equal(denied.status,403);assert.equal(denied.headers.get("cache-control"),"private, no-store");
    assert.equal(databaseCalls,0);
    assert.equal((await fetch(base+"/granted/results?pipelineId="+grant.pipelineId,{headers})).status,503);assert.equal(databaseCalls,1);
    assert.equal((await fetch(base+"/granted/results?pipelineId="+grant.pipelineId+"&unapproved=1",{headers})).status,400);
    const body={pipelineId:grant.pipelineId,modelVersionId:"isolated",configurationRevisionId:"isolated",snapshotId:"isolated",predictionType:"isolated",horizon:{},parameters:{}};
    const locked=await fetch(base+"/granted/runs",{method:"POST",headers,body:JSON.stringify(body)});assert.equal(locked.status,423);assert.equal(databaseCalls,1);
    assert.equal((await fetch(base+"/granted/runs",{method:"POST",headers,body:JSON.stringify({...body,outputs:[123]})})).status,400);
  }finally{store.findUserById=original;await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
