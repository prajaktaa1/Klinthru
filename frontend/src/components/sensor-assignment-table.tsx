"use client";

import { SensorAssignmentRecord } from "@/lib/types";

import { secondaryButtonClassName } from "./sensor-assignment-form";

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: SensorAssignmentRecord["assignmentStatus"] }) {
  const className =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Fault"
        ? "bg-rose-50 text-rose-700"
        : status === "Maintenance"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

export function SensorAssignmentTable({
  assignments,
  isLoading,
  onDeactivate,
  onEdit,
  onReassign
}: {
  assignments: SensorAssignmentRecord[];
  isLoading: boolean;
  onDeactivate: (assignment: SensorAssignmentRecord) => void;
  onEdit: (assignment: SensorAssignmentRecord) => void;
  onReassign: (assignment: SensorAssignmentRecord) => void;
}) {
  const isEmpty = assignments.length === 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sensor</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Measures</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">History</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                  Loading assignments...
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                  No sensor assignments are available yet.
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => (
                <tr key={assignment.id} className="align-top transition hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{assignment.sensorId}</p>
                    <p className="mt-1 text-slate-500">{assignment.sensorName}</p>
                    <p className="mt-1 text-xs text-slate-400">{assignment.sensorDeviceType}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{assignment.sensorCategory}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{assignment.pipelineOrAsset}</p>
                    <p className="mt-1 text-slate-500">{assignment.installationLocation}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{assignment.valuesMeasured}</p>
                    <p className="mt-1 text-slate-500">{assignment.measurementUnit}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={assignment.assignmentStatus} />
                    <p className="mt-2 text-xs text-slate-400">
                      Source: {assignment.dataSource}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                    <p>Installed {formatDate(assignment.installationDate)}</p>
                    <p>Active from {formatDate(assignment.activeFrom)}</p>
                    <p>Active to {formatDate(assignment.activeTo)}</p>
                    {assignment.previousAssignmentId ? (
                      <p>Reassigned from {assignment.previousAssignmentId}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button className={smallButtonClassName} onClick={() => onEdit(assignment)} type="button">
                        Edit
                      </button>
                      <button className={smallButtonClassName} onClick={() => onReassign(assignment)} type="button">
                        Reassign
                      </button>
                      <button
                        className={smallButtonClassName}
                        disabled={assignment.assignmentStatus !== "Active"}
                        onClick={() => onDeactivate(assignment)}
                        type="button"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 bg-white p-4 md:hidden">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading assignments...</p>
        ) : isEmpty ? (
          <p className="text-sm text-slate-500">No sensor assignments are available yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{assignment.sensorId}</p>
                  <p className="mt-1 text-sm text-slate-500">{assignment.sensorName}</p>
                </div>
                <StatusBadge status={assignment.assignmentStatus} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>{assignment.sensorCategory}</p>
                <p>{assignment.pipelineOrAsset}</p>
                <p>{assignment.installationLocation}</p>
                <p>
                  {assignment.valuesMeasured} / {assignment.measurementUnit}
                </p>
                <p>Installed {formatDate(assignment.installationDate)}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className={smallButtonClassName} onClick={() => onEdit(assignment)} type="button">
                  Edit
                </button>
                <button className={smallButtonClassName} onClick={() => onReassign(assignment)} type="button">
                  Reassign
                </button>
                <button
                  className={smallButtonClassName}
                  disabled={assignment.assignmentStatus !== "Active"}
                  onClick={() => onDeactivate(assignment)}
                  type="button"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const smallButtonClassName = `${secondaryButtonClassName} px-3 py-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`;
