"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {Plus,RefreshCw,X} from "lucide-react";
import {useAuth} from "@/components/auth-provider";
import {SensorDataQualityView} from "@/components/sensor-data-quality-view";
import {SensorCalibrationView} from "@/components/sensor-calibration-view";
import {SensorMaintenanceView} from "@/components/sensor-maintenance-view";
import {SensorAlertsEventsView} from "@/components/sensor-alerts-events-view";
import {SensorConfigurationView} from "@/components/sensor-configuration-view";
import {SensorByTypeView} from "@/components/sensor-by-type-view";
import {SensorByPipelineView} from "@/components/sensor-by-pipeline-view";
import {SensorByAssetView} from "@/components/sensor-by-asset-view";
import {SensorHealthConnectivityView} from "@/components/sensor-health-connectivity-view";
import {SensorsTable} from "@/components/sensors-table";
import {SensorRegistrationForm} from "@/components/sensor-registration-form";
import {SensorAssignmentForm} from "@/components/sensor-assignment-form";
import {Panel,StatCard} from "@/components/ui";
import {fetchDeviceRecords,fetchSensorAssignments,fetchSensorMasterLinks,createSensorAssignment,updateSensorAssignment,isUnauthorizedError} from "@/lib/apiClient";
import type {DeviceRecord,SensorAssignmentRecord,SensorAssignmentInput,SensorMasterLink} from "@/lib/types";

const tabs=["All Sensors","By Type","By Pipeline / Segment","By Asset","Health & Connectivity","Data Quality","Calibration","Maintenance","Alerts & Events","Configuration"];
const availableTabs=["All Sensors","By Type","By Pipeline / Segment","By Asset","Health & Connectivity","Data Quality","Calibration","Maintenance","Alerts & Events","Configuration"];
const action="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const na="Not Available";
export function SensorsView() {
 const router=useRouter(),searchParams=useSearchParams(),{user}=useAuth();
 const requestedPipelineId=searchParams.get("pipelineId")??"";
 const [activeView,setActiveView]=useState("All Sensors");
 const [sensorTypeFilter,setSensorTypeFilter]=useState("");
 const [sensorSearchFilter,setSensorSearchFilter]=useState("");
 const [records,setRecords]=useState<DeviceRecord[]>([]),[assignments,setAssignments]=useState<SensorAssignmentRecord[]>([]),[masterLinks,setMasterLinks]=useState<SensorMasterLink[]>([]);
 const [isLoading,setIsLoading]=useState(true),[errorMessage,setErrorMessage]=useState<string|null>(null),[assignmentError,setAssignmentError]=useState(false);
 const [version,setVersion]=useState(0),[drawer,setDrawer]=useState<"register"|"create-assignment"|"edit-assignment"|null>(null);
 const [editing,setEditing]=useState<SensorAssignmentRecord|null>(null),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState("");
 const dialog=useRef<HTMLDialogElement>(null),pending=useRef(false);
 const canModify=user?.role==="Admin"||user?.role==="Engineer";
 useEffect(()=>{
  let active=true;setIsLoading(true);setErrorMessage(null);setAssignmentError(false);
  void Promise.allSettled([fetchDeviceRecords(),fetchSensorAssignments(),fetchSensorMasterLinks()]).then(([devices,links,relationships])=>{
   if(!active)return;
   if(devices.status==="fulfilled")setRecords(devices.value);
   else {setRecords([]);setErrorMessage("Sensor device records could not be loaded. Use Refresh to retry.");if(isUnauthorizedError(devices.reason))router.replace("/login");}
   if(links.status==="fulfilled")setAssignments(links.value);
   else {setAssignments([]);setAssignmentError(true);}
   if(relationships.status==="fulfilled")setMasterLinks(relationships.value);
   else setMasterLinks([]);
   setIsLoading(false);
  });
  return()=>{active=false;};
 },[router,version]);
 useEffect(()=>{
  if(drawer)dialog.current?.showModal();
  else dialog.current?.close();
 },[drawer]);
 const realRecords=records.filter(record=>!record.isDemoData),demoCount=records.length-realRecords.length;
 function open(mode:typeof drawer,assignment?:SensorAssignmentRecord){setSaveError("");setEditing(assignment??null);setDrawer(mode);}
 function saved(){setDrawer(null);setVersion(value=>value+1);}
 async function saveAssignment(input:SensorAssignmentInput){
  if(pending.current)return;
  pending.current=true;setBusy(true);setSaveError("");
  try{
   if(drawer==="edit-assignment"&&editing)await updateSensorAssignment(editing.id,input);
   else await createSensorAssignment(input);
   saved();
  }catch(error){
   setSaveError(error instanceof Error?error.message:"Assignment could not be saved. Entries have been retained.");
   if(isUnauthorizedError(error))router.replace("/login");
  }finally{pending.current=false;setBusy(false);}
 }
 return <div className="space-y-4" aria-label="Sensors workspace">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <p className="text-xs text-slate-500">Device health and measurement quality are separate from engineering process condition.</p>
   <div className="flex flex-wrap gap-2">
    <button type="button" className={action} disabled={isLoading} onClick={()=>setVersion(value=>value+1)}><RefreshCw size={14}/>Refresh</button>
    <button type="button" className={action} disabled={!canModify||isLoading||!realRecords.length} title={!canModify?"Admin or Engineer access required.":!realRecords.length?"Register a real device before creating an assignment.":undefined} onClick={()=>open("create-assignment")}>Create Assignment</button>
    <button type="button" className={action+" !bg-slateblue-600 !text-white"} disabled={!canModify} title={!canModify?"Admin or Engineer access required.":undefined} onClick={()=>open("register")}><Plus size={15}/>Add Sensor</button>
   </div>
  </div>
  <nav aria-label="Sensors views" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-panel dark:border-slate-700 dark:bg-slate-900">
   {tabs.map(tab=><button key={tab} type="button" disabled={!availableTabs.includes(tab)} aria-current={activeView===tab?"page":undefined} onClick={()=>setActiveView(tab)} title={!availableTabs.includes(tab)?"This Sensors view is not available yet.":undefined} className={"rounded-lg px-3 py-2 text-xs font-semibold "+(activeView===tab?"bg-slateblue-600 text-white":availableTabs.includes(tab)?"text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800":"cursor-not-allowed text-slate-400")}>{tab}</button>)}
  </nav>
   {activeView==="By Type"?<SensorByTypeView records={records} isLoading={isLoading} errorMessage={errorMessage} onViewSensors={type=>{setSensorTypeFilter(type);setActiveView("All Sensors");}}/>:null}
   {activeView==="By Pipeline / Segment"?<SensorByPipelineView records={records} onViewSensors={query=>{setSensorTypeFilter("");setSensorSearchFilter(query);setActiveView("All Sensors");}}/>:null}
   {activeView==="By Asset"?<SensorByAssetView records={records} onViewAsset={id=>router.push(`/asset-master/assets/${encodeURIComponent(id)}`)} onViewMap={(assetId,pipelineId)=>router.push(`/asset-master?assetId=${encodeURIComponent(assetId)}&pipelineId=${encodeURIComponent(pipelineId)}`)}/>:null}
   {activeView==="Health & Connectivity"?<SensorHealthConnectivityView records={records} isLoading={isLoading} errorMessage={errorMessage} onViewSensor={record=>{setSensorTypeFilter(record.deviceType);setSensorSearchFilter(record.deviceId);setActiveView("All Sensors");}}/>:null}
   {activeView==="All Sensors"?<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
    <StatCard label="Total Sensors" value={isLoading?"...":errorMessage?na:realRecords.length} tone="blue"/>
    <StatCard label="Online" value={na} tone="green"/><StatCard label="Offline" value={na} tone="red"/>
    <StatCard label="Attention" value={na} tone="amber"/><StatCard label="Calibration Due" value={na} tone="amber"/><StatCard label="Maintenance Due" value={na} tone="blue"/>
   </div>
   <p className="text-xs text-slate-500">Total Sensors counts registry devices not flagged as demo. Connectivity, hardware attention, calibration and maintenance totals require their own source records.</p>
   {isLoading?<Panel><p role="status" className="text-sm text-slate-500">Loading sensor records...</p></Panel>:errorMessage?<Panel><p role="alert" className="text-sm text-rose-700">{errorMessage}</p></Panel>:<SensorsTable records={realRecords} assignments={assignments} masterLinks={masterLinks} assignmentsError={assignmentError} canEdit={canModify} initialPipelineId={requestedPipelineId} initialType={sensorTypeFilter} initialQuery={sensorSearchFilter} onEdit={assignment=>open("edit-assignment",assignment)}/>}
   {assignmentError?<p role="status" className="text-xs text-amber-700">Assignment details are Not Available. Registry records remain visible; Refresh retries both sources.</p>:null}
   <div className="grid min-w-0 gap-4 lg:grid-cols-3">
    {[
     ["Recent Sensor Alerts","Alerts & Events","Hardware event records are Not Available. Process alarms belong to their engineering modules."],
     ["Calibration Overview","Calibration","Calibration records and due dates are Not Available."],
     ["Maintenance Schedule","Maintenance","Device maintenance tasks and due dates are Not Available."]
    ].map(([title,view,message])=><Panel key={title} className="min-w-0 !p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3><button type="button" className="shrink-0 text-xs font-semibold text-slateblue-700 dark:text-slateblue-300" onClick={()=>setActiveView(view)}>View All<span className="sr-only"> {title}</span></button></div><p className="mt-4 text-xs leading-5 text-slate-500">{message}</p></Panel>)}
   </div>
   {demoCount?<p className="text-xs text-slate-500">{demoCount} existing demo device record(s) are preserved and excluded from real inventory, KPIs and export.</p>:null}
  </>:null}
   {activeView==="Data Quality"?<SensorDataQualityView records={records} isLoading={isLoading} errorMessage={errorMessage} onViewSensor={record=>{setSensorTypeFilter(record.deviceType);setSensorSearchFilter(record.deviceId);setActiveView("All Sensors");}}/>:null}
  {activeView==="Calibration"?<SensorCalibrationView/>:null}
  {activeView==="Maintenance"?<SensorMaintenanceView/>:null}
  {activeView==="Alerts & Events"?<SensorAlertsEventsView/>:null}
  {activeView==="Configuration"?<SensorConfigurationView/>:null}
  <dialog ref={dialog} aria-label={drawer==="register"?"Add Sensor":drawer==="edit-assignment"?"Edit Sensor Assignment":"Create Sensor Assignment"} onCancel={event=>{if(busy)event.preventDefault();else setDrawer(null);}} onClose={()=>{if(!busy)setDrawer(null);}} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-4xl overflow-y-auto border-l border-slate-200 bg-white p-4 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-6">
   {drawer?<><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{drawer==="register"?"Add Sensor":drawer==="edit-assignment"?"Edit Sensor Assignment":"Create Sensor Assignment"}</h2><button type="button" disabled={busy} aria-label="Close sensor form" className={action} onClick={()=>setDrawer(null)}><X size={18}/></button></div>
    <p className="mb-4 text-xs text-slate-500">Only fields supported by the existing registry and assignment records can be saved. Channel telemetry, master relationships and lifecycle records are Not Available.</p>
    {saveError?<p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p>:null}
    {drawer==="register"?<SensorRegistrationForm onRegistered={saved} onUnauthorized={()=>router.replace("/login")} onCancel={()=>setDrawer(null)} onBusyChange={setBusy}/>:<SensorAssignmentForm key={editing?.id??"new"} devices={realRecords} demoDeviceCount={demoCount} devicesError={errorMessage} isDevicesLoading={isLoading} mode={drawer==="edit-assignment"?"edit":"create"} selectedAssignment={editing} isSaving={busy} onCancel={()=>setDrawer(null)} onSubmit={saveAssignment}/>}
   </>:null}
  </dialog>
 </div>;
}
