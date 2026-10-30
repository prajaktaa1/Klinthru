import { Panel } from "@/components/ui";

const unavailable = "Not Available";

const issueCategories = [
  "Missing Values",
  "Stale Records",
  "Range Violations",
  "Flatline Detected",
  "Bad Quality"
];

const issueStatuses = ["Open", "In Progress", "Resolved"];

function QualityMetric({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{unavailable}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verified sensor data unavailable</p>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Change: {unavailable}</p>
    </div>
  );
}

function EmptyChart({ title, legend }: { title: string; legend: string[] }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{unavailable}</span>
      </div>
      <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
        No verified sensor quality series are available.
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        {legend.map((item) => <span key={item}>* {item}</span>)}
      </div>
    </Panel>
  );
}

export function SensorDataQualityView() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          "Data Validity",
          "Data Completeness",
          "Data Freshness",
          "Missing Values",
          "Stale Records",
          "Bad Quality Readings"
        ].map((label) => <QualityMetric key={label} label={label} />)}
      </div>

      <Panel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pipeline
            <select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              <option>All Pipelines</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Sensor Type
            <select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              <option>All Types</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Status
            <select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              <option>All Statuses</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Time Period
            <select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              <option>Last 30 days</option>
            </select>
          </label>
          <button type="button" disabled className="self-end rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">
            Reset Filters
          </button>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <EmptyChart title="Data Quality Trend" legend={["Validity", "Completeness", "Freshness"]} />
        <EmptyChart title="Quality Issues by Category" legend={issueCategories} />
        <div className="xl:col-span-2"><EmptyChart title="Quality Issue Trend" legend={issueCategories} /></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sensor Data Quality</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Showing {unavailable} verified sensor quality records</p>
            </div>
            <button type="button" disabled className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">Export</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <tr>{["Sensor Name", "Pipeline", "Type", "Validity", "Completeness", "Freshness", "Issues", "Status", "Trend"].map((cell) => <th key={cell} className="px-3 py-3 font-semibold">{cell}</th>)}</tr>
              </thead>
              <tbody><tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">{unavailable} - sensor quality records are unavailable.</td></tr></tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Data Quality Issues</h3>
            <button type="button" disabled className="text-sm font-semibold text-slate-400">View All Issues</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <tr>{["Time", "Sensor Name", "Issue Type", "Message", "Status", "Actions"].map((cell) => <th key={cell} className="px-3 py-3 font-semibold">{cell}</th>)}</tr>
              </thead>
              <tbody><tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">{unavailable} - no sensor quality issues are available.</td></tr></tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            {issueStatuses.map((status) => <span key={status}>{status}</span>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
