"use client";
import {useEffect,useMemo,useState,useRef} from "react";
import {fetchPipelines,fetchMasterSegments,fetchMasterAssets,fetchScadaOverview} from "@/lib/apiClient";
import type {PipelineRecord,AssetMasterSegmentRecord,AssetMasterAssetRecord} from "@/lib/types";
import type {ScadaTag} from "@/lib/apiClient";
import {savedSensorDetailRows,sensorDetailValue} from "@/lib/sensor-details";
import {resolveSensorTelemetry} from "@/lib/sensor-telemetry";
import {Download,X,Search} from "lucide-react";
import {filterSensorRecords,sensorRegistryCsv,deviceTypeOrder} from "@/lib/sensor-data";
import type {SensorAssignmentRecord,SensorMasterLink} from "@/lib/types";
import { Panel } from "@/components/ui";
import {
  getSensorAvailability,
  SensorSummary,
  validateSensorSummary
} from "@/lib/sensor-data";
import { DeviceRecord } from "@/lib/types";

function formatAvailability(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function AvailabilityBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="flex min-w-[140px] items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slateblue-600"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-semibold text-slate-700">
        {formatAvailability(clampedValue)}
      </span>
    </div>
  );
}

function SensorMobileCard({ sensor }: { sensor: SensorSummary }) {
  const availability = getSensorAvailability(sensor);
  const isValid = validateSensorSummary(sensor);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base font-semibold text-slate-900">{sensor.type}</h4>
        {!isValid ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Check data
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
          <p className="mt-1 font-semibold text-slate-900">{sensor.total}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active</p>
          <p className="mt-1 font-semibold text-emerald-700">{sensor.active}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inactive</p>
          <p className="mt-1 font-semibold text-red-700">{sensor.inactive}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          Availability
        </p>
        <AvailabilityBar value={availability} />
      </div>
    </div>
  );
}

export function SensorTypeTable({ records, sensors }: { records: DeviceRecord[]; sensors: SensorSummary[] }) {
  const isEmpty = sensors.length === 0;
  const hasDemoRecords = records.some((record) => record.isDemoData);

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Sensors by Type</h3>
          <p className="mt-1 text-sm text-slate-500">
            Detailed breakdown of sensors by type with status and key metrics.
          </p>
        </div>
        {hasDemoRecords ? <span className="self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Demo Sensor Inventory</span> : null}
      </div>

      {hasDemoRecords ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Demo Sensor Inventory. These records are for development viewing only and are not live SCADA telemetry, operational devices, or verified field data.</div> : null}

      <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sensor Type</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Inactive</th>
              <th className="px-4 py-3 text-right font-medium">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isEmpty ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No device records are available yet.
                </td>
              </tr>
            ) : (
              sensors.map((sensor) => {
                const availability = getSensorAvailability(sensor);
                const isValid = validateSensorSummary(sensor);

                return (
                  <tr key={sensor.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        {sensor.type}
                        {!isValid ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Check data
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {sensor.total}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {sensor.active}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {sensor.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <AvailabilityBar value={availability} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4 md:hidden">
        {isEmpty ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            No device records are available yet.
          </div>
        ) : (
          sensors.map((sensor) => (
            <SensorMobileCard key={sensor.id} sensor={sensor} />
          ))
        )}
      </div>

      {!isEmpty ? (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-[700px] w-full divide-y divide-slate-200 text-left text-sm">
            <caption className="sr-only">Registered device records</caption>
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">Device ID</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Stored Location</th><th className="px-4 py-3 font-medium">Inventory Status</th><th className="px-4 py-3 font-medium">Data Classification</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((record) => <tr key={record.id}><td className="px-4 py-3 font-medium text-slate-900">{record.deviceId}</td><td className="px-4 py-3 text-slate-700">{record.deviceType}</td><td className="px-4 py-3 text-slate-700">{record.pipelineOrLocation}</td><td className="px-4 py-3 text-slate-700">{record.status}</td><td className="px-4 py-3">{record.isDemoData ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Demo</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Stored inventory</span>}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

const na = "Not Available";
const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const action = "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200";
const detailTabs = ["Overview","Live Data","Trends","Calibration","Maintenance","Documents"];
export function SensorsTable({refreshVersion=0,records,assignments=[],masterLinks=[],assignmentsError=false,canEdit=false,initialPipelineId="",initialType="",initialQuery="",onEdit}:{
 refreshVersion?:number;records:DeviceRecord[];assignments?:SensorAssignmentRecord[];masterLinks?:SensorMasterLink[];assignmentsError?:boolean;canEdit?:boolean;initialPipelineId?:string;initialType?:string;initialQuery?:string;onEdit?:(assignment:SensorAssignmentRecord)=>void;
}) {
 const [query,setQuery]=useState(""),[type,setType]=useState(""),[status,setStatus]=useState(""),[pipelineFilter,setPipelineFilter]=useState(""),[segmentFilter,setSegmentFilter]=useState("");
 const [pipelines,setPipelines]=useState<PipelineRecord[]>([]);
 const [segments,setSegments]=useState<AssetMasterSegmentRecord[]>([]);
 const [assets,setAssets]=useState<AssetMasterAssetRecord[]>([]);
 const [assetFilter,setAssetFilter]=useState("");
 const appliedInitial=useRef("");
 const [scopeError,setScopeError]=useState("");
 const [tags,setTags]=useState<ScadaTag[]>([]);
 const [telemetryNow,setTelemetryNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setTelemetryNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{let active=true;void fetchPipelines().then(items=>{if(active){setPipelines(items);setPipelineFilter(current=>items.some(item=>item.id===current)?current:"");}}).catch(()=>{if(active)setScopeError("Pipeline filters could not be loaded. Refresh to retry.");});return()=>{active=false;};},[refreshVersion]);
 useEffect(()=>{
  let active=true;setSegments([]);setAssets([]);
  if(!pipelineFilter){setSegmentFilter("");setAssetFilter("");return;}
  setScopeError("");
  void Promise.all([fetchMasterSegments(pipelineFilter),fetchMasterAssets(pipelineFilter)]).then(([savedSegments,savedAssets])=>{
   if(active){setSegments(savedSegments.filter(item=>item.pipelineId===pipelineFilter));setAssets(savedAssets.filter(item=>item.pipelineId===pipelineFilter&&item.assetType==="SENSOR"));setSegmentFilter(current=>savedSegments.some(item=>item.pipelineId===pipelineFilter&&item.id===current)?current:"");setAssetFilter(current=>savedAssets.some(item=>item.pipelineId===pipelineFilter&&item.assetType==="SENSOR"&&item.id===current)?current:"");}
  }).catch(()=>{if(active)setScopeError("Segment and sensor asset filters could not be loaded. Refresh to retry.");});
  return()=>{active=false;};
 },[pipelineFilter,refreshVersion]);
 useEffect(()=>{let active=true;setTags([]);const ids=[...new Set(masterLinks.map(item=>item.pipelineId))];void Promise.allSettled(ids.map(id=>fetchScadaOverview(id))).then(results=>{if(active)setTags(results.flatMap((result,index)=>result.status==="fulfilled"&&result.value.pipeline.id===ids[index]?result.value.tags.filter(tag=>tag.pipelineId===ids[index]):[]));});return()=>{active=false;};},[masterLinks,refreshVersion]);
 const [selectedRecord,setSelectedRecord]=useState<DeviceRecord|null>(null),[detailTab,setDetailTab]=useState("Overview");
 const [more,setMore]=useState(false),[unit,setUnit]=useState("");
 const [page,setPage]=useState(1),[size,setSize]=useState(6),[checked,setChecked]=useState<string[]>([]);
 const filtered=useMemo(()=>filterSensorRecords(records,"",type,status).filter(record=>{const link=linkFor(record);return (!assetFilter||link?.assetRecordId===assetFilter)&&(!unit||(record.unit??"")===unit)&&(!pipelineFilter||link?.pipelineId===pipelineFilter)&&(!segmentFilter||link?.segmentRecordId===segmentFilter)&&(!query.trim()||filterSensorRecords([record],query,"","").length>0||Boolean(assignmentFor(record)?.sensorName.toLowerCase().includes(query.trim().toLowerCase()))||Boolean(link?.assetId.toLowerCase().includes(query.trim().toLowerCase())));}),[records,query,type,status,unit,pipelineFilter,segmentFilter,assetFilter,assignments,assignmentsError,masterLinks]);
 const pages=Math.max(1,Math.ceil(filtered.length/size)),currentPage=Math.min(page,pages);
 const visible=filtered.slice((currentPage-1)*size,currentPage*size);
 const selectedId=selectedRecord?.id??"";
 const selected=selectedRecord&&filtered.some(record=>record.id===selectedRecord.id)?selectedRecord:undefined;
 // Selection stores the clicked saved row, independently of the export checkboxes.
 // Refresh updates the snapshot by registry ID; filters immediately hide out-of-scope details.
 useEffect(()=>{setSelectedRecord(current=>current?filtered.find(record=>record.id===current.id)??null:null);},[filtered]);
 const selectedTelemetry=selected?resolveSensorTelemetry(selected,linkFor(selected),assignmentFor(selected),tags,telemetryNow):null;
 useEffect(()=>{setPage(1);},[query,type,status,unit,pipelineFilter,segmentFilter,assetFilter,size]);
 useEffect(()=>{
  if(!initialPipelineId||appliedInitial.current===initialPipelineId)return;
  if(!pipelines.some(item=>item.id===initialPipelineId))return;
  appliedInitial.current=initialPipelineId;
  setPipelineFilter(initialPipelineId);
  setSegmentFilter("");
 },[initialPipelineId,pipelines]);
 useEffect(()=>{setType(initialType);},[initialType]);
 useEffect(()=>{setQuery(initialQuery);},[initialQuery]);
 useEffect(()=>{setChecked(ids=>ids.filter(id=>records.some(record=>!record.isDemoData&&record.id===id)));},[records]);
 function assignmentFor(record:DeviceRecord) {
  const matches=assignments.filter(item=>item.sensorId===record.deviceId&&!item.activeTo);
  return !assignmentsError&&matches.length===1?matches[0]:undefined;
 }
 function linkFor(record:DeviceRecord) { const matches=masterLinks.filter(item=>item.sensorId===record.deviceId);return matches.length===1?matches[0]:undefined; }
 const assignment=selected&&assignmentFor(selected);
 const pipelineOptions=pipelines;
 const segmentOptions=segments;
 const assetOptions=assets.filter(item=>!segmentFilter||item.segmentId===segmentFilter);
 const exportRecords=checked.length?filtered.filter(record=>checked.includes(record.id)):filtered;
 function exportCsv() {
  const url=URL.createObjectURL(new Blob(["\uFEFF"+sensorRegistryCsv(exportRecords)],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="klinthru-sensor-registry.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const show=(record:DeviceRecord)=>{setSelectedRecord(record);setDetailTab("Overview");};
 return <div className="space-y-4">
  <Panel>
   <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_auto_auto_auto]">
    <label className="relative min-w-0"><span className="sr-only">Search sensors</span><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input aria-label="Search sensors" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search sensor ID, type or stored location..." className={control+" w-full pl-9"}/></label>
    <select aria-label="Sensor type filter" value={type} onChange={event=>setType(event.target.value)} className={control}><option value="">All Types</option>{deviceTypeOrder.map(item=><option key={item}>{item}</option>)}</select>
    <select aria-label="Inventory status filter" value={status} onChange={event=>setStatus(event.target.value)} className={control}><option value="">All Inventory Statuses</option>{["Active","Inactive","Fault"].map(item=><option key={item}>{item}</option>)}</select>
    <button type="button" className={action} onClick={()=>{setQuery("");setType("");setStatus("");setUnit("");setPipelineFilter("");setSegmentFilter("");setAssetFilter("");setChecked([]);}}>Clear Filters</button>
   </div>
   <div className="mt-3 flex flex-wrap items-center gap-3">
    <select aria-label="Pipeline filter" value={pipelineFilter} disabled={!pipelineOptions.length} onChange={event=>{setPipelineFilter(event.target.value);setSegmentFilter("");setAssetFilter("");}} className={control}><option value="">{pipelineOptions.length?"All Pipelines":"All Pipelines - Not Available"}</option>{pipelineOptions.map(item=><option key={item.id} value={item.id}>{item.pipelineCode}</option>)}</select>
    <select aria-label="Segment filter" value={segmentFilter} disabled={!segmentOptions.length} onChange={event=>{setSegmentFilter(event.target.value);setAssetFilter("");}} className={control}><option value="">{segmentOptions.length?"All Segments":"All Segments - Not Available"}</option>{segmentOptions.map(item=><option key={item.id} value={item.id}>{item.segmentId}</option>)}</select>
    <select aria-label="Sensor Asset filter" value={assetFilter} disabled={!assetOptions.length} onChange={event=>setAssetFilter(event.target.value)} className={control}><option value="">{assetOptions.length?"All Sensor Assets":"Sensor Assets - Not Available"}</option>{assetOptions.map(item=><option key={item.id} value={item.id}>{item.assetId}</option>)}</select>
    {scopeError?<p role="alert" className="text-xs text-rose-700">{scopeError}</p>:null}
    <button type="button" className={action} aria-expanded={more} onClick={()=>setMore(value=>!value)}>More Filters</button>
    <select aria-label="Connectivity filter unavailable" disabled className={control} title="Connectivity telemetry is not available."><option>Connectivity - Not Available</option></select>
    <p className="text-xs text-slate-500">Inventory status does not indicate Online/Offline connectivity.</p>
   </div>
   {more?<label className="mt-3 block text-xs text-slate-500">Stored registry unit <select aria-label="Registry unit filter" value={unit} onChange={event=>setUnit(event.target.value)} className={control}><option value="">All Units</option>{Array.from(new Set(records.filter(record=>!record.isDemoData).map(record=>record.unit).filter((value):value is string=>Boolean(value)))).map(value=><option key={value}>{value}</option>)}</select></label>:null}
  </Panel>
  <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
   <Panel className="min-w-0 !p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-slate-900 dark:text-white">Sensors Registry</h3><button type="button" disabled={!exportRecords.length} onClick={exportCsv} className={action}><Download size={14}/>Export {checked.length?"Selected":"CSV"}</button></div>
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
     <table className="w-full min-w-[1300px] text-left text-xs">
      <caption className="sr-only">All Sensors registry</caption>
      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr>
       <th className="p-3"><input type="checkbox" aria-label="Select visible sensors" disabled={!visible.length} checked={visible.length>0&&visible.every(record=>checked.includes(record.id))} onChange={event=>setChecked(ids=>event.target.checked?[...new Set([...ids,...visible.map(record=>record.id)])]:ids.filter(id=>!visible.some(record=>record.id===id)))}/></th>
       {["Sensor ID","Tag / Name","Type","Pipeline","Segment","Asset","Monitoring Point","Status / Connectivity","Channel","Last Received","Reading Value","Unit","Quality","Calibration","Maintenance","Actions"].map(label=><th key={label} className="whitespace-nowrap p-3 font-semibold">{label}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
       {!visible.length?<tr><td colSpan={17} className="p-8 text-center text-slate-500">{records.some(record=>!record.isDemoData)?"No sensors match these filters.":"No real sensor devices are available. Existing demo records are preserved and excluded."}</td></tr>:visible.map(record=>{
        const linked=assignmentFor(record),master=linkFor(record),telemetry=resolveSensorTelemetry(record,master,linked,tags,telemetryNow);
        return <tr key={record.id} tabIndex={0} aria-selected={selectedId===record.id} onClick={()=>show(record)} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();show(record);}}} className={"cursor-pointer "+(selectedId===record.id?"bg-slateblue-50 dark:bg-slate-800":"hover:bg-slate-50 dark:hover:bg-slate-800")}>
         <td className="p-3"><input type="checkbox" aria-label={"Select "+record.deviceId} checked={checked.includes(record.id)} onClick={event=>event.stopPropagation()} onChange={event=>setChecked(ids=>event.target.checked?[...ids,record.id]:ids.filter(id=>id!==record.id))}/></td>
         <td className="p-3"><button type="button" onClick={event=>{event.stopPropagation();show(record);}} className="font-semibold text-slateblue-700 dark:text-slateblue-300">{record.deviceId}</button><span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inventory: {record.status}</span></td>
         <td className="p-3">{linked?.sensorName??na}</td><td className="p-3">{record.deviceType}</td>
         <td className="p-3">{master?.pipelineCode??na}</td><td className="p-3">{master?.segmentId??na}</td><td className="p-3">{master?.assetId??na}</td><td className="p-3 text-slate-500">{master?.monitoringPoint??na}</td><td className="p-3"><span>Inventory: {record.status}</span><span className="mt-1 block text-slate-500">Connectivity: {telemetry.connectivity}</span></td><td className="p-3">{telemetry.channel}</td><td className="p-3">{telemetry.receivedAt??na}</td><td className="p-3">{telemetry.value??na}</td><td className="p-3">{telemetry.unit??na}</td><td className="p-3">{telemetry.quality??na}</td><td className="p-3 text-slate-500">{na}</td><td className="p-3 text-slate-500">{na}</td>
         <td className="p-3"><button type="button" className={action} onClick={event=>{event.stopPropagation();show(record);}}>Details</button></td>
        </tr>;
       })}
      </tbody>
     </table>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{filtered.length?(currentPage-1)*size+1:0} to {Math.min(currentPage*size,filtered.length)} of {filtered.length} sensors</span><label>Rows per page <select aria-label="Sensor rows per page" className={control} value={size} onChange={event=>setSize(Number(event.target.value))}><option value={6}>6</option></select></label><div className="flex items-center gap-2"><button type="button" className={action} disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><span>Page {currentPage} of {pages}</span><button type="button" className={action} disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next</button></div></div>
   </Panel>
   <aside aria-label="Sensor details" aria-live="polite" className="min-w-0">
    <Panel className="h-full !p-4">
     <div className="flex items-center justify-between"><h3 className="text-base font-semibold">Sensor Details</h3>{selected?<button type="button" aria-label="Close sensor details" onClick={()=>setSelectedRecord(null)}><X size={17}/></button>:null}</div>
     {!selected?<p className="mt-6 text-sm text-slate-500">Select a sensor row to view its saved details.</p>:<>
      <h4 className="mt-4 break-all font-semibold text-slateblue-700 dark:text-slateblue-300">{selected.deviceId}</h4><p className="mt-1 text-xs text-slate-500">{assignment?.sensorName??selected.deviceType}</p>
      <div className="my-4 grid grid-cols-2 gap-2">{["Last Reading","Data Quality","Calibration","Maintenance"].map(label=><div key={label} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700"><p className="text-slate-500">{label}</p><p className="mt-2 font-semibold">{label==="Last Reading"?sensorDetailValue(selectedTelemetry?.value):label==="Data Quality"?sensorDetailValue(selectedTelemetry?.quality):na}</p></div>)}</div>
      <div role="tablist" aria-label="Sensor detail sections" className="my-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-700">{detailTabs.map(tab=><button key={tab} type="button" role="tab" aria-selected={tab===detailTab} onClick={()=>setDetailTab(tab)} className={"rounded px-2 py-1 text-xs "+(detailTab===tab?"bg-slateblue-600 text-white":"text-slate-500")}>{tab}</button>)}</div>
      <div role="tabpanel" aria-label={detailTab+" sensor details"}>
       {detailTab==="Overview"?<dl className="space-y-3 text-xs">{savedSensorDetailRows(selected,linkFor(selected),assignment,selectedTelemetry).map(([label,value])=><div key={label} className="grid grid-cols-2 gap-2"><dt className="text-slate-500">{label}</dt><dd className="break-words">{value}</dd></div>)}<p className="text-slate-500">Stored reading/state is registry metadata, not a verified live measurement.</p></dl>:detailTab==="Live Data"&&selectedTelemetry?.receivedAt?<dl className="space-y-3 text-xs">{[["Channel",["MQTT","TCP","API"].includes(selectedTelemetry.channel)?selectedTelemetry.channel:na],["Last Received",selectedTelemetry.receivedAt],["Reading Value",String(selectedTelemetry.value??na)],["Unit",selectedTelemetry.unit??na],["Quality",selectedTelemetry.quality??na],["Connectivity",sensorDetailValue(selectedTelemetry.connectivity)]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd>{value}</dd></div>)}</dl>:<p className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">{na} - {detailTab==="Live Data"||detailTab==="Trends"?"verified channel, timestamp, quality and freshness records are required.":detailTab.toLowerCase()+" records are not available for this device."}</p>}
      </div>
      <div className="mt-4"><div className="flex items-center justify-between gap-2"><h4 className="text-xs font-semibold">Location on Map</h4><button type="button" className={action} disabled title="No verified Sensor-to-Asset geometry link is available.">View in Map</button></div><p className="mt-2 rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">Not Available - verified linked Asset Master coordinates are required.</p></div>
      <div className="mt-5 grid grid-cols-2 gap-2">
       <button type="button" className={action} disabled={!canEdit||!assignment||!onEdit} title={!assignment?"Editable assignment data is not available. Device identity editing is not supported by the existing API.":!canEdit?"Admin or Engineer access required.":"Edit the saved assignment; device identity and master location are preserved."} onClick={()=>assignment&&onEdit?.(assignment)}>Edit Assignment</button>
       <button type="button" className={action} disabled title="A verified Asset Master relationship is not available.">View Asset</button>
       <button type="button" className={action} onClick={()=>setDetailTab("Trends")}>View History</button>
       <button type="button" className={action} disabled title="Maintenance records are not available.">Raise Maintenance</button>
      </div>
     </>}
    </Panel>
   </aside>
  </div>
 </div>;
}
