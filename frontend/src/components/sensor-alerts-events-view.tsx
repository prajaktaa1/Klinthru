import { Panel } from "@/components/ui";
import { SensorLifecycleCrud } from "@/components/sensor-lifecycle-crud";

const unavailable = "Not Available";
const hardwareEventTypes = ["Offline", "Weak Signal", "Low Battery", "Calibration", "Stale", "Hardware Fault"];
const eventColumns = ["Date & Time", "Severity", "Event Type", "Sensor / Device", "Asset / Location", "Message", "Status", "Actions"];

function AlertMetric({ label }: { label: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{unavailable}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verified hardware events unavailable</p><p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Change: {unavailable}</p></div>;
}

function DisabledAction({ children }: { children: string }) {
  return <button type="button" disabled className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">{children}</button>;
}

export function SensorAlertsEventsView() {
  return (
    <div className="space-y-6">
      <SensorLifecycleCrud resource="events" />
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Alerts &amp; Events Center</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitor and manage sensor device alerts, events and hardware-related issues.</p></div><DisabledAction>Export</DisabledAction></div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{["Critical", "Warning", "Info", "Open", "Acknowledged", "Resolved"].map((label) => <AlertMetric key={label} label={label} />)}</div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Events Timeline (Last 7 days)</h3><label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Show <select disabled className="ml-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950"><option>Last 7 days</option></select></label></div>
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - hardware event timeline is unavailable.</div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400"><span>* Critical</span><span>* Warning</span><span>* Info</span></div>
      </Panel>

      <Panel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><input disabled aria-label="Search events" placeholder="Search events (sensor name, event type, message...)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400 dark:border-slate-700" />{["All Severities", "All Statuses", "All Event Types", "All Assets"].map((option) => <select key={option} disabled aria-label={option} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950"><option>{option}</option></select>)}<button type="button" disabled className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-400">Clear Filters</button></div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="overflow-x-auto"><table className="min-w-[1000px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{eventColumns.map((column) => <th key={column} className="px-3 py-3 font-semibold">{column}</th>)}</tr></thead><tbody><tr><td colSpan={eventColumns.length} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">{unavailable} - hardware alert and event records are unavailable.</td></tr></tbody></table></div>
          <div className="mt-5"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Supported Hardware Event Types</h3><div className="mt-3 flex flex-wrap gap-2">{hardwareEventTypes.map((type) => <span key={type} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{type}</span>)}</div></div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Event Details</h3><button type="button" disabled aria-label="Close event details" className="text-lg text-slate-400">X</button></div>
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700"><p className="text-lg font-semibold text-slate-900 dark:text-white">{unavailable}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No hardware event is selected.</p></div>
          <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Date &amp; Time</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Sensor / Device</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Asset / Location</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Event Type</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Severity</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="text-right text-slate-900 dark:text-white">{unavailable}</dd></div></dl>
          <div className="mt-5 space-y-2 text-sm"><p className="text-slate-500">Message</p><p className="text-slate-900 dark:text-white">{unavailable}</p><p className="pt-2 text-slate-500">Possible Cause</p><p className="text-slate-900 dark:text-white">{unavailable}</p><p className="pt-2 text-slate-500">Recommended Action</p><p className="text-slate-900 dark:text-white">{unavailable}</p></div>
          <div className="mt-6 flex flex-wrap gap-2"><DisabledAction>Acknowledge</DisabledAction><DisabledAction>Resolve</DisabledAction><DisabledAction>Create Task</DisabledAction></div>
        </Panel>
      </div>
    </div>
  );
}
