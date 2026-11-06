import {z} from "zod";
import fixtures from "./fixtures.json";
import {scadaReadingSchema,normalizeScadaReading} from "../validation/scadaReading";
import {createValidationError} from "../validation/validationErrors";
import type {Binding} from "../sensorIngestion/service";
import type {SourceChannel} from "../utils/readingProvenance";
export const demoSensorMessageSchema=z.object({dataMode:z.literal("DEMO"),pipelineId:z.string().startsWith("demo:"),deviceId:z.string().startsWith("demo:"),tagId:z.string().startsWith("demo:"),reading:scadaReadingSchema}).strict();
export type DemoReading={dataMode:"DEMO";pipelineId:string;pipeline:string;deviceId:string;sensor:string;sourceChannel:SourceChannel;value:number|null;state:string|null;unit:string;quality:string;sourceTimestamp:string;receiveTimestamp:string;sequence:string};
/** Ephemeral fixture store only. No Prisma, REAL store, environment URL or app route dependency. */
export function createDemoSensorSession(){
 const rows:DemoReading[]=[],keys=new Set<string>();
 async function ingest(channel:SourceChannel,binding:Pick<Binding,"pipelineId"|"deviceId"|"tagId">,input:unknown){
  const parsed=demoSensorMessageSchema.safeParse(input);if(!parsed.success)throw createValidationError({message:"Strict DEMO fixture schema required"});const message=parsed.data;
  const sensor=fixtures.sensors.find(row=>row.id===message.deviceId&&row.tagId===message.tagId);
  if(!sensor||message.pipelineId!==fixtures.pipeline.id||message.pipelineId!==binding.pipelineId||message.deviceId!==binding.deviceId||message.tagId!==binding.tagId||message.reading.tagId!==message.tagId)throw createValidationError({identity:"Only this isolated DEMO fixture identity is accepted"});
  if(message.reading.engineeringUnit!==sensor.unit)throw createValidationError({unit:"Unit must match the DEMO fixture definition"});
  if(!["API","MQTT","TCP"].includes(channel))throw createValidationError({channel:"Server transport required"});
  const key=JSON.stringify([message.tagId,new Date(message.reading.sourceTimestamp).toISOString(),message.reading.sequence]);
  if(keys.has(key))return{accepted:0,duplicate:1,rejectedReplay:true};
  if(rows.length>=1000)throw createValidationError({capacity:"DEMO fixture session is full"});
  const normalized=normalizeScadaReading(message.reading,sensor.unit);
  rows.push({dataMode:"DEMO",pipelineId:fixtures.pipeline.id,pipeline:fixtures.pipeline.label,deviceId:sensor.id,sensor:sensor.label,sourceChannel:channel,value:normalized.value,state:message.reading.state??null,unit:sensor.unit,quality:normalized.quality,sourceTimestamp:new Date(message.reading.sourceTimestamp).toISOString(),receiveTimestamp:new Date().toISOString(),sequence:message.reading.sequence});keys.add(key);
  return{accepted:1,duplicate:0,rejectedReplay:false};
 }
 return {ingest,read:()=>rows.map(row=>({...row})),reset:()=>{rows.length=0;keys.clear();}};
}
