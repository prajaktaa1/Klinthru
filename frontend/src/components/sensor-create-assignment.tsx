"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { SensorAssignmentForm } from "@/components/sensor-assignment-form";
import { Panel } from "@/components/ui";
import { ApiError, createSensorAssignment, isBackendUnavailableError, isUnauthorizedError } from "@/lib/apiClient";
import { DeviceRecord, SensorAssignmentInput } from "@/lib/types";

export function SensorCreateAssignment({ records, isLoading, errorMessage }: {
  records: DeviceRecord[];
  isLoading: boolean;
  errorMessage: string | null;
}) {
  const router = useRouter();
  const pending = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const devices = records.filter((record) => !record.isDemoData);

  async function handleCreate(input: SensorAssignmentInput) {
    if (pending.current) return;
    pending.current = true;
    setIsSaving(true);
    setMessage(null);
    try {
      await createSensorAssignment(input);
      setMessage({ tone: "success", text: `Assignment created for ${input.sensorId} at ${input.pipelineOrAsset}.` });
      setFormVersion((current) => current + 1);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setMessage({ tone: "error", text: "Your session has expired. Sign in again to create an assignment." });
        router.replace("/login");
        return;
      }
      const text = error instanceof ApiError && error.status === 409
        ? "This sensor already has an active assignment. Deactivate or reassign its current assignment before trying again."
        : error instanceof ApiError && error.status === 403
          ? "Only Admin and Engineer roles can create sensor assignments."
          : isBackendUnavailableError(error)
            ? "The backend could not be reached. Your entries have been kept. Check Manage assignments before retrying if the request timed out."
            : error instanceof ApiError && error.status === 400
              ? Object.values(error.fields ?? {}).join(" ") || error.message
              : "The assignment could not be saved. Your entries have been kept. Check Manage assignments before retrying; assignment storage may be unavailable.";
      setMessage({ tone: "error", text });
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Panel>
      <div className="mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Create Assignment</h3>
          <p className="mt-1 text-sm text-slate-500">Assign a registered sensor to a pipeline, asset, section, or monitoring location.</p>
          <p className="mt-2 text-xs text-slate-500">Fields marked * are required.</p>
        </div>
      </div>
      {message ? (
        <div role={message.tone === "error" ? "alert" : "status"} className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {message.text}
        </div>
      ) : null}
      <SensorAssignmentForm
        key={formVersion}
        devices={devices}
        demoDeviceCount={records.length - devices.length}
        devicesError={errorMessage}
        isDevicesLoading={isLoading}
        isSaving={isSaving}
        mode="create"
        onCancel={() => {
          setFormVersion((current) => current + 1);
          setMessage(null);
        }}
        onSubmit={handleCreate}
      />
    </Panel>
  );
}
