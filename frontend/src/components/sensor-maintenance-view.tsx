import { Panel } from "@/components/ui";

const unavailable = "Not Available";
const taskStatuses = ["Completed", "In Progress", "Pending", "Cancelled"];
const maintenanceColumns = ["Sensor ID", "Sensor Type", "Maintenance Type", "Priority", "Planned Date", "Due Date", "Status", "Work Order", "Assigned To", "Actions"];

function MaintenanceMetric({ label }: { label: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{unavailable}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verified maintenance data unavailable</p></div>;
}

function DisabledAction({ children }: { children: string }) {
  return <button type="button" disabled className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">{children}</button>;
}

function EmptyVisualization({ title, detail }: { title: string; detail: string }) {
  return <Panel><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3><div className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{detail}</div></Panel>;
}

export function SensorMaintenanceView() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{["Maintenance Overview", "Total Tasks", "Preventive Maintenance", "Corrective Maintenance", "Overdue", "Due (Next 30 days)", "Scheduled"].map((label) => <MaintenanceMetric key={label} label={label} />)}</div>

      <div className="grid gap-6 xl:grid-cols-3">
        <EmptyVisualization title="Maintenance Overview" detail={`${unavailable} - maintenance task totals and type distribution are unavailable.`} />
        <Panel>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Maintenance</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Scheduled sensor maintenance.</p></div><DisabledAction>View All</DisabledAction></div>
          <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - upcoming maintenance is unavailable.</div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Overdue Maintenance</h3></div><DisabledAction>View All</DisabledAction></div>
          <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - overdue maintenance is unavailable.</div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Work Order Status</h3><div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - work order status is unavailable.</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">{taskStatuses.map((status) => <span key={status}>{status}: {unavailable}</span>)}</div></Panel>
        <Panel><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Parts Replaced</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Last 90 days</p></div></div><div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - parts history is unavailable.</div></Panel>
        <EmptyVisualization title="Maintenance Trend" detail="Not Available - maintenance trend data is unavailable." />
        <Panel><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Technicians / Contractors</h3><DisabledAction>View All</DisabledAction></div><div className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{unavailable} - personnel assignments are unavailable.</div></Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Maintenance Tasks</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View and manage sensor maintenance tasks.</p></div><DisabledAction>Export</DisabledAction></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input disabled aria-label="Search maintenance tasks" placeholder="Search by Sensor ID, Work Order, or Assigned To..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400 dark:border-slate-700" />{["All Types", "All Priorities", "All Statuses", "Select Date Range"].map((option) => <select key={option} disabled aria-label={option} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950"><option>{option}</option></select>)}</div>
        <div className="mt-4 overflow-x-auto"><table className="min-w-[1100px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{maintenanceColumns.map((column) => <th key={column} className="px-3 py-3 font-semibold">{column}</th>)}</tr></thead><tbody><tr><td colSpan={maintenanceColumns.length} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">{unavailable} - maintenance task records are unavailable.</td></tr></tbody></table></div>
      </Panel>
    </div>
  );
}
