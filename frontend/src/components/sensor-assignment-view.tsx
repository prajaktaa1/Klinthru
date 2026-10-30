"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Panel, StatCard } from "@/components/ui";
import {
  createSensorAssignment,
  deactivateSensorAssignment,
  fetchDeviceRecords,
  fetchSensorAssignments,
  isBackendUnavailableError,
  isUnauthorizedError,
  reassignSensorAssignment,
  updateSensorAssignment
} from "@/lib/apiClient";
import {
  assignmentStatuses,
  dataSources,
  sensorAssignmentCategories,
  sensorDeviceTypesByCategory
} from "@/lib/sensor-assignment-options";
import {
  SensorAssignmentCategory,
  SensorAssignmentInput,
  SensorAssignmentRecord,
  DeviceRecord
} from "@/lib/types";

import { inputClassName, ModernSelect, SensorAssignmentForm } from "./sensor-assignment-form";
import { SensorAssignmentTable } from "./sensor-assignment-table";

type FormMode = "create" | "edit" | "reassign";

export function SensorAssignmentView() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<SensorAssignmentRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [demoDeviceCount, setDemoDeviceCount] = useState(0);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<SensorAssignmentRecord | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    sensorCategory: "",
    sensorDeviceType: "",
    assignmentStatus: "",
    dataSource: "",
    pipelineOrAsset: ""
  });

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const fetched = await fetchSensorAssignments(filters);
      setAssignments(fetched);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.replace("/login");
        return;
      }

      if (isBackendUnavailableError(error)) {
        setMessage({
          tone: "error",
          text: "Sensor assignments are unavailable because the backend could not be reached."
        });
      } else {
        setMessage({ tone: "error", text: "Sensor assignments could not be loaded." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      setIsDevicesLoading(true);
      setDevicesError(null);

      try {
        const fetched = await fetchDeviceRecords();
        if (isMounted) {
          setDevices(fetched.filter((device) => !device.isDemoData));
          setDemoDeviceCount(fetched.filter((device) => device.isDemoData).length);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorizedError(error)) {
          router.replace("/login");
          return;
        }

        setDevicesError(
          isBackendUnavailableError(error)
            ? "Registered sensors are unavailable because the backend could not be reached."
            : "Registered sensors could not be loaded."
        );
      } finally {
        if (isMounted) {
          setIsDevicesLoading(false);
        }
      }
    }

    void loadDevices();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const deviceTypeOptions = useMemo(() => {
    if (filters.sensorCategory) {
      return sensorDeviceTypesByCategory[filters.sensorCategory as SensorAssignmentCategory] || [];
    }

    return Array.from(new Set(Object.values(sensorDeviceTypesByCategory).flat()));
  }, [filters.sensorCategory]);

  const totals = assignments.reduce(
    (current, assignment) => ({
      total: current.total + 1,
      active: current.active + (assignment.assignmentStatus === "Active" ? 1 : 0),
      inactive: current.inactive + (assignment.assignmentStatus === "Inactive" ? 1 : 0),
      history: current.history + (assignment.activeTo || assignment.previousAssignmentId ? 1 : 0)
    }),
    { total: 0, active: 0, inactive: 0, history: 0 }
  );

  async function handleSubmit(assignment: SensorAssignmentInput) {
    setIsSaving(true);
    setMessage(null);

    try {
      if (formMode === "edit" && selectedAssignment) {
        await updateSensorAssignment(selectedAssignment.id, assignment);
        setMessage({ tone: "success", text: "Sensor assignment updated." });
      } else if (formMode === "reassign" && selectedAssignment) {
        await reassignSensorAssignment(selectedAssignment.id, assignment);
        setMessage({ tone: "success", text: "Sensor reassigned and assignment history preserved." });
      } else {
        await createSensorAssignment(assignment);
        setMessage({ tone: "success", text: "Sensor assignment created." });
      }

      setFormMode("create");
      setSelectedAssignment(null);
      await loadAssignments();
    } catch (error) {
      const isDuplicateActive = error instanceof Error && error.message.includes("409");
      setMessage({
        tone: "error",
        text: isDuplicateActive
          ? "This sensor already has an active assignment. Deactivate or reassign the current assignment first."
          : "Sensor assignment could not be saved."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(assignment: SensorAssignmentRecord) {
    setIsSaving(true);
    setMessage(null);

    try {
      await deactivateSensorAssignment(assignment.id);
      setMessage({ tone: "success", text: "Sensor assignment deactivated." });
      await loadAssignments();
    } catch {
      setMessage({ tone: "error", text: "Sensor assignment could not be deactivated." });
    } finally {
      setIsSaving(false);
    }
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "sensorCategory" ? { sensorDeviceType: "" } : {})
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assignments" value={isLoading ? "..." : totals.total} tone="blue" />
        <StatCard label="Active" value={isLoading ? "..." : totals.active} tone="green" />
        <StatCard label="Inactive" value={isLoading ? "..." : totals.inactive} tone="red" />
        <StatCard label="History" value={isLoading ? "..." : totals.history} tone="amber" />
      </div>

      {message ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm leading-6 shadow-sm ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Panel>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              {formMode === "edit"
                ? "Edit Assignment"
                : formMode === "reassign"
                  ? "Reassign Sensor"
                  : "Create Assignment"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Assign existing sensors to pipelines, assets, sections, or monitoring locations.
            </p>
          </div>
        </div>

        <SensorAssignmentForm
          devices={devices}
          demoDeviceCount={demoDeviceCount}
          devicesError={devicesError}
          isDevicesLoading={isDevicesLoading}
          isSaving={isSaving}
          mode={formMode}
          onCancel={() => {
            setFormMode("create");
            setSelectedAssignment(null);
          }}
          onSubmit={handleSubmit}
          selectedAssignment={selectedAssignment}
        />
      </Panel>

      <Panel>
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Assignment Register</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search current and historical sensor assignments.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              className={inputClassName}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search"
              value={filters.search}
            />
            <ModernSelect
              compact
              label="Sensor category filter"
              onChange={(value) => updateFilter("sensorCategory", value)}
              options={["All categories", ...sensorAssignmentCategories]}
              value={filters.sensorCategory || "All categories"}
              valueMap={{ "All categories": "" }}
            />
            <ModernSelect
              compact
              label="Sensor/device type filter"
              onChange={(value) => updateFilter("sensorDeviceType", value)}
              options={["All Types", ...deviceTypeOptions]}
              value={filters.sensorDeviceType || "All Types"}
              valueMap={{ "All Types": "" }}
            />
            <ModernSelect
              compact
              label="Assignment status filter"
              onChange={(value) => updateFilter("assignmentStatus", value)}
              options={["All Statuses", ...assignmentStatuses]}
              value={filters.assignmentStatus || "All Statuses"}
              valueMap={{ "All Statuses": "" }}
            />
            <ModernSelect
              compact
              label="Data source filter"
              onChange={(value) => updateFilter("dataSource", value)}
              options={["All sources", ...dataSources]}
              value={filters.dataSource || "All sources"}
              valueMap={{ "All sources": "" }}
            />
            <input
              className={inputClassName}
              onChange={(event) => updateFilter("pipelineOrAsset", event.target.value)}
              placeholder="Pipeline or asset"
              value={filters.pipelineOrAsset}
            />
          </div>
        </div>

        <SensorAssignmentTable
          assignments={assignments}
          isLoading={isLoading}
          onDeactivate={(assignment) => {
            void handleDeactivate(assignment);
          }}
          onEdit={(assignment) => {
            setSelectedAssignment(assignment);
            setFormMode("edit");
          }}
          onReassign={(assignment) => {
            setSelectedAssignment(assignment);
            setFormMode("reassign");
          }}
        />
      </Panel>
    </div>
  );
}
