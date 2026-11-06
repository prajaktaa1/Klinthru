import {resolveConnectorScope,type ConnectorScopeDatabase} from "./scope";
import {store} from "../data/store";
import {ownerScope} from "../lib/access";
import {createValidationError} from "../validation/validationErrors";
import {savedSensorClassification,savedSensorRegistration} from "../validation/sensorAssetRegistration";
import {validateDeviceUnitUpdate} from "../validation/deviceUnitValidation";
import type {AuthUser} from "../types/domain";
import type {ConnectorInput,ConnectorRecord} from "./types";
export const LOCAL_INBOUND="LOCAL_INBOUND_SENSOR_API";
export function inboundIdentity(connector:{configuration:unknown}){const config=connector.configuration as {connectorMode?:string;inboundSensor?:{deviceId:string;deviceRecordId:string;pipelineId:string;assetId:string}}|null;return config?.connectorMode===LOCAL_INBOUND?config.inboundSensor??null:null;}
export function isLocalInbound(connector:{configuration:unknown}){return (connector.configuration as {connectorMode?:string}|null)?.connectorMode===LOCAL_INBOUND;}
export async function prepareLocalInbound(input:ConnectorInput,user:AuthUser,configuration:Record<string,unknown>|null|undefined,environment:string){
 if(environment!=="development")throw createValidationError({mode:"Local inbound connector creation is available only in DEVELOPMENT."});
 const scoped=configuration?.integrationScope as {companyId?:string;pipelineId?:string;assetId?:string}|undefined;
 if(!user.companyId||scoped?.companyId!==user.companyId||!input.scope?.assetId||scoped.pipelineId!==input.scope.pipelineId||scoped.assetId!==input.scope.assetId)throw createValidationError({scope:"Validated company, pipeline and sensor asset scope is required."});
 const scope=ownerScope(user),device=await store.findDeviceById(input.deviceRecordId??"",scope);
 const assets=await store.listAssets({pipelineId:input.scope.pipelineId,...scope}),asset=assets.find(row=>row.id===input.scope?.assetId);
 if(!device||device.isDemoData||device.deviceId==="SNS-DEMO-001"||!asset||asset.assetType!=="SENSOR"||!asset.segmentId||asset.assetId!==device.deviceId||savedSensorClassification(asset)!=="REAL")throw createValidationError({deviceRecordId:"An accessible registered REAL sensor matching the saved asset is required."});
 await savedSensorRegistration({assetRecordId:asset.id,pipelineId:input.scope.pipelineId,segmentRecordId:asset.segmentId,deviceId:device.deviceId,deviceType:device.deviceType,pipelineOrLocation:device.pipelineOrLocation},user);
 validateDeviceUnitUpdate({unit:device.unit},device.deviceType);
 return {name:input.name,endpoint:"",enabled:input.enabled??true,status:"Degraded" as const,authorId:user.id,secretConfigured:false,configuration:{...configuration,dataMode:"REAL",connectorMode:LOCAL_INBOUND,inboundSensor:{deviceId:device.deviceId,deviceRecordId:device.id,pipelineId:input.scope.pipelineId,assetId:asset.id}}};
}
export function localInboundPresentation(connector:ConnectorRecord,receiving=false){
 if(!isLocalInbound(connector))return {};
 return {mode:LOCAL_INBOUND,ingestionPath:`/api/integrations/connectors/${encodeURIComponent(connector.id)}/sensor-ingestion`,ingestionMethod:"POST",connectivityStatus:connector.enabled&&receiving?"Receiving Data":"Not Connected",status:connector.enabled&&receiving?"Ready" as const:"Degraded" as const};
}
export async function inboundHasRecentValidReading(db:{$queryRawUnsafe<T=unknown>(sql:string,...values:unknown[]):Promise<T>},connector:ConnectorRecord){
 const identity=inboundIdentity(connector);if(!identity||!connector.enabled)return false;
 const rows=await db.$queryRawUnsafe<{id:string}[]>(`SELECT r.id FROM "SharedTimeSeriesReading" r JOIN "ScadaTag" t ON t.id=r."tagId"
 JOIN "DeviceRecord" d ON d.id=$5 AND d."deviceId"=$2 AND d."isDemoData"=false
 WHERE t."connectorId"=$1 AND t."pipelineId"=$3 AND t."assetId"=$4 AND t.active=true
 AND r.quality='Good' AND r."engineeringUnit"=t."engineeringUnit" AND d.unit=t."engineeringUnit" AND (r.value IS NOT NULL OR COALESCE(r.state,'')<>'')
 AND r."rawValue"->>'version'='1' AND r."rawValue"->'provenance'->>'sourceChannel'='API' AND r."rawValue"->'provenance'->>'dataMode'='REAL'
 AND r."rawValue"->'provenance'->>'connectorId'=$1 AND r."rawValue"->'provenance'->>'deviceId'=$2 AND r."rawValue"->'provenance'->>'pipelineId'=$3
 AND r."receiveTimestamp" BETWEEN CURRENT_TIMESTAMP-t."staleAfterSeconds"*INTERVAL '1 second' AND CURRENT_TIMESTAMP
 AND r."sourceTimestamp" BETWEEN CURRENT_TIMESTAMP-t."staleAfterSeconds"*INTERVAL '1 second' AND CURRENT_TIMESTAMP+INTERVAL '60 seconds' LIMIT 1`,connector.id,identity.deviceId,identity.pipelineId,identity.assetId,identity.deviceRecordId);
 return rows.length>0;
}

export async function validateLocalInboundIngestion(db:ConnectorScopeDatabase,connector:{configuration:unknown},user:AuthUser,context?:{channel:string;identity:{deviceId:string;pipelineId:string}}){
 if(!isLocalInbound(connector))return;
 const binding=inboundIdentity(connector);
 if(!binding||!context||context.channel!=="API"||context.identity.deviceId!==binding.deviceId||context.identity.pipelineId!==binding.pipelineId)throw createValidationError({identity:"Local inbound readings must use the bound REAL device and sensor API."});
 const scoped=await resolveConnectorScope(db,{pipelineId:binding.pipelineId,assetId:binding.assetId},user);
 if(scoped.companyId!==(connector.configuration as {integrationScope?:{companyId?:string}}).integrationScope?.companyId)throw createValidationError({scope:"Stored inbound company ownership is inconsistent."});
}
