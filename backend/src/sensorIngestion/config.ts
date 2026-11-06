import {z} from "zod";
import {Binding} from "./service";
const text=z.string().trim().min(1).max(500);
const binding=z.object({id:text,userId:text,connectorId:text,pipelineId:text,deviceId:text,tagId:text,tokenEnv:z.string().regex(/^[A-Z][A-Z0-9_]+$/),topic:text.optional()}).strict();
export function bindings(raw:string|undefined):Binding[]{
 const rows=z.array(binding).min(1).max(1000).parse(JSON.parse(raw??"[]"));
 if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error("Duplicate ingestion binding IDs");
 return rows;
}
export const loopback=(host:string)=>["127.0.0.1","::1","[::1]","localhost"].includes(host);
export function integer(value:string|undefined,fallback:number,min:number,max:number){const result=value===undefined?fallback:Number(value);if(!Number.isInteger(result)||result<min||result>max)throw Error("Invalid sensor ingestion numeric setting");return result;}
