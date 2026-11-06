import type {DeviceRecord,SensorMasterLink,SensorAssignmentInput} from "./types";
import {measurementUnits} from "./sensor-assignment-options";
const parameters:Record<string,string>={"Pressure Transmitter":"Pressure","Pressure Relief Valve (PRV)":"Pressure","Temperature Sensor":"Temperature","Flow Meter":"Flow","Discharge Sensor":"Discharge","Level Switch":"Level","Flow Control Valve":"Valve position","CP Monitoring Module":"Pipe-to-soil potential"};
export function assignmentMetadata(device:DeviceRecord,links:SensorMasterLink[],pipelineId:string){
 const candidates=links.filter(row=>row.sensorId===device.deviceId&&row.pipelineId===pipelineId),link=candidates.length===1?candidates[0]:undefined;
 const unitSets:Record<string,string[]>={"Pressure Transmitter":["bar","kPa","MPa","psi"],"Pressure Relief Valve (PRV)":["bar","kPa","MPa","psi"],"Temperature Sensor":["\u00b0C","\u00b0F","K","degC","degF"],"Flow Meter":["m3/h","m\u00b3/h","m\u00b3/s","L/min","L/s","kg/h","kg/s"],"Discharge Sensor":["m3/h","m\u00b3/h","m\u00b3/s","L/min","L/s","kg/h","kg/s"],"Level Switch":["state","State","%"],"Flow Control Valve":["%"],"CP Monitoring Module":["mV","V","mA"]};
 if(device.isDemoData||device.deviceId==="SNS-DEMO-001"||!link||!link.segmentId||!link.kp?.trim()||!Number.isFinite(Number(link.kp))||!device.unit||!measurementUnits.includes(device.unit)||!unitSets[device.deviceType]?.includes(device.unit))return null;
 const location=`${link.pipelineCode} / ${link.segmentId} / KP ${link.kp}`;
 if(device.pipelineOrLocation!==location||!parameters[device.deviceType])return null;
 return {link,snapshot:{sensorId:device.deviceId,sensorName:device.deviceType,sensorDeviceType:device.deviceType,sensorCategory:device.deviceType==="CP Monitoring Module"?"External Corrosion Sensors":"Internal Process Sensors",pipelineOrAsset:link.pipelineCode,installationLocation:location,valuesMeasured:parameters[device.deviceType],measurementUnit:device.unit,dataSource:"Other",notes:"Administrative assignment only; no ingestion source channel asserted."} satisfies Omit<SensorAssignmentInput,"installationType"|"installationDate"|"assignmentStatus">};
}
export function validAssignmentDate(value:string){const parsed=new Date(`${value}T00:00:00.000Z`);return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;}
