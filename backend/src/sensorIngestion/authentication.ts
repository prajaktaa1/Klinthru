import {createHash,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {Binding} from "./service";
export const transportEnvelope=z.object({bindingId:z.string().min(1).max(500),token:z.string().min(32).max(512),message:z.unknown()}).strict();
export function authenticateFrame(raw:unknown,mappings:Binding[],secrets:Record<string,string|undefined>,topic?:string){
 const frame=transportEnvelope.parse(raw),mapping=mappings.find(item=>item.id===frame.bindingId);
 const secret=mapping&&secrets[mapping.tokenEnv];
 const digest=(input:string)=>createHash("sha256").update(input).digest();
 if(!mapping||!secret||secret.length<32||!timingSafeEqual(digest(frame.token),digest(secret))||(topic!==undefined&&mapping.topic!==topic))throw Error("Ingestion authentication failed");
 return {mapping,message:frame.message};
}
export function checkSecrets(mappings:Binding[],secrets:Record<string,string|undefined>){for(const mapping of mappings)if((secrets[mapping.tokenEnv]?.length??0)<32)throw Error("Sensor ingestion requires a configured secret of at least 32 characters");}
