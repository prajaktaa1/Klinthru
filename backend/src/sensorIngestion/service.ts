import {z} from "zod";
import {store} from "../data/store";
import {ingestScadaBatch,parseScada,scadaBatchSchema} from "../utils/scadaData";
import {AuthUser} from "../types/domain";
import {SourceChannel} from "../utils/readingProvenance";
import {createValidationError} from "../validation/validationErrors";
export type Binding={id:string;userId:string;connectorId:string;pipelineId:string;deviceId:string;tagId:string;tokenEnv:string;topic?:string};
export const sensorMessageSchema=z.object({dataMode:z.literal("REAL"),pipelineId:z.string().min(1),deviceId:z.string().min(1),tagId:z.string().min(1),reading:scadaBatchSchema.shape.readings.unwrap().element}).strict();
export async function ingestSensorMessage(channel:SourceChannel,binding:Pick<Binding,"connectorId"|"pipelineId"|"deviceId"|"tagId">,input:unknown,user:AuthUser){
 const message=parseScada(sensorMessageSchema,input);
 if(user.role!=="Admin")throw createValidationError({user:"Sensor ingestion requires an integration manager identity"});
 if(message.pipelineId!==binding.pipelineId||message.deviceId!==binding.deviceId||message.tagId!==binding.tagId||message.reading.tagId!==binding.tagId)throw createValidationError({identity:"Message does not match the configured identity"});
 const result=await ingestScadaBatch(binding.connectorId,{readings:[message.reading]},user,{channel,identity:{deviceId:binding.deviceId,pipelineId:binding.pipelineId},tagId:binding.tagId});
 // Replays are rejected (not persisted or re-labelled); expose an explicit result for transport acknowledgements.
 return {...result,rejectedReplay:result.duplicate>0};
}
export async function ingestMappedMessage(channel:"MQTT"|"TCP",binding:Binding,input:unknown){
 const record=await store.findUserById(binding.userId);
 if(!record)throw createValidationError({user:"Configured ingestion identity is unavailable"});
 return ingestSensorMessage(channel,binding,input,store.toAuthUser(record));
}

export type IngestionHandler=(channel:"MQTT"|"TCP",binding:Binding,input:unknown)=>Promise<{accepted:number;duplicate:number;rejectedReplay:boolean}>;
