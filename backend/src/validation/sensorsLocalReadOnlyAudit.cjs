const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const envFile=path.join(root,'backend/.env');
const configured={...(fs.existsSync(envFile)?require('dotenv').parse(fs.readFileSync(envFile)):{}),...process.env};
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({datasources:{db:{url:configured.DATABASE_URL}},log:[]});
async function run(){
 const snapshot=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const mode=await tx.$queryRawUnsafe('SHOW transaction_read_only');
  if(mode[0].transaction_read_only!=='on')throw Error('Read-only guard failed');
  const pipelines=await tx.$queryRawUnsafe(`SELECT id,"pipelineCode","pipelineName",status,"createdById" FROM "Pipeline" WHERE "pipelineCode" IN ('PL-001','PL-002') ORDER BY "pipelineCode"`);
  const ids=pipelines.map(row=>row.id);
  const segments=await tx.$queryRawUnsafe(`SELECT id,"pipelineId","segmentId",name,"startKp","endKp" FROM "Segment" WHERE "pipelineId"=ANY($1::text[])`,ids);
  const assets=await tx.$queryRawUnsafe(`SELECT id,"assetId","assetType",name,"pipelineId","segmentId",kp,"equipmentType","physicalStatus",latitude,longitude,coordinates,manufacturer,model,"serialNumber","installationDate",condition,description,"pressureRatingBar" FROM "Asset" WHERE "pipelineId"=ANY($1::text[]) AND "assetType"='SENSOR' ORDER BY "pipelineId","assetId"`,ids);
  const devices=await tx.$queryRawUnsafe(`SELECT id,"deviceId","deviceType","pipelineOrLocation",status,"isDemoData","authorId",unit,"latestReadingOrState","lastUpdatedAt" FROM "DeviceRecord" ORDER BY "deviceId"`);
  const assignments=await tx.$queryRawUnsafe(`SELECT id,"sensorId","sensorName","pipelineOrAsset","installationLocation","measurementUnit","assignmentStatus","activeFrom","activeTo","authorId" FROM "SensorAssignment" ORDER BY "sensorId"`);
  const tags=await tx.$queryRawUnsafe(`SELECT id,"pipelineId","assetId","connectorId","sensorAssignmentId","sourceTagName","sourceSystemId","engineeringUnit",active,"staleAfterSeconds" FROM "ScadaTag" WHERE "pipelineId"=ANY($1::text[]) ORDER BY "pipelineId",id`,ids);
  const connectors=await tx.$queryRawUnsafe(`SELECT id,name,"connectorType",enabled,status,"authorId",configuration->>'dataMode' AS "dataMode",configuration->'integrationScope' AS scope FROM "IntegrationConnector" ORDER BY id`);
  const users=await tx.$queryRawUnsafe(`SELECT id,role FROM "User" WHERE id=ANY($1::text[])`,[...new Set([...connectors.map(row=>row.authorId),...pipelines.map(row=>row.createdById)].filter(Boolean))]);
  const readings=await tx.$queryRawUnsafe(`SELECT DISTINCT ON ("tagId") "tagId","sourceTimestamp","receiveTimestamp",value,state,"engineeringUnit",quality,"rawValue"->'provenance'->>'sourceChannel' AS channel,"rawValue"->'provenance'->>'dataMode' AS "dataMode","rawValue"->'provenance'->>'deviceId' AS "deviceId","rawValue"->'provenance'->>'pipelineId' AS "pipelineId" FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) ORDER BY "tagId","sourceTimestamp" DESC,"receiveTimestamp" DESC`,tags.map(row=>row.id));
  return {checkedAt:new Date().toISOString(),readOnly:true,pipelines,segments,assets,devices,assignments,tags,connectors,users,readings};
 },{timeout:60000});
 snapshot.configuration={mqttEnabled:configured.SENSOR_MQTT_ENABLED==='true',tcpEnabled:configured.SENSOR_TCP_ENABLED==='true',mqttUrlPresent:!!configured.SENSOR_MQTT_URL,mqttUsernamePresent:!!configured.SENSOR_MQTT_USERNAME,mqttPasswordPresent:!!configured.SENSOR_MQTT_PASSWORD,mqttCaPathPresent:!!configured.SENSOR_MQTT_CA_FILE,mqttClientCertPathPresent:!!configured.SENSOR_MQTT_CERT_FILE,mqttClientKeyPathPresent:!!configured.SENSOR_MQTT_KEY_FILE,mqttBindingsPresent:!!configured.SENSOR_MQTT_BINDINGS,tcpBindingsPresent:!!configured.SENSOR_TCP_BINDINGS,tcpPortPresent:!!configured.SENSOR_TCP_PORT};
 const output=path.join(root,'artifacts/sensors-local-activation');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(snapshot,null,2));
 console.log(JSON.stringify(snapshot,null,2));
}
run().catch(error=>{console.error('Read-only sensor audit failed; code='+(error.code||error.name||'unknown')+'. No credentials logged.');process.exitCode=1;}).finally(()=>db.$disconnect());
