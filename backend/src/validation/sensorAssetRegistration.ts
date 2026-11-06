import {allowedDeviceTypes} from "./deviceValidation";
import {createValidationError} from "./validationErrors";
import {store} from "../data/store";
import {ownerScope} from "../lib/access";
import type {AuthUser,DeviceRecord} from "../types/domain";
const normalize=(value:string)=>value.trim().replace(/\s+/g," ").toLowerCase();
/** Explicit equipment aliases describe type only; they never establish physical identity. */
export function canonicalSensorDeviceType(equipment:string|undefined):DeviceRecord["deviceType"]|null{
 const value=normalize(equipment??"");
 const canonical=allowedDeviceTypes.find(type=>normalize(type)===value);if(canonical)return canonical;
 if(value==="hydrogen-compatible pressure transmitter")return "Pressure Transmitter";
 if(value==="rtd temperature transmitter (pt100)")return "Temperature Sensor";
 return null;
}
export function realSensorAssetBlockers(asset:{assetId:string;manufacturer?:string|null;description?:string|null}){
 const reasons:string[]=[];
 if(asset.assetId==="SNS-DEMO-001")reasons.push("SNS-DEMO-001 is quarantined until REAL/DEMO classification is approved.");
 if(/\bdemo\b/i.test(asset.manufacturer??"")||/\billustrative\b/i.test(asset.description??""))reasons.push("Saved asset metadata is DEMO or illustrative; verified replacement/evidence is required before REAL registration.");
 return reasons;
}
export function validateSavedSensorMatch(asset:{assetId:string;assetType:string;equipmentType?:string;manufacturer?:string|null;description?:string|null},deviceType:DeviceRecord["deviceType"],isDemoData=false){
 const blockers=isDemoData?(asset.assetId==="SNS-DEMO-001"?["SNS-DEMO-001 is quarantined pending classification."]:[]):realSensorAssetBlockers(asset);if(blockers.length)throw createValidationError({assetRecordId:blockers.join(" ")});
 if(asset.assetType!=="SENSOR"||canonicalSensorDeviceType(asset.equipmentType)!==deviceType)throw createValidationError({deviceType:"Device type must match an explicitly supported saved sensor equipment type."});
}
export async function savedSensorRegistration(input:{isDemoData?:boolean;assetRecordId:string;pipelineId:string;segmentRecordId:string;deviceId:string;deviceType:DeviceRecord["deviceType"];pipelineOrLocation:string},user:AuthUser){
 const scope=ownerScope(user),pipelines=await store.listPipelines(scope),pipeline=pipelines.find(row=>row.id===input.pipelineId);
 if(!pipeline)throw createValidationError({pipelineId:"Active accessible pipeline required."});
 const [segments,assets]=await Promise.all([store.listSegments({pipelineId:pipeline.id,...scope}),store.listAssets({pipelineId:pipeline.id,...scope})]);
 const segment=segments.find(row=>row.id===input.segmentRecordId&&row.pipelineId===pipeline.id);
 const asset=assets.find(row=>row.id===input.assetRecordId&&row.pipelineId===pipeline.id&&row.segmentId===segment?.id);
 if(!segment||!asset||asset.assetId!==input.deviceId)throw createValidationError({assetRecordId:"Saved pipeline, segment, sensor asset and device code must match."});
 validateSavedSensorMatch(asset,input.deviceType,input.isDemoData===true);
 const kp=asset.kp?.trim();if(!kp||!Number.isFinite(Number(kp)))throw createValidationError({assetRecordId:"Saved sensor KP is missing or invalid."});
 const location=/^([^/]+)\/([^/]+)\/\s*KP\s+([0-9]+(?:\.[0-9]+)?)\s*$/i.exec(input.pipelineOrLocation);
 if(!location||normalize(location[1])!==normalize(pipeline.pipelineCode)||normalize(location[2])!==normalize(segment.segmentId)||Number(location[3])!==Number(kp))throw createValidationError({pipelineOrLocation:"Location must match the selected saved sensor asset."});
 return `${pipeline.pipelineCode} / ${segment.segmentId} / KP ${kp}`;
}

/** Classification is derived only from saved metadata, never a client mode flag. */
export function savedSensorClassification(asset:{assetId:string;manufacturer?:string|null;model?:string|null;serialNumber?:string|null;description?:string|null}):"REAL"|"DEMO"|"REVIEW"{
 if(asset.assetId==="SNS-DEMO-001")return "REVIEW";
 if(/\bdemo\b/i.test(asset.manufacturer??"")||/\billustrative\b/i.test(asset.description??""))return "DEMO";
 if(!asset.manufacturer?.trim()||!asset.model?.trim()||!asset.serialNumber?.trim())return "REVIEW";
 return "REAL";
}
export async function prepareSavedSensorRegistration(input:Parameters<typeof savedSensorRegistration>[0]&{identityConfirmed?:boolean;status:string;latestReadingOrState:string;unit?:string},user:AuthUser){
 const assets=await store.listAssets({pipelineId:input.pipelineId,...ownerScope(user)});
 const asset=assets.find(row=>row.id===input.assetRecordId&&row.pipelineId===input.pipelineId);
 if(!asset)throw createValidationError({assetRecordId:"Accessible saved Sensor Asset required."});
 const classification=savedSensorClassification(asset);
 if(classification==="REVIEW")throw createValidationError({assetRecordId:"Saved identity metadata is incomplete or quarantined; classification review is required."});
 if(!input.unit?.trim())throw createValidationError({unit:"Engineering unit is required."});
 if(classification==="REAL"&&input.identityConfirmed!==true)throw createValidationError({identityConfirmed:"Operator confirmation of field identity, type, unit and inventory status against commissioning evidence is required."});
 if(classification==="DEMO"&&(input.status!=="Inactive"||input.latestReadingOrState!=="Not Available"))throw createValidationError({status:"Illustrative DEMO assets must be Inactive with no reading."});
 const isDemoData=classification==="DEMO";
 const pipelineOrLocation=await savedSensorRegistration({...input,isDemoData},user);
 return {isDemoData,pipelineOrLocation};
}
