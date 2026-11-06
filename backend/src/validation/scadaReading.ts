import {z} from "zod";
const text=z.string().trim().min(1).max(500);
export const scadaReadingSchema=z.object({tagId:text,sourceTimestamp:z.iso.datetime({offset:true}),sourceTimezone:text,sequence:z.string().max(120).default(""),value:z.union([z.number().finite(),z.string().max(500),z.null()]),state:text.optional(),engineeringUnit:text,quality:z.enum(["Good","Uncertain","Bad","Missing","Stale","Substituted"])}).strict();
/** Shared quality policy; neither a valid schema nor Good quality proves connectivity. */
export function normalizeScadaReading(reading:z.infer<typeof scadaReadingSchema>,expectedUnit:string,now=Date.now()){
 let quality:string=reading.quality;
 const value=typeof reading.value==="number"?reading.value:null;
 if(reading.engineeringUnit!==expectedUnit||(value===null&&!reading.state&&quality==="Good"))quality="Bad";
 if(Date.parse(reading.sourceTimestamp)>now+60000&&quality==="Good")quality="Uncertain";
 return {value,quality};
}
