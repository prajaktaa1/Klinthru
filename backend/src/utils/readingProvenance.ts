export type SourceChannel="API"|"MQTT"|"TCP";
export type IngestionIdentity={deviceId:string;pipelineId:string};
/** Transport is server-owned; original values and legacy scalar records are preserved. */
export function apiReadingPayload(value:unknown,connectorId:string,sourceChannel:SourceChannel="API",identity?:IngestionIdentity){
 return {version:1,value,provenance:{sourceChannel,dataMode:"REAL",connectorId,...identity}};
}
export function readingProvenance(raw:unknown,connectorId:string){
 const envelope=raw as ReturnType<typeof apiReadingPayload>|null;
 const p=envelope&&typeof envelope==="object"&&envelope.version===1?envelope.provenance:null;
 return p&&["API","MQTT","TCP"].includes(p.sourceChannel)&&p.dataMode==="REAL"&&p.connectorId===connectorId?{sourceChannel:p.sourceChannel,dataMode:"REAL" as const,deviceId:p.deviceId??null,pipelineId:p.pipelineId??null}:{sourceChannel:null,dataMode:null,deviceId:null,pipelineId:null};
}
