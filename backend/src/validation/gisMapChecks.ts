import assert from 'node:assert/strict';
import { alignmentLength } from '../coreEngine/chainage/ChainageAgent';
process.env.NODE_ENV='test';process.env.DATABASE_URL='';process.env.SEED_ADMIN_PASSWORD='gis-test-password';
async function main() {
 const {initializeStorage}=await import('../data/store'); assert.equal(await initializeStorage(),'memory');
 const {createApp}=await import('../app'); const server=createApp().listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 try {
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@klinthru.local',password:'gis-test-password'})});assert.equal(login.status,200);const {token}=await login.json() as {token:string};
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 // Synthetic regression geometry is restricted to the in-memory test store.
 const route={type:'LineString' as const,coordinates:[[54,24],[54.01,24.02],[54.03,24.025]] as [number,number][]};const km=alignmentLength(route)/1000;
 const body={pipelineCode:'GIS-REGRESSION',pipelineName:'In-memory test only',pipeMaterial:'Carbon Steel',pipeGrade:'API 5L X52',pipeLengthKm:km,routeGeometry:route,status:'Active'};
 const write=async(data:unknown,method='POST',suffix='')=>fetch(base+'/api/pipelines'+suffix,{method,headers,body:JSON.stringify(data)});
 const created=await write(body);assert.equal(created.status,201,await created.clone().text());const p=await created.json() as {id:string};
 const load=async()=>{const response=await fetch(base+'/api/pipelines/'+p.id,{headers});assert.equal(response.status,200);return response.json() as Promise<{routeGeometry:unknown}>;};assert.deepEqual((await load()).routeGeometry,route);
 const reversed={...route,coordinates:[...route.coordinates].reverse()};assert.equal((await write({...body,routeGeometry:reversed},'PUT','/'+p.id)).status,200);assert.deepEqual((await load()).routeGeometry,reversed);
 for(const invalid of [{...body,pipeLengthKm:km*2},{...body,routeGeometry:{type:'LineString',coordinates:[[54,24],[55,25]]}},{...body,routeGeometry:{type:'LineString',coordinates:[[54,24],[181,24],[55,25]]}}]) assert.equal((await write(invalid,'PUT','/'+p.id)).status,400);
 assert.deepEqual((await load()).routeGeometry,reversed,'Rejected requests preserve the saved geometry');
 console.log('PASS GIS API create/save/reload, update/reload, invalid-coordinate and distance rejection; memory storage only.');
 } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
