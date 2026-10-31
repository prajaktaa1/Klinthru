"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createInspectionRecord, updateInspectionRecord, type InspectionRecord, type InspectionRecordInput } from "@/lib/apiClient";
import type { AssetMasterSegmentRecord } from "@/lib/types";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";
export function InspectionRecordForm({ pipelineId, segments, initial, onClose, onSaved }: {
  pipelineId: string; segments: AssetMasterSegmentRecord[]; initial?: InspectionRecord; onClose: () => void; onSaved: (record: InspectionRecord) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState<InspectionRecordInput>(initial ? { pipelineId: initial.pipelineId, reference: initial.reference, type: initial.type, date: initial.date, segmentId: initial.segmentId, vendor: initial.vendor, findings: initial.findings, status: initial.status, nextDue: initial.nextDue, risk: initial.risk } : { pipelineId, reference: "", type: "Visual Inspection", date: "", segmentId: "", vendor: "", findings: "", status: "Completed", nextDue: "", risk: "" });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const update = (key: keyof InspectionRecordInput, value: string) => setInput((previous) => ({ ...previous, [key]: value }));
  return <dialog ref={dialog} aria-labelledby="add-inspection-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} className="max-h-[90vh] w-[94vw] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 backdrop:bg-slate-950/50">
    <div className="mb-4 flex items-center justify-between"><h2 id="add-inspection-title" className="text-lg font-semibold text-slate-900">{initial ? "Edit Inspection Record" : "Add Inspection Record"}</h2><button type="button" disabled={saving} aria-label="Close inspection form" onClick={onClose}><X size={20} /></button></div>
    <form onSubmit={async (event) => {
      event.preventDefault(); if (saving) return;
      setSaving(true); setError("");
      try { onSaved(initial ? await updateInspectionRecord(initial.id, input) : await createInspectionRecord(input)); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save inspection record."); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Record Reference *<input required maxLength={200} value={input.reference} onChange={(event) => update("reference", event.target.value)} className={field} autoFocus /></label>
        <label className="text-xs font-semibold text-slate-600">Inspection Type *<select value={input.type} onChange={(event) => update("type", event.target.value)} className={field}>{["Visual Inspection", "ILI", "ECDA", "CP Survey", "UT Inspection", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Inspection Date *<input required type="date" value={input.date} onChange={(event) => update("date", event.target.value)} className={field} /></label>
        <label className="text-xs font-semibold text-slate-600">Segment<select value={input.segmentId} onChange={(event) => update("segmentId", event.target.value)} className={field}><option value="">Whole pipeline</option>{segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.segmentId}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Contractor / Vendor<input maxLength={200} value={input.vendor} onChange={(event) => update("vendor", event.target.value)} className={field} /></label>
        <label className="text-xs font-semibold text-slate-600">Status<select value={input.status} onChange={(event) => update("status", event.target.value)} className={field}>{["Planned", "In Progress", "Completed", "Cancelled"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Next Due Date<input type="date" min={input.date || undefined} value={input.nextDue} onChange={(event) => update("nextDue", event.target.value)} className={field} /></label>
        <label className="text-xs font-semibold text-slate-600">Risk<select value={input.risk} onChange={(event) => update("risk", event.target.value)} className={field}><option value="">Not assessed</option>{["Low", "Medium", "High"].map((risk) => <option key={risk}>{risk}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Findings / Notes<textarea rows={3} maxLength={5000} value={input.findings} onChange={(event) => update("findings", event.target.value)} className={field} /></label>
      </fieldset>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-slateblue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : initial ? "Update Inspection Record" : "Save Inspection Record"}</button></div>
    </form>
  </dialog>;
}
