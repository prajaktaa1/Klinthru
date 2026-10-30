"use client";

import { FormEvent, useRef, useState } from "react";

import { ApiError, createDeviceRecord, isBackendUnavailableError, isUnauthorizedError } from "@/lib/apiClient";
import { DeviceInput, DeviceRecord, DeviceStatus, DeviceType } from "@/lib/types";
import { Panel } from "@/components/ui";

const deviceTypes: DeviceType[] = [
  "Flow Meter", "Level Switch", "Pressure Transmitter", "Temperature Sensor",
  "Discharge Sensor", "Flow Control Valve", "CP Monitoring Module", "Pressure Relief Valve (PRV)"
];
const statuses: DeviceStatus[] = ["Active", "Inactive", "Fault"];
const emptyForm: DeviceInput = {
  deviceId: "", deviceType: "Flow Meter", pipelineOrLocation: "Unassigned",
  status: "Active", latestReadingOrState: "Not commissioned", unit: ""
};
const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slateblue-400 focus:ring-4 focus:ring-slateblue-100";

export function SensorRegistrationForm({ onRegistered, onUnauthorized }: {
  onRegistered: (device: DeviceRecord) => void;
  onUnauthorized: () => void;
}) {
  const pending = useRef(false);
  const [form, setForm] = useState<DeviceInput>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function update<Key extends keyof DeviceInput>(key: Key, value: DeviceInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const deviceId = form.deviceId.trim();
    if (!deviceId) {
      setMessage({ tone: "error", text: "Device ID is required." });
      return;
    }
    pending.current = true;
    setIsSaving(true);
    setMessage(null);
    try {
      const created = await createDeviceRecord({
        ...form,
        deviceId,
        pipelineOrLocation: form.pipelineOrLocation.trim() || "Unassigned",
        latestReadingOrState: form.latestReadingOrState.trim() || "Not commissioned",
        unit: form.unit?.trim() || undefined
      });
      onRegistered(created);
      setForm(emptyForm);
      setMessage({ tone: "success", text: `${created.deviceId} was registered and is now available for assignment.` });
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
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Panel>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-900">Register Sensor</h3>
        <p className="mt-1 text-sm text-slate-500">Create a real device record before assigning it to an operational location.</p>
      </div>
      {message ? <div role={message.tone === "error" ? "alert" : "status"} className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.text}</div> : null}
      <form aria-busy={isSaving} onSubmit={(event) => void submit(event)}>
        <fieldset disabled={isSaving} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">Device ID *<input className={`${fieldClass} mt-2`} maxLength={120} required value={form.deviceId} onChange={(event) => update("deviceId", event.target.value)} /></label>
          <label className="text-xs font-medium text-slate-700">Sensor/device type *<select className={`${fieldClass} mt-2`} value={form.deviceType} onChange={(event) => update("deviceType", event.target.value as DeviceType)}>{deviceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Initial status *<select className={`${fieldClass} mt-2`} value={form.status} onChange={(event) => update("status", event.target.value as DeviceStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Stored location *<input className={`${fieldClass} mt-2`} maxLength={200} required value={form.pipelineOrLocation} onChange={(event) => update("pipelineOrLocation", event.target.value)} /></label>
          <label className="text-xs font-medium text-slate-700">Initial reading/state *<input className={`${fieldClass} mt-2`} maxLength={200} required value={form.latestReadingOrState} onChange={(event) => update("latestReadingOrState", event.target.value)} /></label>
          <label className="text-xs font-medium text-slate-700">Unit (optional)<input className={`${fieldClass} mt-2`} maxLength={50} value={form.unit ?? ""} onChange={(event) => update("unit", event.target.value)} /></label>
          <div className="flex gap-3 md:col-span-2 xl:col-span-3">
            <button type="submit" disabled={isSaving} className="rounded-2xl bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? "Registering..." : "Register Sensor"}</button>
            <button type="button" disabled={isSaving} onClick={() => { setForm(emptyForm); setMessage(null); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button>
          </div>
        </fieldset>
      </form>
    </Panel>
  );
}
