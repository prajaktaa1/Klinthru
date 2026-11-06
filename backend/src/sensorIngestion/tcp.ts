import {createServer,Socket} from "node:net";
import {Binding,type IngestionHandler,ingestMappedMessage} from "./service";
import {authenticateFrame,checkSecrets} from "./authentication";
import {loopback} from "./config";
export type TcpOptions={host:string;port:number;maxBytes:number;timeoutMs:number;maxConnections:number;mappings:Binding[];secrets:Record<string,string|undefined>};
/** UTF-8 NDJSON: exactly one authenticated envelope per line. Partial frames expire on an absolute deadline. */
export function createSensorTcpServer(options:TcpOptions,ingest:IngestionHandler=ingestMappedMessage){
 if(!loopback(options.host)||options.host==="localhost")throw Error("TCP ingestion requires an explicit loopback address");
 checkSecrets(options.mappings,options.secrets);
 const sockets=new Set<Socket>();
 const server=createServer(socket=>{
  if(sockets.size>=options.maxConnections){socket.destroy();return;}sockets.add(socket);
  let pending=Buffer.alloc(0),busy=false;
  const deadline=setTimeout(()=>socket.destroy(),options.timeoutMs);
  socket.setTimeout(options.timeoutMs,()=>socket.destroy());
  socket.on("error",()=>{});socket.once("close",()=>{clearTimeout(deadline);sockets.delete(socket);});
  socket.on("data",chunk=>{
   if(busy||pending.length+chunk.length>options.maxBytes){socket.destroy();return;}
   pending=Buffer.concat([pending,chunk]);const newline=pending.indexOf(10);
   if(newline<0)return;
   // One frame per connection bounds work, prevents pipelining and authenticates every reading.
   if(pending.subarray(newline+1).length){socket.destroy();return;}busy=true;socket.pause();
   void (async()=>{try{const {mapping,message}=authenticateFrame(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(pending.subarray(0,newline))),options.mappings,options.secrets);const result=await ingest("TCP",mapping,message);if(!socket.destroyed)socket.end(JSON.stringify({accepted:result.accepted,rejectedReplay:result.rejectedReplay})+"\n");}catch{if(!socket.destroyed)socket.end('{"error":"Reading rejected"}\n');}})();
  });
 });
 return {server,close:async()=>{for(const socket of sockets)socket.destroy();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
