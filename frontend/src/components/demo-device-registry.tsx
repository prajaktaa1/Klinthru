"use client";
import {useState,useRef} from "react";
import {ApiError,updateDeviceDetails,isUnauthorizedError} from "@/lib/apiClient";
import type {DeviceRecord} from "@/lib/types";
import {sensorDetailValue} from "@/lib/sensor-details";

/** Saved DEMO registry metadata only: never contributes telemetry, assignments or REAL counts. */
export function DemoDeviceRegistry({records,canEdit=false,onUpdated,onUnauthorized}:{records:DeviceRecord[];canEdit?:boolean;onUpdated?:()=>void;onUnauthorized?:()=>void}){
 const [editing,setEditing]=useState<string|null>(null),[unit,setUnit]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const pending=useRef(false);
 async function save(device:DeviceRecord){
  if(pending.current)return;pending.current=true;setBusy(true);setMessage("");
  try{await updateDeviceDetails(device.id,{unit:unit.trim()});setEditing(null);setMessage("Engineering unit saved.");onUpdated?.();}
  catch(error){if(isUnauthorizedError(error))onUnauthorized?.();setMessage(error instanceof ApiError?Object.values(error.fields??{}).join(" ")||error.message:"Engineering unit could not be saved. Your entry has been retained.");}
  finally{pending.current=false;setBusy(false);}
 }
 const devices=records.filter(record=>record.isDemoData);
 if(!devices.length)return null;
 return <details className="rounded-xl border border-amber-200 p-4" aria-label="DEMO device registry">
  <summary className="cursor-pointer text-sm font-semibold">DEMO device registry ({devices.length})</summary>
  <p className="mt-2 text-xs text-slate-500">Saved DEMO records. Excluded from REAL inventory, telemetry, KPIs and assignments.</p>
  {message?<p role="status" className="mt-2 text-xs">{message}</p>:null}
  <div className="mt-3 space-y-3">{devices.map(device=><details key={device.id} className="rounded-lg border border-slate-200 p-3" aria-label={device.deviceId+" DEMO details"}>
   <summary className="cursor-pointer text-sm font-semibold">{device.deviceId} - DEMO</summary>
   {canEdit?<button type="button" disabled={busy} className="mt-3 text-xs font-semibold text-slateblue-700" onClick={()=>{setEditing(device.id);setUnit(device.unit??"");setMessage("");}}>Edit Sensor Details</button>:null}
   {editing===device.id?<form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={event=>{event.preventDefault();void save(device);}}>
    <label className="text-xs">Engineering Unit<input aria-label={device.deviceId+" Engineering Unit"} value={unit} required maxLength={50} disabled={busy} onChange={event=>setUnit(event.target.value)} className="ml-2 rounded border border-slate-300 px-2 py-1"/></label>
    <button type="submit" disabled={busy||!unit.trim()} className="rounded border px-3 py-1 text-xs">{busy?"Saving...":"Save"}</button>
    <button type="button" disabled={busy} className="rounded border px-3 py-1 text-xs" onClick={()=>{setEditing(null);setMessage("");}}>Cancel</button>
   </form>:null}
   <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{[["Device ID",device.deviceId],["Sensor Type",device.deviceType],["Saved Location",device.pipelineOrLocation],["Engineering Unit",device.unit],["Inventory Status",device.status],["Data Classification","DEMO (isDemoData=true)"],["Registry Updated",device.lastUpdatedAt],["Last Reading","Not Available"],["Channel","Not Available"],["Connectivity","Not Available"]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{sensorDetailValue(value)}</dd></div>)}</dl>
  </details>)}</div>
 </details>;
}
