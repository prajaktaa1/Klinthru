import { Panel } from "@/components/ui";
import { SensorLifecycleCrud } from "@/components/sensor-lifecycle-crud";

const unavailable = "Not Available";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calibrationStatuses = ["Valid", "Due Soon", "Due", "Overdue", "Failed"];
const certificateStatuses = ["Valid Certificates", "Expiring Soon (<= 30 days)", "Expired"];
const calibrationColumns = ["Sensor ID", "Channel", "Type", "Asset / Location", "Last Calibration", "Next Due", "Status", "Provider", "Result", "Certificate", "Actions"];

function CalibrationMetric({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{unavailable}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verified calibration data unavailable</p>
    </div>
  );
}

function DisabledAction({ children }: { children: string }) {
  return <button type="button" disabled className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">{children}</button>;
}

export function SensorCalibrationView() {
  return (
    <div className="space-y-6">
      <SensorLifecycleCrud resource="calibrations" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["Calibration Status Overview", ...calibrationStatuses].map((label) => <CalibrationMetric key={label} label={label} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel>
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calibration Status Overview</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current calibration status for all sensors.</p></div><span className="text-right text-xs text-slate-500 dark:text-slate-400">Total Sensors<br /><strong className="text-lg text-slate-900 dark:text-white">{unavailable}</strong></span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{calibrationStatuses.map((status) => <div key={status} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{status}</p><p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{unavailable}</p></div>)}</div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calibration Certificates</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage and view calibration certificates.</p></div><DisabledAction>View All</DisabledAction></div>
          <div className="mt-5 grid gap-3">{certificateStatuses.map((status) => <div key={status} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700"><span className="text-sm text-slate-700 dark:text-slate-200">{status}</span><strong className="text-slate-900 dark:text-white">{unavailable}</strong></div>)}</div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Calibration Activity</h3><DisabledAction>View All</DisabledAction></div>
          <div className="mt-5 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - no calibration activity is available.</div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calibration Schedule</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upcoming and overdue calibrations.</p></div><span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{unavailable}</span></div>
        <div className="mt-5 overflow-x-auto"><div className="min-w-[560px] rounded-xl border border-slate-200 dark:border-slate-700"><div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">{weekdays.map((day) => <div key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</div>)}</div><div className="flex min-h-48 items-center justify-center p-5 text-sm text-slate-500 dark:text-slate-400">{unavailable} - calibration dates are unavailable.</div></div></div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">{["Due Soon", "Due", "Overdue", "Completed"].map((item) => <span key={item}>* {item}</span>)}</div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sensor Calibration List</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View and manage calibration details for all sensors.</p></div><div className="flex gap-2"><input disabled aria-label="Search sensors" placeholder="Search sensors..." className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400 dark:border-slate-700" /><DisabledAction>Filters</DisabledAction><DisabledAction>Export</DisabledAction></div></div>
        <div className="mt-4 overflow-x-auto"><table className="min-w-[1100px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{calibrationColumns.map((column) => <th key={column} className="px-3 py-3 font-semibold">{column}</th>)}</tr></thead><tbody><tr><td colSpan={calibrationColumns.length} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">{unavailable} - calibration records are unavailable.</td></tr></tbody></table></div>
      </Panel>
    </div>
  );
}
