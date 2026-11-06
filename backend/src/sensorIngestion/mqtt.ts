import {createValidationError,RequestValidationError} from "../validation/validationErrors";
import {connect,IClientOptions} from "mqtt";
import {Binding,type IngestionHandler,ingestMappedMessage} from "./service";
import {authenticateFrame,checkSecrets} from "./authentication";
import {loopback} from "./config";
export type MqttOptions={url:string;username?:string;password?:string;ca?:Buffer;cert?:Buffer;key?:Buffer;localTest:boolean;clientId:string;maxBytes:number;mappings:Binding[];secrets:Record<string,string|undefined>};
export function mqttClientOptions(options:MqttOptions):IClientOptions & {minVersion:"TLSv1.2"}{
 const url=new URL(options.url);
 if(url.username||url.password||!(["mqtts:","mqtt:"].includes(url.protocol)))throw Error("Use an MQTT URL without embedded credentials");
 if(url.protocol!=="mqtts:"&&!(options.localTest&&loopback(url.hostname)))throw Error("MQTT requires TLS outside explicit loopback tests");
 if(!(options.username&&options.password)&&!(options.cert&&options.key))throw Error("MQTT broker authentication is required");
 checkSecrets(options.mappings,options.secrets);
 const topics=options.mappings.map(row=>row.topic);
 if(topics.some(topic=>!topic||/[+#\0]/.test(topic))||new Set(topics).size!==topics.length)throw Error("MQTT requires unique exact device topics");
 return {protocolVersion:5,clientId:options.clientId,username:options.username,password:options.password,ca:options.ca,cert:options.cert,key:options.key,rejectUnauthorized:true,minVersion:"TLSv1.2",clean:false,connectTimeout:10000,reconnectPeriod:5000,queueQoSZero:false,resubscribe:false,properties:{maximumPacketSize:options.maxBytes+1024,receiveMaximum:1,sessionExpiryInterval:86400}};
}
export async function handleMqttReading(options:MqttOptions,topic:string,payload:Buffer,retained:boolean,ingest:IngestionHandler=ingestMappedMessage){
 if(retained||payload.length>options.maxBytes)throw createValidationError({message:"Retained or oversized sensor message rejected"});
 let authenticated:ReturnType<typeof authenticateFrame>;
 try{authenticated=authenticateFrame(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(payload)),options.mappings,options.secrets,topic);}catch{throw createValidationError({message:"Sensor authentication or message validation failed"});}
 const {mapping,message}=authenticated;
 return ingest("MQTT",mapping,message);
}
export function startSensorMqtt(options:MqttOptions,ingest:IngestionHandler=ingestMappedMessage){
 const client=connect(options.url,mqttClientOptions(options));let stopping=false;
 client.on("connect",()=>{client.subscribe(options.mappings.map(row=>row.topic!),{qos:1,rap:true,rh:2},error=>{if(error)console.error("Sensor MQTT subscription failed");});});
 // MQTT.js serializes handleMessage and PUBACK follows persistence. Rejected frames are acknowledged and discarded.
 client.handleMessage=(packet,done)=>{if(stopping){done();return;}void handleMqttReading(options,packet.topic,packet.payload as Buffer,packet.retain??false,ingest).then(()=>done(),error=>{if(error instanceof RequestValidationError){console.error("Sensor MQTT reading rejected");done();}else{console.error("Sensor MQTT persistence unavailable; retrying connection");client.stream.destroy();done(new Error("Sensor ingestion unavailable"));}});};
 client.on("error",()=>console.error("Sensor MQTT connection error"));
 return {close:async()=>{stopping=true;await client.endAsync(true);}};
}
