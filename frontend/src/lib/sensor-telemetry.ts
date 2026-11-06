import type {DeviceRecord,SensorMasterLink,SensorAssignmentRecord} from "./types";
import type {ScadaTag} from "./apiClient";

/** Only an unambiguous saved asset AND active assignment may link a device to telemetry. */
export function resolveSensorTelemetry(device:DeviceRecord,link:SensorMasterLink|undefined,assignment:SensorAssignmentRecord|undefined,tags:ScadaTag[],now=Date.now()) {
 const unavailable={channel:"Unknown",connectivity:"Unknown",receivedAt:null as string|null,value:null as string|number|null,unit:null as string|null,quality:null as string|null};
 if(device.isDemoData||!link)return unavailable;
 const matches=tags.filter(tag=>tag.active&&tag.pipelineId===link.pipelineId&&tag.assetId===link.assetRecordId&&((tag.reading?.deviceId===device.deviceId&&tag.reading?.pipelineId===link.pipelineId)||Boolean(!tag.reading?.deviceId&&!tag.reading?.pipelineId&&assignment&&!assignment.activeTo&&assignment.sensorId===device.deviceId&&tag.sensorAssignmentId===assignment.id)));
 if(matches.length!==1)return unavailable;
 const tag=matches[0],reading=tag.reading;
 if(!reading||reading.dataMode!=="REAL")return unavailable;
 const received=Date.parse(reading.receiveTimestamp),source=Date.parse(reading.sourceTimestamp);
 const recent=Number.isFinite(received)&&received<=now&&now-received<=tag.staleAfterSeconds*1000&&source<=now+60000&&now-source<=tag.staleAfterSeconds*1000;
 const valid=reading.quality==="Good"&&reading.engineeringUnit===tag.engineeringUnit&&(typeof reading.value==="number"&&Number.isFinite(reading.value)||Boolean(reading.state));
 return {channel:reading.sourceChannel??"Unknown",connectivity:recent&&valid&&tag.freshness==="Live"?"Online (recent reading)":recent?"Unknown":"Stale",receivedAt:reading.receiveTimestamp,value:reading.value??reading.state,unit:reading.engineeringUnit,quality:reading.quality};
}
