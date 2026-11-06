const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
process.env.DATABASE_URL='';process.env.NODE_ENV='test';
const prisma=require('../../dist/lib/prisma');let realAccess=0;prisma.getPrismaClient=()=>{realAccess++;throw Error('REAL database access forbidden in DEMO test');};
const {store}=require('../../dist/data/store');for(const name of ['listDevices','createDevice','listAssets','findAssetById','findUserById','listPipelines'])store[name]=async()=>{realAccess++;throw Error('REAL store access forbidden');};
const fixtures=require('../../dist/sensorIngestionDemo/fixtures.json'),{createDemoSensorSession}=require('../../dist/sensorIngestionDemo/service');
const {sensorMessageSchema,ingestSensorMessage}=require('../../dist/sensorIngestion/service');
const {createSensorTcpServer}=require('../../dist/sensorIngestion/tcp'),{startSensorMqtt,handleMqttReading}=require('../../dist/sensorIngestion/mqtt'),{authenticateFrame}=require('../../dist/sensorIngestion/authentication');
const {scadaReadingSchema,normalizeScadaReading}=require('../../dist/validation/scadaReading');
const session=createDemoSensorSession(),token=crypto.randomBytes(32).toString('hex'),brokerPassword=crypto.randomBytes(32).toString('hex'),secrets={DEMO_SESSION_TOKEN:token};
const mappings=fixtures.sensors.map(sensor=>({id:sensor.id,userId:'demo:fixture-owner',connectorId:'demo:fixture-connector',pipelineId:fixtures.pipeline.id,deviceId:sensor.id,tagId:sensor.tagId,topic:'demo/pl002/'+sensor.id.split(':').at(-1),tokenEnv:'DEMO_SESSION_TOKEN'}));
const binding=sample=>mappings.find(row=>row.deviceId===sample.deviceId),message=sample=>{const {fixtureChannel,...payload}=sample;return payload;},envelope=sample=>({bindingId:binding(sample).id,token,message:message(sample)});
const mqttOptions={url:'mqtt://127.0.0.1:1',username:'demo-fixture-client',password:brokerPassword,clientId:'demo-fixture-'+crypto.randomBytes(8).toString('hex'),localTest:true,maxBytes:8192,mappings,secrets};
const closeServer=server=>server?.listening?new Promise(resolve=>server.close(resolve)):Promise.resolve();
async function run(){
 let tcp,http,mqtt,broker;const sockets=new Set();
 try{
  assert.equal(fixtures.dataMode,'DEMO');assert.deepEqual(fixtures,JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../frontend/src/fixtures/pl002-sensor-demo.json'),'utf8')));
  const first=message(fixtures.samples[0]);assert.equal(sensorMessageSchema.safeParse(first).success,false);
  await assert.rejects(ingestSensorMessage('API',mappings[0],first,{id:'demo:never-authorized',role:'Admin'}));assert.equal(realAccess,0);
  await assert.rejects(session.ingest('API',mappings[0],{...first,dataMode:'REAL'}));
  await assert.rejects(session.ingest('API',mappings[0],{...first,pipelineId:'PL-002'}));
  await assert.rejects(session.ingest('API',mappings[0],{...first,deviceId:'SNS-001'}));
  await assert.rejects(session.ingest('API',mappings[0],{...first,sourceChannel:'MQTT'}));
  await assert.rejects(session.ingest('API',mappings[0],{...first,reading:{...first.reading,engineeringUnit:'wrong-unit'}}));
  await assert.rejects(session.ingest('API',mappings[0],{...first,reading:{...first.reading,sourceTimestamp:'invalid'}}));
  assert.equal(scadaReadingSchema.safeParse({...first.reading,value:Infinity}).success,false);assert.equal(normalizeScadaReading(scadaReadingSchema.parse({...first.reading,value:'invalid'}),mappings[0].unit??'kPa').quality,'Bad');assert.equal(session.read().length,0);
  const express=require('express'),app=express();app.use(express.json({limit:'8kb'}));
  app.post('/demo/ingest',async(req,res)=>{try{if(req.headers.authorization!=='Bearer '+token)return res.status(401).json({error:'DEMO authentication required'});const {mapping,message}=authenticateFrame(req.body,mappings,secrets);const result=await session.ingest('API',mapping,message);res.status(result.rejectedReplay?409:200).json(result);}catch(error){res.status(error.status===400?400:401).json({error:'DEMO reading rejected'});}});
  http=app.listen(0,'127.0.0.1');await new Promise(resolve=>http.once('listening',resolve));
  const base=`http://127.0.0.1:${http.address().port}`,post=payload=>fetch(base+'/demo/ingest',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload)});
  for(const sample of fixtures.samples.filter(row=>row.fixtureChannel==='API'))assert.equal((await post(envelope(sample))).status,200);
  const apiSample=fixtures.samples.find(row=>row.fixtureChannel==='API');assert.equal((await post(envelope(apiSample))).status,409);assert.equal((await fetch(base+'/api/devices')).status,404);assert.equal((await fetch(base+'/demo/ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope(apiSample))})).status,401);
  tcp=createSensorTcpServer({host:'127.0.0.1',port:0,maxBytes:8192,timeoutMs:1000,maxConnections:4,mappings,secrets},session.ingest);await new Promise(resolve=>tcp.server.listen(0,'127.0.0.1',resolve));
  const send=raw=>new Promise((resolve,reject)=>{const socket=net.connect(tcp.server.address().port,'127.0.0.1'),chunks=[];socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Fixture TCP timeout'));});socket.on('error',error=>{if(error.code!=='ECONNRESET')reject(error);});socket.on('data',chunk=>chunks.push(chunk));socket.on('close',()=>resolve(Buffer.concat(chunks).toString()));socket.on('connect',()=>{socket.write(raw.slice(0,17));setTimeout(()=>socket.write(raw.slice(17)),10);});});
  for(const sample of fixtures.samples.filter(row=>row.fixtureChannel==='TCP'))assert.equal(JSON.parse(await send(JSON.stringify(envelope(sample))+'\n')).accepted,1);
  const tcpSample=fixtures.samples.find(row=>row.fixtureChannel==='TCP');assert.equal(JSON.parse(await send(JSON.stringify(envelope(tcpSample))+'\n')).rejectedReplay,true);
  const count=session.read().length;await send(JSON.stringify({...envelope(tcpSample),token:'invalid'.repeat(8)})+'\n');await send('x'.repeat(8193)+'\n');await send('{not-json}\n');assert.equal(session.read().length,count);
  const packets=require('mqtt-packet'),mqttSamples=fixtures.samples.filter(row=>row.fixtureChannel==='MQTT');let resolveAck,rejectAck,ackCount=0;const acked=new Promise((resolve,reject)=>{resolveAck=resolve;rejectAck=reject;});
  broker=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});const parser=packets.parser({protocolVersion:5});parser.on('error',rejectAck);socket.on('data',chunk=>parser.parse(chunk));
   const publish=index=>{const sample=mqttSamples[index];socket.write(packets.generate({cmd:'publish',qos:1,dup:false,retain:false,topic:binding(sample).topic,payload:JSON.stringify(envelope(sample)),messageId:100+index,properties:{}},{protocolVersion:5}));};
   parser.on('packet',packet=>{try{if(packet.cmd==='connect'){assert.equal(packet.username,'demo-fixture-client');assert.ok(packet.password.toString()===brokerPassword,'Fixture broker authentication failed');socket.write(packets.generate({cmd:'connack',reasonCode:0,sessionPresent:false,properties:{}},{protocolVersion:5}));}else if(packet.cmd==='subscribe'){assert.deepEqual(packet.subscriptions.map(row=>row.topic).sort(),mappings.map(row=>row.topic).sort());socket.write(packets.generate({cmd:'suback',messageId:packet.messageId,granted:packet.subscriptions.map(()=>1),properties:{}},{protocolVersion:5}));publish(0);}else if(packet.cmd==='puback'){ackCount++;if(ackCount===mqttSamples.length)resolveAck();else publish(ackCount);}}catch(error){rejectAck(error);}});
  });await new Promise(resolve=>broker.listen(0,'127.0.0.1',resolve));mqtt=startSensorMqtt({...mqttOptions,url:`mqtt://127.0.0.1:${broker.address().port}`},session.ingest);
  let timer;await Promise.race([acked,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Fixture MQTT timeout')),10000);})]).finally(()=>clearTimeout(timer));
  const mqttSample=mqttSamples[0];assert.equal((await handleMqttReading(mqttOptions,binding(mqttSample).topic,Buffer.from(JSON.stringify(envelope(mqttSample))),false,session.ingest)).rejectedReplay,true);
  await assert.rejects(handleMqttReading(mqttOptions,'foreign/topic',Buffer.from(JSON.stringify(envelope(mqttSample))),false,session.ingest));await assert.rejects(handleMqttReading(mqttOptions,binding(mqttSample).topic,Buffer.from(JSON.stringify(envelope(mqttSample))),true,session.ingest));
  const rows=session.read();assert.equal(rows.length,6);assert.equal(realAccess,0);for(const channel of ['MQTT','TCP','API'])assert.equal(rows.filter(row=>row.sourceChannel===channel).length,2);
  for(const row of rows){assert.equal(row.dataMode,'DEMO');assert.equal(row.pipelineId,'demo:pl-002');assert.ok(row.deviceId.startsWith('demo:'));assert.ok(row.receiveTimestamp);assert.ok(row.sourceTimestamp);assert.ok(row.unit);}
  assert.equal((await session.ingest('TCP',binding(apiSample),message(apiSample))).rejectedReplay,true);assert.equal(session.read().find(row=>row.sequence===apiSample.reading.sequence).sourceChannel,'API');
  const output=path.resolve(__dirname,'../../../artifacts/sensors-demo-flow');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({dataMode:'DEMO',fixtureOnly:true,realDatabaseCalls:realAccess,realRegistryWrites:0,publicListeners:0,channels:{MQTT:'PASS',TCP:'PASS',API:'PASS'},rows},null,2));
  session.reset();assert.equal(session.read().length,0);console.log('PASS MQTT/TCP/API DEMO: authenticated loopback wire tests, shared reading schema/quality, six ephemeral fixture samples, source-channel stamping, replay protection, malformed/auth/namespace/unit rejection, REAL rejection of DEMO, no REAL store/database calls and reset. No production credentials or saved pipeline/device data touched.');
 }finally{await mqtt?.close();await tcp?.close();for(const socket of sockets)socket.destroy();await closeServer(broker);await closeServer(http);session.reset();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
