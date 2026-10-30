"use client";

import { Panel } from "@/components/ui";
import { BasisSummary, CP_BASIS_MISSING } from "@/lib/cp-engineering-types";

// Mid-bar colors sampled from IMG-02; exact labels stay intact, without category aliases.
const categoryColors: Record<string, string> = { "Soil & Environment": "#319e66", "Coating & Insulation": "#2f96d2", "Design Criteria": "#fdaa36", "Standards & References": "#6f6fe5", "Environmental & Third Party": "#38a3bd", "General Information": "#aab8c9" };
const statusOrder = ["Approved", "In Review", "Draft", "Overdue", "Not Required"];
export function basisCategoryColor(label: string) { return categoryColors[label] ?? "#64748b"; }
export function orderedBasisStatuses<T extends { label: string }>(items: T[]): T[] {
  const rank = (label: string) => { const index = statusOrder.indexOf(label); return index < 0 ? statusOrder.length : index; };
  return [...items].sort((a, b) => rank(a.label) - rank(b.label));
}
const statuses: Record<string, string> = { Approved: "#16a34a", "In Review": "#2563eb", Draft: "#f59e0b", Overdue: "#ef4444", "Not Required": "#64748b", Missing: "#dc2626", Other: "#475569" };
export function DesignBasisCharts({ summary }: { summary: BasisSummary | null }) {
  const categories = summary?.charts.completenessByCategory ?? [];
  const distribution = orderedBasisStatuses(summary?.charts.documentStatus ?? []);
  const total = summary?.charts.documentStatusTotal ?? 0;
  let offset = 0;
  return <div className="grid gap-4 xl:grid-cols-2">
    <Panel><h3 className="font-semibold text-slate-900 dark:text-white">Design Basis Completeness by Category</h3>
      {categories.length ? <div className="mt-4 overflow-x-auto"><svg className="min-w-[460px] w-full" viewBox={`0 0 560 ${categories.length * 34 + 58}`} role="img" aria-label="Completeness by category, fixed scale zero to one hundred percent">
        {[0, 20, 40, 60, 80, 100].map(tick => <g key={tick}><line x1={220 + tick * 2.7} x2={220 + tick * 2.7} y1={0} y2={categories.length * 34} stroke="#cbd5e1" /><text x={220 + tick * 2.7} y={categories.length * 34 + 18} textAnchor="middle" className="fill-slate-500 text-[11px]">{tick}</text></g>)}
        {categories.map((row, i) => <g key={row.key}><title>{`${row.label}: ${row.value === null ? CP_BASIS_MISSING : `${row.value}%`} (${row.numerator ?? CP_BASIS_MISSING}/${row.denominator ?? CP_BASIS_MISSING})`}</title><text x={210} y={i * 34 + 19} textAnchor="end" className="fill-slate-600 text-[11px] dark:fill-slate-300">{row.label}</text><rect x={220} y={i * 34 + 7} width={(row.value ?? 0) * 2.7} height={17} fill={basisCategoryColor(row.label)} /><text x={500} y={i * 34 + 20} className="fill-slate-600 text-[11px] dark:fill-slate-300">{row.value === null ? "Unavailable" : `${row.value}%`}</text></g>)}
        <text x={355} y={categories.length * 34 + 46} textAnchor="middle" className="fill-slate-600 text-[12px] dark:fill-slate-300">Completeness (%)</text>
      </svg></div> : <p className="mt-4 text-sm text-slate-500">{CP_BASIS_MISSING}</p>}
    </Panel>
    <Panel><h3 className="font-semibold text-slate-900 dark:text-white">Design Basis Document Status</h3>
      <p className="mt-1 text-xs text-slate-500">Evidence requirements; distinct document count is shown separately.</p>
      {total > 0 ? <div className="mt-4 flex flex-wrap items-center gap-5"><div className="relative h-40 w-40"><svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${total} evidence requirements by status`}>
        {distribution.map(item => { const length = item.count / total * 264; const start = offset; offset += length; return <circle key={item.label} cx={60} cy={60} r={42} fill="none" stroke={statuses[item.label] ?? "#475569"} strokeWidth={18} strokeDasharray={`${length} ${264 - length}`} strokeDashoffset={-start}><title>{`${item.label}: ${item.count} (${item.percent}%)`}</title></circle>; })}
      </svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{total}</strong><span className="text-sm">Total</span></div></div><ul className="min-w-0 flex-1 space-y-2 text-sm">{distribution.map(item => <li key={item.label} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: statuses[item.label] ?? "#475569" }} /><span className="flex-1">{item.label}</span><span>{item.count} ({item.percent}%)</span></li>)}</ul></div> : <p className="mt-4 text-sm text-slate-500">{CP_BASIS_MISSING}</p>}
    </Panel>
  </div>;
}
