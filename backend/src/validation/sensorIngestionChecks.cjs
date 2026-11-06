const assert=require("node:assert/strict"),net=require("node:net");
const {createSensorTcpServer}=require("../../dist/sensorIngestion/tcp");
const {startSensorMqtt,mqttClientOptions,handleMqttReading}=require("../../dist/sensorIngestion/mqtt");
const {ingestMappedMessage}=require("../../dist/sensorIngestion/service");
const {startSensorIngestionRuntime}=require("../../dist/sensorIngestion/runtime");
module.exports=async function checks(db,call,store){
 const originalAsset=store.findAssetById,originalDevices=store.listDevices;
 let demo=false;
 store.findAssetById=async(id,scope)=>id==="test-asset"?{id,pipelineId:"test-pipeline",assetType:"SENSOR",assetId:"TEST-ASSET",physicalStatus:"Active"}:null;
 store.listDevices=async()=>[{id:"isolated-device-row",deviceId:"TEST-ASSET",isDemoData:demo}];
 const mapping={id:"isolated-binding",userId:"test-admin",connectorId:"test-connector",pipelineId:"test-pipeline",deviceId:"TEST-ASSET",tagId:"test-tag",tokenEnv:"ISOLATED_DEVICE_SECRET",topic:"isolated/pipeline/device"};
 const secret="isolated-test-secret-at-least-32-characters",secrets={ISOLATED_DEVICE_SECRET:secret};
 const message=sequence=>({dataMode:"REAL",pipelineId:mapping.pipelineId,deviceId:mapping.deviceId,tagId:mapping.tagId,reading:{tagId:mapping.tagId,sourceTimestamp:new Date().toISOString(),sourceTimezone:"UTC",sequence,engineeringUnit:"barg",quality:"Good",value:0}});
 const envelope=m=>JSON.stringify({bindingId:mapping.id,token:secret,message:m});
 const count=async()=>Number((await db.query('SELECT COUNT(*) AS n FROM "SharedTimeSeriesReading"')).rows[0].n);
 let tcp,mqtt,broker;const brokerSockets=new Set();
 try{
  const disabled=await startSensorIngestionRuntime({});await disabled.close();
  assert.throws(()=>createSensorTcpServer({host:"0.0.0.0",mappings:[mapping],secrets}),/loopback/);
  const mqttOptions={url:"mqtt://127.0.0.1:1",username:"isolated-user",password:"isolated-password",clientId:"isolated-sensor-test",localTest:true,maxBytes:4096,mappings:[mapping],secrets};
  assert.throws(()=>mqttClientOptions({...mqttOptions,url:"mqtt://broker.invalid"}),/TLS/);
  assert.throws(()=>mqttClientOptions({...mqttOptions,username:undefined,password:undefined}),/authentication/);
  assert.throws(()=>mqttClientOptions({...mqttOptions,mappings:[{...mapping,topic:"wildcard/#"}]}),/exact/);
  assert.equal(mqttClientOptions({...mqttOptions,url:"mqtts://broker.invalid"}).rejectUnauthorized,true);
  const apiMessage=message("isolated-api");let response=await call("/api/integrations/connectors/test-connector/sensor-ingestion","test-admin","POST",apiMessage);assert.equal(response.status,200,await response.text());
  assert.equal((await call("/api/integrations/connectors/test-connector/sensor-ingestion","test-admin","POST",apiMessage)).status,409);
  assert.equal((await call("/api/integrations/connectors/test-connector/sensor-ingestion","test-viewer","POST",apiMessage)).status,403);
  assert.equal((await ingestMappedMessage("TCP",mapping,apiMessage)).rejectedReplay,true,"Cross-channel replay cannot relabel API provenance");
  const beforeRejected=await count();
  await assert.rejects(ingestMappedMessage("MQTT",mapping,{...message("demo"),dataMode:"DEMO"}));
  await assert.rejects(ingestMappedMessage("MQTT",mapping,{...message("foreign"),pipelineId:"foreign"}));
  await assert.rejects(ingestMappedMessage("TCP",{...mapping,userId:"test-viewer"},message("viewer")));
  await assert.rejects(ingestMappedMessage("TCP",{...mapping,deviceId:"unregistered"},{...message("invalid-device"),deviceId:"unregistered"}));
  demo=true;await assert.rejects(ingestMappedMessage("TCP",mapping,message("demo-device")));demo=false;
  await assert.rejects(handleMqttReading(mqttOptions,"foreign/topic",Buffer.from(envelope(message("wrong-topic"))),false));
  await assert.rejects(handleMqttReading(mqttOptions,mapping.topic,Buffer.from(envelope(message("retained"))),true));
  await assert.rejects(handleMqttReading(mqttOptions,mapping.topic,Buffer.alloc(5000),false));
  await assert.rejects(handleMqttReading(mqttOptions,mapping.topic,Buffer.from(envelope(message("bad-auth")).replace(secret,"x".repeat(40))),false));
  assert.equal(await count(),beforeRejected,"Rejected messages must not persist");
  tcp=createSensorTcpServer({host:"127.0.0.1",port:0,maxBytes:4096,timeoutMs:5000,maxConnections:4,mappings:[mapping],secrets});
  await new Promise(resolve=>tcp.server.listen(0,"127.0.0.1",resolve));
  async function send(raw,fragment=false){return new Promise((resolve,reject)=>{const socket=net.connect(tcp.server.address().port,"127.0.0.1"),chunks=[];socket.setTimeout(6000,()=>{socket.destroy();reject(Error("Test TCP timeout"));});socket.on("error",error=>{if(error.code!=="ECONNRESET")reject(error);});socket.on("data",chunk=>chunks.push(chunk));socket.on("close",()=>resolve(Buffer.concat(chunks).toString()));socket.on("connect",()=>{if(fragment){socket.write(raw.slice(0,10));setTimeout(()=>socket.write(raw.slice(10)),20);}else socket.write(raw);});});}
  const tcpMessage=message("isolated-tcp");assert.equal(JSON.parse(await send(envelope(tcpMessage)+"\n",true)).accepted,1);
  assert.equal(JSON.parse(await send(envelope(tcpMessage)+"\n")).rejectedReplay,true);
  const beforeTcpReject=await count();await send("x".repeat(4097));await send("not json\n");await send(envelope(message("tcp-bad-auth")).replace(secret,"x".repeat(40))+"\n");await send(envelope(message("two"))+"\n"+envelope(message("two-more"))+"\n");assert.equal(await count(),beforeTcpReject);
  await tcp.close();tcp=createSensorTcpServer({host:"127.0.0.1",port:0,maxBytes:4096,timeoutMs:100,maxConnections:1,mappings:[mapping],secrets});await new Promise(resolve=>tcp.server.listen(0,"127.0.0.1",resolve));
  assert.equal(await send("{partial"),"","Partial frames must time out");await tcp.close();tcp=null;
  // Minimal MQTT 5 broker fixture exercises the actual MQTT.js wire subscriber, CONNECT authentication, SUBSCRIBE and PUBACK.
  const packets=require("mqtt-packet");let resolveAck,rejectAck;const acknowledged=new Promise((resolve,reject)=>{resolveAck=resolve;rejectAck=reject;});
  const mqttMessage=message("isolated-mqtt");
  broker=net.createServer(socket=>{brokerSockets.add(socket);socket.on("error",()=>{});socket.on("close",()=>brokerSockets.delete(socket));const parser=packets.parser({protocolVersion:5});parser.on("error",rejectAck);socket.on("data",chunk=>parser.parse(chunk));parser.on("packet",packet=>{try{if(packet.cmd==="connect"){assert.equal(packet.username,"isolated-user");assert.equal(packet.password.toString(),"isolated-password");socket.write(packets.generate({cmd:"connack",reasonCode:0,sessionPresent:false,properties:{}},{protocolVersion:5}));}else if(packet.cmd==="subscribe"){assert.equal(packet.subscriptions[0].topic,mapping.topic);socket.write(packets.generate({cmd:"suback",messageId:packet.messageId,granted:[1],properties:{}},{protocolVersion:5}));socket.write(packets.generate({cmd:"publish",topic:mapping.topic,payload:envelope(mqttMessage),qos:1,messageId:42,retain:false,dup:false,properties:{}},{protocolVersion:5}));}else if(packet.cmd==="puback")resolveAck();}catch(error){rejectAck(error);}});});
  await new Promise(resolve=>broker.listen(0,"127.0.0.1",resolve));mqtt=startSensorMqtt({...mqttOptions,url:`mqtt://127.0.0.1:${broker.address().port}`});
  let timer;await Promise.race([acknowledged,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("MQTT wire test timeout")),10000);})]).finally(()=>clearTimeout(timer));
  for(const [sequence,channel]of[["isolated-api","API"],["isolated-tcp","TCP"],["isolated-mqtt","MQTT"]]){const row=(await db.query('SELECT * FROM "SharedTimeSeriesReading" WHERE sequence=$1',[sequence])).rows[0];assert.ok(row);assert.equal(row.value,0);assert.equal(row.engineeringUnit,"barg");assert.equal(row.quality,"Good");assert.ok(row.receiveTimestamp);assert.equal(row.rawValue.provenance.sourceChannel,channel);assert.equal(row.rawValue.provenance.deviceId,mapping.deviceId);assert.equal(row.rawValue.provenance.pipelineId,mapping.pipelineId);}
  const replay=await ingestMappedMessage("MQTT",mapping,mqttMessage);assert.equal(replay.rejectedReplay,true);
  const result=await (await call("/api/scada/overview?pipelineId=test-pipeline")).json();assert.ok(result.tags.some(tag=>tag.reading?.deviceId===mapping.deviceId&&["API","MQTT","TCP"].includes(tag.reading?.sourceChannel)));
  console.log("PASS MQTT: actual loopback MQTT5 CONNECT/auth/subscription/publish/PUBACK -> PostgreSQL; TLS configuration, topic/auth/retained/size/demo/pipeline rejection and replay. PASS TCP: actual loopback fragmented NDJSON -> PostgreSQL, auth, sizes, framing, deadlines, replay. PASS API: authenticated shared ingestion -> PostgreSQL, provenance and 409 replay. Both runtime channels disabled by default.");
 }finally{await mqtt?.close();await tcp?.close();for(const socket of brokerSockets)socket.destroy();if(broker?.listening)await new Promise(resolve=>broker.close(resolve));store.findAssetById=originalAsset;store.listDevices=originalDevices;}
};
