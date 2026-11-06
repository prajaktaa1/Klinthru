import type {DeviceRecord,SensorMasterLink,SensorAssignmentRecord} from "./types";
import type {resolveSensorTelemetry} from "./sensor-telemetry";
export const sensorDetailValue=(value:unknown):string=>typeof value==="string"&&value.trim()?value:typeof value==="number"&&Number.isFinite(value)?String(value):"Not Available";
export function savedSensorDetailRows(device:DeviceRecord,master:SensorMasterLink|undefined,assignment:SensorAssignmentRecord|undefined,telemetry:ReturnType<typeof resolveSensorTelemetry>|null){
 const hasReading=telemetry?.value!==null&&telemetry?.value!==undefined||Boolean(telemetry?.receivedAt);
 const channel=telemetry&&["MQTT","TCP","API"].includes(telemetry.channel)?telemetry.channel:null;
 const updated=Date.parse(device.lastUpdatedAt??"");
 return [["Sensor ID",device.deviceId],["Data Classification",device.isDemoData?"DEMO":"REAL"],["Type",device.deviceType],["Pipeline",master?.pipelineCode],["Segment",master?.segmentId],["Asset",master?.assetId],["KP",master?.kp],["Inventory Status",device.status],["Connectivity",hasReading?telemetry?.connectivity:null],["Channel",hasReading?channel:null],["Last Reading",telemetry?.value],["Reading Unit",telemetry?.unit],["Last Received",telemetry?.receivedAt],["Data Quality",telemetry?.quality],["Stored Location",device.pipelineOrLocation],["Registry Unit",device.unit],["Monitoring Point",master?.monitoringPoint],["Master Relationship Source",master?.provenance],["Assignment Installation Date",assignment?.installationDate],["Manufacturer / Serial Number",null],["Battery / Power",null],["Registry Updated",Number.isFinite(updated)?new Date(updated).toLocaleString():null],["Legacy Stored Reading / State",device.latestReadingOrState]].map(([label,value])=>[String(label),sensorDetailValue(value)] as const);
}
