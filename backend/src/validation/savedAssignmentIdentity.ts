import {store} from "../data/store";
import {ownerScope} from "../lib/access";
import {createValidationError} from "./validationErrors";
import {savedSensorClassification,savedSensorRegistration} from "./sensorAssetRegistration";
import {validateDeviceUnitUpdate} from "./deviceUnitValidation";
import type {AuthUser,SensorAssignmentInput} from "../types/domain";
const parameters:Record<string,string>={"Pressure Transmitter":"Pressure","Pressure Relief Valve (PRV)":"Pressure","Temperature Sensor":"Temperature","Flow Meter":"Flow","Discharge Sensor":"Discharge","Level Switch":"Level","Flow Control Valve":"Valve position","CP Monitoring Module":"Pipe-to-soil potential"};
export async function validateSavedAssignmentIdentity(input:SensorAssignmentInput,user:AuthUser){
 const scope=ownerScope(user),devices=(await store.listDevices(scope)).filter(row=>row.deviceId===input.sensorId);
 const device=devices.length===1?devices[0]:null;
 if(!device||device.isDemoData||device.deviceId==="SNS-DEMO-001")throw createValidationError({sensorId:"A unique registered REAL device is required. DEMO and quarantined devices cannot receive operational assignments."});
 const match=/^([^/]+)\/([^/]+)\/\s*KP\s+([0-9]+(?:\.[0-9]+)?)\s*$/i.exec(device.pipelineOrLocation);
 const pipelines=(await store.listPipelines(scope)).filter(row=>row.pipelineCode===match?.[1].trim()&&row.status==="Active"),pipeline=pipelines.length===1?pipelines[0]:null;
 if(!pipeline)throw createValidationError({pipelineOrAsset:"Accessible active saved pipeline and valid device location required."});
 const [segments,assets]=await Promise.all([store.listSegments({pipelineId:pipeline.id,...scope}),store.listAssets({pipelineId:pipeline.id,...scope})]);
 const segment=segments.find(row=>row.segmentId===match?.[2].trim());
 const matches=assets.filter(row=>row.assetType==="SENSOR"&&row.assetId===device.deviceId&&row.segmentId===segment?.id&&Number(row.kp)===Number(match?.[3]));
 const asset=matches.length===1?matches[0]:null;
 if(!asset||!segment||savedSensorClassification(asset)!=="REAL")throw createValidationError({sensorId:"Unique eligible saved REAL sensor asset and segment required."});
 const location=await savedSensorRegistration({assetRecordId:asset.id,pipelineId:pipeline.id,segmentRecordId:segment.id,deviceId:device.deviceId,deviceType:device.deviceType,pipelineOrLocation:device.pipelineOrLocation},user);
 validateDeviceUnitUpdate({unit:device.unit},device.deviceType);
 const expected={sensorDeviceType:device.deviceType,sensorName:device.deviceType,sensorCategory:device.deviceType==="CP Monitoring Module"?"External Corrosion Sensors":"Internal Process Sensors",pipelineOrAsset:pipeline.pipelineCode,installationLocation:location,valuesMeasured:parameters[device.deviceType],measurementUnit:device.unit};
 for(const [field,value] of Object.entries(expected))if(!value||input[field as keyof SensorAssignmentInput]!==value)throw createValidationError({[field]:"Assignment must match saved device, pipeline, asset, unit and location metadata."});
 const date=new Date(`${input.installationDate}T00:00:00.000Z`);
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==input.installationDate)throw createValidationError({installationDate:"Valid installation date required."});
}
