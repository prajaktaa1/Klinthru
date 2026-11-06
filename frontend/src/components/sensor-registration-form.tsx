"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { ApiError, fetchPipelines, fetchSensorRegistrationOptions, type SensorRegistrationOption, createDeviceRecord, isBackendUnavailableError, isUnauthorizedError } from "@/lib/apiClient";
import { DeviceInput, DeviceRecord, DeviceStatus, DeviceType, PipelineRecord } from "@/lib/types";
import { Panel } from "@/components/ui";

const deviceTypes: DeviceType[] = [
  "Flow Meter", "Level Switch", "Pressure Transmitter", "Temperature Sensor",
  "Discharge Sensor", "Flow Control Valve", "CP Monitoring Module", "Pressure Relief Valve (PRV)"
];
const statuses: DeviceStatus[] = ["Active", "Inactive", "Fault"];
const emptyForm: DeviceInput = {
  deviceId: "", deviceType: "Flow Meter", pipelineOrLocation: "Unassigned",
  status: "Inactive", latestReadingOrState: "Not Available", unit: ""
};
const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slateblue-400 focus:ring-4 focus:ring-slateblue-100";

export function SensorRegistrationForm({ onRegistered, onUnauthorized, onCancel, onBusyChange }: {
  onRegistered: (device: DeviceRecord) => void;
  onUnauthorized: () => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const pending = useRef(false);
  const [optionsVersion,setOptionsVersion]=useState(0);
  const [showDetails,setShowDetails]=useState(false);
  const blockersFor=(option:SensorRegistrationOption)=>option.registrationBlockers??["Automatic classification unavailable; refresh the updated backend."];
  const [form, setForm] = useState<DeviceInput>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [pipelines,setPipelines]=useState<PipelineRecord[]>([]),[pipelineId,setPipelineId]=useState(""),[options,setOptions]=useState<SensorRegistrationOption[]>([]),[assetId,setAssetId]=useState("");
  const [identityConfirmed,setIdentityConfirmed]=useState(false),[optionsError,setOptionsError]=useState(""),[optionsLoading,setOptionsLoading]=useState(false);
  const selectedAsset=options.find(option=>option.assetRecordId===assetId);
  const existingDevice=selectedAsset?.existingDevice??null;
  const demo=existingDevice?existingDevice.isDemoData:selectedAsset?.registrationClassification==="DEMO";
  useEffect(()=>{let active=true;void fetchPipelines().then(rows=>{if(active)setPipelines(rows);}).catch(()=>{if(active)setOptionsError("Saved pipeline options could not be loaded.");});return()=>{active=false;};},[]);
  useEffect(()=>{let active=true;setOptions([]);setAssetId("");setShowDetails(false);setIdentityConfirmed(false);setOptionsLoading(false);if(!pipelineId)return;setOptionsLoading(true);setOptionsError("");void fetchSensorRegistrationOptions(pipelineId).then(rows=>{if(active)setOptions(rows.filter(row=>row.pipelineId===pipelineId));}).catch(()=>{if(active)setOptionsError("Saved sensor registration options could not be loaded.");}).finally(()=>{if(active)setOptionsLoading(false);});return()=>{active=false;};},[pipelineId,optionsVersion]);
  function selectAsset(value:string){setMessage(null);setShowDetails(false);setAssetId(value);setIdentityConfirmed(false);const asset=options.find(row=>row.assetRecordId===value),saved=asset?.existingDevice;setForm(saved?{deviceId:saved.deviceId,deviceType:saved.deviceType,pipelineOrLocation:saved.pipelineOrLocation,status:saved.status,unit:saved.unit??"",latestReadingOrState:saved.latestReadingOrState}:asset&&asset.deviceType&&asset.location?{...emptyForm,deviceId:asset.assetCode,deviceType:asset.deviceType,pipelineOrLocation:asset.location}:{...emptyForm});}

  function update<Key extends keyof DeviceInput>(key: Key, value: DeviceInput[Key]) {
    setIdentityConfirmed(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if(existingDevice){setMessage({tone:"error",text:"Already Registered. View Sensor Details to inspect the saved record."});return;}
    const deviceId = form.deviceId.trim();
    if (!deviceId) {
      setMessage({ tone: "error", text: "Device ID is required." });
      return;
    }
    if(demo&&!pipelineId){setMessage({tone:"error",text:"DEMO registration requires a saved sensor asset."});return;}
    if(pipelineId&&(!selectedAsset||blockersFor(selectedAsset).length||(!demo&&!identityConfirmed)||!form.unit?.trim())){setMessage({tone:"error",text:"Select an eligible saved sensor asset, enter its engineering unit, and confirm field identity for REAL or acknowledge DEMO classification before registration."});return;}
    pending.current = true;
    setIsSaving(true);
    onBusyChange?.(true);
    setMessage(null);
    try {
      const created = await createDeviceRecord({
        ...form,
        ...(selectedAsset?{assetRecordId:selectedAsset.assetRecordId,pipelineId:selectedAsset.pipelineId,segmentRecordId:selectedAsset.segmentRecordId!,identityConfirmed}:{}),
        deviceId,
        pipelineOrLocation: form.pipelineOrLocation.trim() || "Unassigned",
        latestReadingOrState: form.latestReadingOrState.trim() || "Not Available",
        unit: form.unit?.trim() || undefined
      });
      onRegistered(created);
      setForm(emptyForm);setAssetId("");setPipelineId("");setIdentityConfirmed(false);
      setMessage({ tone: "success", text: `${created.deviceId} was registered.` });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        onUnauthorized();
        return;
      }
      const text = error instanceof ApiError && error.status === 409
        ? "That Device ID is already registered."
        : error instanceof ApiError && error.status === 403
          ? "Only Admin and Engineer roles can register sensors."
          : isBackendUnavailableError(error)
            ? "The backend could not be reached. The sensor was not registered."
            : error instanceof ApiError && error.status === 400
              ? Object.values(error.fields ?? {}).join(" ") || error.message
              : "The sensor could not be registered.";
      setMessage({ tone: "error", text });
      if(error instanceof ApiError&&error.status===409)setOptionsVersion(value=>value+1);
    } finally {
      pending.current = false;
      setIsSaving(false);
      onBusyChange?.(false);
    }
  }

  return (
    <Panel>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-900">Register Sensor</h3>
        <p className="mt-1 text-sm text-slate-500">Register saved sensor metadata. DEMO registration does not establish physical identity or connectivity.</p>
      </div>
      {message ? <div role={message.tone === "error" ? "alert" : "status"} className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div> : null}
      <div className="mb-4 space-y-3 rounded-lg border border-slate-200 p-3">
        <label className="block text-xs">Pipeline<select aria-label="Registration pipeline" value={pipelineId} disabled={isSaving} onChange={event=>{setPipelineId(event.target.value);setAssetId("");setIdentityConfirmed(false);setForm({...emptyForm});}} className={fieldClass}><option value="">Select saved pipeline</option>{pipelines.map(row=><option key={row.id} value={row.id}>{row.pipelineCode}</option>)}</select></label>
        {pipelineId?<label className="block text-xs">Saved Sensor Asset<select aria-label="Registration Sensor Asset" value={assetId} disabled={isSaving||optionsLoading} onChange={event=>selectAsset(event.target.value)} className={fieldClass}><option value="">{optionsLoading?"Loading saved assets...":demo?"Select saved sensor asset":"Select saved sensor asset"}</option>{options.map(row=><option key={row.assetRecordId} value={row.assetRecordId} disabled={!row.existingDevice&&Boolean(blockersFor(row).length)}>{row.assetCode} / {row.segmentCode??"No segment"} / KP {row.kp??"Unknown"}{row.existingDevice?" - Already Registered":blockersFor(row).length?" - "+blockersFor(row).join(" "):" - "+row.registrationClassification}</option>)}</select></label>:null}
        {options.some(row=>!Array.isArray(row.registrationBlockers))?<p role="alert" className="text-xs text-rose-700">The connected backend has not supplied automatic classification. Reload the updated local backend and reopen this form. Registration remains blocked.</p>:null}
        {optionsError?<p role="alert" className="text-xs text-rose-700">{optionsError}</p>:null}
        {selectedAsset&&!existingDevice&&!demo?<label className="block text-xs"><input type="checkbox" aria-label="Confirm verified sensor identity" checked={identityConfirmed} disabled={isSaving} onChange={event=>setIdentityConfirmed(event.target.checked)}/> I have verified the physical device code, type, engineering unit and inventory status against nameplate/commissioning evidence. This confirms registry metadata only.</label>:null}
      </div>
      {existingDevice?<section className="mb-4 rounded-lg border border-slate-200 p-3" aria-label="Existing registered sensor">
       <div className="flex items-center justify-between gap-2"><span role="status" className="text-sm font-semibold">Already Registered</span><button type="button" aria-expanded={showDetails} className="text-sm font-semibold text-slateblue-700" onClick={()=>setShowDetails(value=>!value)}>View Sensor Details</button></div>
       {showDetails?<dl aria-label="Registered sensor details" className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{[["Sensor ID",existingDevice.deviceId],["Sensor Type",existingDevice.deviceType],["Saved Location",existingDevice.pipelineOrLocation],["Inventory Status",existingDevice.status],["Engineering Unit",existingDevice.unit],["Data Classification",existingDevice.isDemoData?"DEMO":"REAL"],["Registry Updated",existingDevice.lastUpdatedAt]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value||"Not Available"}</dd></div>)}</dl>:null}
      </section>:null}
      <form aria-busy={isSaving} onSubmit={(event) => void submit(event)}>
        <fieldset disabled={isSaving} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">Device ID *<input className={`${fieldClass} mt-2`} maxLength={120} required readOnly={Boolean(selectedAsset)} value={form.deviceId} onChange={(event) => update("deviceId", event.target.value)} /></label>
          <label className="text-xs font-medium text-slate-700">Sensor Type *<select className={`${fieldClass} mt-2`} disabled={Boolean(selectedAsset)} value={form.deviceType} onChange={(event) => update("deviceType", event.target.value as DeviceType)}>{deviceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Inventory status (not connectivity) *<select className={`${fieldClass} mt-2`} disabled={demo||Boolean(existingDevice)} value={form.status} onChange={(event) => update("status", event.target.value as DeviceStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Location *<input className={`${fieldClass} mt-2`} maxLength={200} required readOnly={Boolean(selectedAsset)} value={form.pipelineOrLocation} onChange={(event) => update("pipelineOrLocation", event.target.value)} /></label>

          <label className="text-xs font-medium text-slate-700">Engineering Unit<input className={`${fieldClass} mt-2`} maxLength={50} readOnly={Boolean(existingDevice)} required={Boolean(pipelineId)} value={form.unit ?? ""} onChange={(event) => update("unit", event.target.value)} /></label>
          <div className="flex gap-3 md:col-span-2 xl:col-span-3">
            <button type="submit" disabled={isSaving||Boolean(existingDevice)||!pipelineId||Boolean(pipelineId&&(!selectedAsset||blockersFor(selectedAsset).length||(!demo&&!identityConfirmed)||!form.unit?.trim()))} className="rounded-2xl bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? "Registering..." : demo?"Register DEMO Sensor":"Register Sensor"}</button>
            <button type="button" disabled={isSaving} onClick={() => { setForm(emptyForm);setAssetId("");setPipelineId("");setIdentityConfirmed(false); setMessage(null); onCancel?.(); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </fieldset>
      </form>
    </Panel>
  );
}
