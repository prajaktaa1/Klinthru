import {readFileSync} from "node:fs";
import {bindings,integer} from "./config";
import {createSensorTcpServer} from "./tcp";
import {startSensorMqtt} from "./mqtt";
/** No sockets, broker connections or secret reads when both flags are absent. */
export async function startSensorIngestionRuntime(settings:NodeJS.ProcessEnv=process.env){
 const running:Array<{close:()=>Promise<void>}>=[];
 try{
  if(settings.SENSOR_TCP_ENABLED==="true"){
   const tcp=createSensorTcpServer({host:settings.SENSOR_TCP_HOST??"127.0.0.1",port:integer(settings.SENSOR_TCP_PORT,0,1,65535),maxBytes:integer(settings.SENSOR_MAX_MESSAGE_BYTES,65536,1024,1048576),timeoutMs:integer(settings.SENSOR_TCP_TIMEOUT_MS,10000,100,60000),maxConnections:integer(settings.SENSOR_TCP_MAX_CONNECTIONS,16,1,100),mappings:bindings(settings.SENSOR_TCP_BINDINGS),secrets:settings});
   running.push(tcp);await new Promise<void>((resolve,reject)=>{tcp.server.once("error",reject);tcp.server.listen({host:settings.SENSOR_TCP_HOST??"127.0.0.1",port:Number(settings.SENSOR_TCP_PORT)},()=>resolve());});
  }
  if(settings.SENSOR_MQTT_ENABLED==="true"){
   const file=(name:string)=>settings[name]?readFileSync(settings[name]!):undefined;
   running.push(startSensorMqtt({url:settings.SENSOR_MQTT_URL??"",username:settings.SENSOR_MQTT_USERNAME,password:settings.SENSOR_MQTT_PASSWORD,ca:file("SENSOR_MQTT_CA_FILE"),cert:file("SENSOR_MQTT_CERT_FILE"),key:file("SENSOR_MQTT_KEY_FILE"),localTest:settings.NODE_ENV==="test"&&settings.SENSOR_MQTT_LOCAL_TEST==="true",clientId:settings.SENSOR_MQTT_CLIENT_ID??"klinthru-sensor-ingestion",maxBytes:integer(settings.SENSOR_MAX_MESSAGE_BYTES,65536,1024,1048576),mappings:bindings(settings.SENSOR_MQTT_BINDINGS),secrets:settings}));
  }
 }catch(error){for(const adapter of running.reverse())await adapter.close();throw Error("Sensor ingestion startup failed; check private configuration");}
 return {close:async()=>{for(const adapter of running.reverse())await adapter.close();}};
}
