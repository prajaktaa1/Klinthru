"use client";

import { useEffect, useState } from "react";
import { Panel, StatCard } from "@/components/ui";
import { fetchRiskTreatments, fetchRiskTreatmentSummary, fetchRiskTreatment } from "@/lib/apiClient";
import type { RiskOverview } from "@/lib/risk-assessment-types";
import type { TreatmentActionRow, TreatmentDetail, TreatmentFilters, TreatmentListRow, TreatmentPage, TreatmentSummary } from "@/lib/risk-treatment-types";

const missing = "MISSING FIELD — APPROVAL NEEDED";
const unavailable = "Unavailable";
type Filters = { q: string; status: string; riskLevel: string; pipelineId: string; page: number; pageSize: number; basis: "" | "proposed" | "approved" | "verified" };
type Selection = { treatmentId: string; revisionId: string } | null;
const initialFilters: Filters = { q: "", status: "", riskLevel: "", pipelineId: "", page: 1, pageSize: 10, basis: "" };
const stages = ["Prepared by", "Reviewed by", "Approved by", "Implementation", "Effectiveness Review"];

export function treatmentMoney(amount: string | null | undefined, currency: string | null | undefined) {
  if (!amount || !currency || !/^\d+(\.\d+)?$/.test(amount)) return unavailable;
  const [whole, fraction] = amount.split(".");
  return `${currency === "USD" ? "$" : currency + " "}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? "." + fraction : ""}`;
}
function date(value: string | null | undefined) {
  if (!value || Number.isNaN(new Date(value).getTime())) return unavailable;
  const parts = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(value));
  return ["day", "month", "year"].map(key => parts.find(part => part.type === key)?.value).join(" ");
}
function Glyph({ kind }: { kind: "tool" | "chart" | "scale" | "target" | "users" | "search" | "filter" }) {
  const paths = { tool: "M14 3a6 6 0 0 0 7 7l-8 8-4-4 8-8M9 14l-6 6 2 2 6-6", chart: "M4 20V12h3v8M11 20V7h3v13M18 20V3h3v17", scale: "M12 3v18M5 21h14M3 7h18M5 7l-3 8h6L5 7Zm14 0-3 8h6l-3-8Z", target: "M21 12a9 9 0 1 1-9-9m0 5a4 4 0 1 0 4 4m-4 0L22 2m-4 0h4v4", users: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 11v-4a6 6 0 0 1 12 0v4m4-16a3 3 0 0 1 0 6m-1 5h6m-3-3v6", search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 7 7", filter: "M3 4h18l-7 8v8l-4-2v-6L3 4Z" };
  return <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}
function Heading({ title, icon, children }: { title: string; icon: Parameters<typeof Glyph>[0]["kind"]; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="text-slateblue-600"><Glyph kind={icon} /></span>{title}</h3>{children}</div>;
}
function Notice({ reason, compact = false }: { reason?: string | null; compact?: boolean }) {
  return <div role="status" className={`${compact ? "p-3" : "px-4 py-8"} text-center text-xs leading-5 text-slate-500`}><p className="font-semibold">{unavailable}</p><p>{reason || `${missing}: authoritative records or approved rules.`}</p></div>;
}
function Badge({ value, kind = "status" }: { value?: string | null; kind?: "status" | "benefit" | "risk" }) {
  const color = kind === "status" ? ({ Open: "bg-emerald-100 text-emerald-800", "In Progress": "bg-blue-100 text-blue-700", "Under Review": "bg-amber-100 text-amber-800", Overdue: "bg-red-100 text-red-700" } as Record<string, string>)[value ?? ""] : ({ High: "bg-red-100 text-red-700", Medium: "bg-amber-100 text-amber-800", Low: "bg-emerald-100 text-emerald-800" } as Record<string, string>)[value ?? ""];
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] ${color ?? "bg-slate-100 text-slate-700"}`}>{value || unavailable}</span>;
}
function Legend({ items }: { items: { text: string; color: string }[] }) {
  return <ul className="flex flex-wrap justify-center gap-4 px-3 py-2 text-[10px] text-slate-600">{items.map(item => <li key={item.text} className="flex items-center gap-1"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.text}</li>)}</ul>;
}
function CostChart({ summary }: { summary: TreatmentSummary | null }) {
  const rows = summary?.costReductionChart ?? [];
  const ready = summary?.cost.status === "available" && summary.reduction.status === "available" && summary.cost.currency === "USD" && summary.reduction.unit === "%" && rows.length > 0 && rows.every(row => Number.isFinite(row.cost) && row.cost >= 0 && Number.isFinite(row.reduction) && row.reduction >= 0 && row.reduction <= 100);
  const max = Math.max(1, ...rows.map(row => row.cost));
  return <Panel className="overflow-hidden p-0"><Heading title="Cost vs Risk Reduction" icon="scale" />
    {ready ? <div className="overflow-x-auto p-3"><svg viewBox="0 0 600 200" className="h-auto w-full min-w-[400px]" role="img" aria-label="Authoritative treatment cost in USD and risk reduction percent"><text x="12" y="110" transform="rotate(-90 12 110)" textAnchor="middle" className="fill-slate-500 text-[10px]">Cost (USD)</text><text x="586" y="110" transform="rotate(-90 586 110)" textAnchor="middle" className="fill-slate-500 text-[10px]">Risk Reduction (%)</text>{[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="55" x2="550" y1={160 - tick * 35} y2={160 - tick * 35} stroke="#e2e8f0" /><text x="48" y={164 - tick * 35} textAnchor="end" className="fill-slate-500 text-[9px]">{(max * tick / 4).toLocaleString()}</text><text x="557" y={164 - tick * 35} className="fill-slate-500 text-[9px]">{tick * 25}</text></g>)}{rows.map((row, index) => { const x = 55 + (index + .5) * 495 / rows.length; return <g key={row.category}><rect x={x - 12} y={160 - row.cost / max * 140} width="24" height={row.cost / max * 140} fill="#3188ff"><title>{`${row.category}: ${row.cost} USD`}</title></rect><text x={x} y="178" textAnchor="middle" className="fill-slate-600 text-[9px]">{row.category}</text></g>; })}<polyline fill="none" stroke="#00a865" strokeWidth="2" points={rows.map((row, index) => `${55 + (index + .5) * 495 / rows.length},${160 - row.reduction / 100 * 140}`).join(" ")} />{rows.map((row, index) => <circle key={row.category} cx={55 + (index + .5) * 495 / rows.length} cy={160 - row.reduction / 100 * 140} r="3" fill="#00a865"><title>{`${row.category}: ${row.reduction}%`}</title></circle>)}</svg></div> : <div className="min-h-[180px]"><p className="px-4 pt-3 text-[10px] text-slate-500">Cost (USD) · Risk Reduction (%)</p><Notice reason={summary?.cost.reason || `${missing}: cost grouping, currency and reduction metric.`} /></div>}
    <Legend items={[{ text: "Mitigation Cost (USD)", color: "#3188ff" }, { text: "Risk Reduction (%)", color: "#00a865" }]} />
  </Panel>;
}
function ResidualChart({ summary }: { summary: TreatmentSummary | null }) {
  const rows = summary?.residualProfile ?? [];
  const ready = rows.length > 0 && summary?.reduction.status === "available" && rows.every(row => Number.isInteger(row.before) && row.before >= 0 && Number.isInteger(row.after) && row.after >= 0) && rows.reduce((n, row) => n + row.before, 0) === rows.reduce((n, row) => n + row.after, 0);
  const max = Math.max(1, ...rows.flatMap(row => [row.before, row.after]));
  return <Panel className="overflow-hidden p-0"><Heading title="Residual Risk Profile (Before vs After)" icon="chart" />{ready ? <div className="overflow-x-auto p-3"><svg viewBox="0 0 600 200" className="h-auto w-full min-w-[400px]" role="img" aria-label="Comparable risk population before and after mitigation"><text x="14" y="100" transform="rotate(-90 14 100)" textAnchor="middle" className="fill-slate-500 text-[10px]">Number of Risks</text>{[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="50" x2="575" y1={160 - tick * 35} y2={160 - tick * 35} stroke="#e2e8f0" /><text x="43" y={164 - tick * 35} textAnchor="end" className="fill-slate-500 text-[9px]">{Math.ceil(max * tick / 4)}</text></g>)}{rows.map((row, index) => { const x = 50 + (index + .5) * 525 / rows.length; return <g key={row.level}><rect x={x - 30} y={160 - row.before / max * 140} width="26" height={row.before / max * 140} fill="#ff4b4b" /><rect x={x + 4} y={160 - row.after / max * 140} width="26" height={row.after / max * 140} fill="#10b981" /><text x={x - 17} y={154 - row.before / max * 140} textAnchor="middle" className="fill-slate-900 text-[10px]">{row.before}</text><text x={x + 17} y={154 - row.after / max * 140} textAnchor="middle" className="fill-slate-900 text-[10px]">{row.after}</text><text x={x} y="180" textAnchor="middle" className="fill-slate-600 text-[10px]">{row.level}</text></g>; })}</svg></div> : <div className="min-h-[180px]"><p className="px-4 pt-3 text-[10px] text-slate-500">Number of Risks · {summary?.basis || "Comparison basis not selected"}</p><Notice reason={summary?.reduction.reason || `${missing}: matched baseline/outcome population and approved comparison basis.`} /></div>}<Legend items={[{ text: "Before Mitigation", color: "#ff4b4b" }, { text: "After Mitigation", color: "#10b981" }]} /></Panel>;
}

export type RiskTreatmentViewProps = { page: TreatmentPage | null; summary: TreatmentSummary | null; detail: TreatmentDetail | null; riskOverview: RiskOverview | null; filters: Filters; loading: boolean; detailLoading: boolean; error: string | null;
  selectedAction: TreatmentActionRow | null; selection: Selection; workflowExpanded: boolean;
  onFilters(value: Partial<Filters>): void; onSelectAction(action: TreatmentActionRow): void; onSelectTreatment(value: Selection): void; onClose(): void; onWorkflow(): void;
};
export function RiskTreatmentView(props: RiskTreatmentViewProps) {
  const { page, summary, detail, riskOverview, filters, loading, selectedAction, selection } = props;
  const risk = riskOverview?.status === "available" ? riskOverview.summary : null;
  const item = !props.detailLoading && detail?.status === "available" && detail.item?.treatmentId === selection?.treatmentId && detail.item?.revisionId === selection?.revisionId ? detail.item : null;
  const actions = page?.actions.status === "available" ? page.actions.items : [];
  const actionReady = !loading && page?.actions.status === "available";
  const total = actionReady ? page!.actions.total : null;
  const pages = total === null ? null : Math.max(1, Math.ceil(total / filters.pageSize));
  const actionCounts = summary?.actions.status === "available" ? summary.actions : null;
  const actionCount = (label: string) => actionCounts ? actionCounts.byStatus.find(value => value.label === label)?.count ?? 0 : unavailable;
  const choices = selectedAction ? selectedAction.treatmentLinks : page?.items ?? [];
  const alarp = item?.alarpAssessments ?? [];
  const emptyReason = props.error || page?.actions.reason || page?.reason || `${missing}: Central Action Register and treatment data.`;
  const unavailableTitle = `${missing}: authoritative workflow. No write or success is performed.`;
  const field = (label: string, value: React.ReactNode) => <div key={label} className="grid grid-cols-[minmax(105px,1fr)_1.6fr] gap-3 py-1 text-xs"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words text-slate-800">{value || unavailable}</dd></div>;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{([ ["Total Risks", risk?.total, "blue"], ["High Risk", risk?.high, "red"], ["Medium Risk", risk?.medium, "amber"], ["Low Risk", risk?.low, "green"], ["Overdue Reviews", risk?.overdueReviews, "blue"] ] as const).map(([label, value, tone]) => <StatCard key={label} label={label} value={value ?? unavailable} tone={tone} />)}</div>
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><label>Residual comparison basis <select aria-label="Residual comparison basis" value={filters.basis} onChange={event => props.onFilters({ basis: event.target.value as Filters["basis"] })} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"><option value="">Select basis</option><option value="proposed">Proposed</option><option value="approved">Approved forecast</option><option value="verified">Verified outcome</option></select></label><span>Forecast approval and action completion do not establish verified residual risk.</span></div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.45fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
          <Panel className="overflow-hidden p-0"><Heading title="Mitigation Actions" icon="tool" /><div className="p-4"><p className="text-2xl font-semibold text-slate-900">{actionCounts?.total ?? unavailable}</p><p className="text-xs text-slate-500">Total Actions</p><div className="mt-4 grid grid-cols-4 gap-1 text-center text-xs">{["Open", "In Progress", "Under Review"].map(label => <div key={label}><p className="font-semibold">{actionCount(label)}</p><span className="text-[10px] text-slate-500">{label}</span></div>)}<div><p className="font-semibold">{actionCounts?.overdue ?? unavailable}</p><span className="text-[10px] text-slate-500">Overdue</span></div></div></div></Panel>
          <Panel className="overflow-hidden p-0"><Heading title="Risk Reduction (After Mitigation)" icon="chart" /><div className="p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-xl font-semibold text-red-500">{summary?.reduction.before ?? unavailable}</p><p className="text-[11px] text-slate-500">Current Risk</p></div><span aria-hidden="true">→</span><div><p className="text-xl font-semibold text-emerald-600">{summary?.reduction.after ?? unavailable}</p><p className="text-[11px] text-slate-500">Residual Risk</p></div></div><p className="mt-4 rounded bg-slate-50 px-2 py-2 text-center text-xs text-slate-500">{summary?.reduction.percent != null ? `${summary.reduction.percent}% reduction` : unavailable}</p><p className="mt-2 text-[10px] text-slate-500">{summary?.reduction.reason || `${missing}: reduction metric and unit.`}</p></div></Panel>
          <Panel className="overflow-hidden p-0"><Heading title="Cost vs Risk Reduction (ALARP)" icon="scale" /><div className="p-4"><div className="grid grid-cols-2 gap-3"><div><p className="text-lg font-semibold">{treatmentMoney(summary?.cost.amount, summary?.cost.currency)}</p><p className="text-[10px] text-slate-500">Total Mitigation Cost</p></div><div><p className="text-lg font-semibold">{summary?.reduction.percent != null ? `${summary.reduction.percent}%` : unavailable}</p><p className="text-[10px] text-slate-500">Risk Reduction</p></div></div><div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold">ALARP Outcome</p><p className="mt-1 text-xs text-slate-500">{summary?.alarp.outcome || unavailable}</p><p className="mt-1 text-[10px] text-slate-500">{summary?.alarp.reason || `${missing}: ALARP criteria, evidence and approval.`}</p></div></div></Panel>
        </div>
        <Panel className="overflow-hidden p-0"><Heading title="Mitigation Action Register" icon="chart"><div className="flex flex-wrap items-center gap-2">
          <select aria-label="Action status" value={filters.status} disabled={!actionReady} onChange={event => props.onFilters({ status: event.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="">All Statuses</option>{page?.actions.statuses.map(status => <option key={status}>{status}</option>)}</select>
          <select aria-label="Current risk level" value={filters.riskLevel} disabled={page?.status !== "available"} onChange={event => props.onFilters({ riskLevel: event.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="">All Risk Levels</option>{page?.riskLevels.map(level => <option key={level}>{level}</option>)}</select>
          <select aria-label="Action pipeline" value={filters.pipelineId} disabled={page?.status !== "available"} onChange={event => props.onFilters({ pipelineId: event.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="">All Pipelines</option>{page?.pipelines.map(pipeline => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select>
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1 text-slate-400"><Glyph kind="search" /><input aria-label="Search actions" placeholder="Search actions..." value={filters.q} disabled={!actionReady && !filters.q} onChange={event => props.onFilters({ q: event.target.value })} className="w-32 bg-transparent text-xs text-slate-700 outline-none" /></label>
          <button type="button" disabled title={unavailableTitle} aria-label="Additional action filters" className="rounded border border-slate-200 p-1 text-slate-400"><Glyph kind="filter" /></button>
        </div></Heading>
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-[11px]"><thead className="bg-slateblue-50 text-slate-700"><tr>{["ID", "Mitigation Action", "Risk Source", "Control Type / Barrier", "Target Date", "Cost (USD)", "Risk Reduction", "Status", "Owner", "Actions"].map(label => <th key={label} className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{actions.map(action => {
            const link = action.treatmentLinks.length === 1 ? action.treatmentLinks[0] : null;
            return <tr key={action.actionId} tabIndex={0} aria-selected={selectedAction?.actionId === action.actionId} onClick={() => props.onSelectAction(action)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); props.onSelectAction(action); } }} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50 ${selectedAction?.actionId === action.actionId ? "bg-slateblue-50" : ""}`}><td className="px-3 py-2">{action.actionId}</td><td className="px-3 py-2">{action.title}</td><td className="px-3 py-2">{[...new Set(action.treatmentLinks.map(value => value.riskTitle))].join("; ")}</td><td className="px-3 py-2">{link?.controlType || unavailable}</td><td className={`px-3 py-2 ${action.overdue === true ? "text-red-600" : ""}`}>{date(action.dueDate)}</td><td className="px-3 py-2" title={action.currency !== "USD" ? `${missing}: USD conversion policy` : undefined}>{action.currency === "USD" ? treatmentMoney(action.costAmount, action.currency) : unavailable}</td><td className="px-3 py-2"><Badge value={link?.benefit} kind="benefit" /></td><td className="px-3 py-2"><Badge value={action.status} /></td><td className="px-3 py-2">{action.ownerName || unavailable}</td><td className="px-3 py-2"><button type="button" disabled title={unavailableTitle} aria-label={`Action options ${action.actionId}`}>⋯</button></td></tr>;
          })}{!actions.length ? <tr><td colSpan={10}><Notice reason={loading ? "Loading authoritative records…" : actionReady ? "No linked central actions match the selected scope and filters." : emptyReason} /></td></tr> : null}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-500"><span>{total === null ? "Action total: Unavailable" : `Showing ${total ? (filters.page - 1) * filters.pageSize + 1 : 0} - ${Math.min(filters.page * filters.pageSize, total)} of ${total} actions`}</span><div className="flex items-center gap-1"><button aria-label="Previous action page" type="button" disabled={!actionReady || filters.page <= 1} onClick={() => props.onFilters({ page: filters.page - 1 })} className="rounded border px-2 py-1 disabled:opacity-40">‹</button>{Array.from({ length: pages ? Math.min(6, pages) : 1 }, (_, index) => Math.max(1, Math.min(filters.page - 2, (pages ?? 1) - 5)) + index).map(number => <button key={number} aria-label={`Action page ${number}`} aria-current={filters.page === number ? "page" : undefined} type="button" disabled={!actionReady} onClick={() => props.onFilters({ page: number })} className={`rounded border px-2 py-1 disabled:opacity-40 ${filters.page === number ? "bg-slateblue-600 text-white" : ""}`}>{number}</button>)}<button aria-label="Next action page" type="button" disabled={!actionReady || filters.page >= (pages ?? 1)} onClick={() => props.onFilters({ page: filters.page + 1 })} className="rounded border px-2 py-1 disabled:opacity-40">›</button></div><select aria-label="Actions per page" value={filters.pageSize} onChange={event => props.onFilters({ pageSize: Number(event.target.value), page: 1 })} className="rounded border border-slate-200 bg-white px-2 py-1">{[10, 25, 50].map(size => <option key={size} value={size}>{size} per page</option>)}</select></div>
        </Panel>
        <div className="grid gap-4 md:grid-cols-2"><CostChart summary={summary} /><ResidualChart summary={summary} /></div>
      </div>
      <aside className="min-w-0 space-y-4" aria-label="Selected mitigation details">
        <Panel className="overflow-hidden p-0"><Heading title="Selected Mitigation Action" icon="target"><div className="flex gap-3"><button type="button" disabled title={`${missing}: approved risk-details workflow`} className="text-xs text-slate-400">View Risk</button><button type="button" aria-label="Close selected action" disabled={!selectedAction && !selection} onClick={props.onClose} className="text-slate-500">×</button></div></Heading>
          <div className="p-4"><label className="block text-xs text-slate-500">Risk Treatment<select aria-label="Selected risk treatment" value={selection ? JSON.stringify([selection.treatmentId, selection.revisionId]) : ""} onChange={event => { const value = event.target.value ? JSON.parse(event.target.value) as string[] : null; props.onSelectTreatment(value ? { treatmentId: value[0], revisionId: value[1] } : null); }} className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-2 text-xs"><option value="">Select an authoritative treatment</option>{choices.map(row => <option key={row.revisionId} value={JSON.stringify([row.treatmentId, row.revisionId])}>{row.treatmentId} · Rev {row.revisionNumber} · {row.title}</option>)}</select></label>
            <div className="mt-4 flex items-center justify-between gap-2"><p className="text-sm font-semibold">{selectedAction?.actionId || unavailable}</p><Badge value={selectedAction?.status} /></div><h4 className="mt-3 text-sm font-semibold">{selectedAction?.title || "No central action selected"}</h4>
            <dl className="mt-3">{field("Risk Source", item?.riskTitle)}{field("Control Type / Barrier", item?.controlType)}{field("Target Date", date(selectedAction?.dueDate))}{field("Estimated Cost", treatmentMoney(item?.estimatedCost.amount, item?.estimatedCost.currency))}{field("Expected Risk Reduction", <Badge value={item?.benefit} kind="benefit" />)}{field("Residual Risk (After)", <Badge value={item?.residual.proposed?.level} kind="risk" />)}</dl>
            {props.detailLoading ? <Notice reason="Loading treatment revision…" compact /> : null}
            <h4 className="mt-4 text-xs font-semibold">Description</h4><p className="mt-2 text-xs leading-5 text-slate-600">{item?.description || `${missing}: selected treatment description.`}</p>
            <h4 className="mt-4 text-xs font-semibold">ALARP Justification</h4>{alarp.length ? alarp.map(value => <div key={`${value.alarpId}-${value.version}`} className="mt-2 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600"><p>{value.alarpId} · Version {value.version} · <Badge value={value.state} /></p><p>{value.justification || unavailable}</p><p>Outcome: {value.outcome || unavailable}</p><p>Criteria: {value.criteriaId && value.criteriaVersion ? `${value.criteriaId} / ${value.criteriaVersion}` : unavailable}</p><p>Evidence: {value.evidenceAvailable ? "Referenced evidence; approval verification required" : `${missing}: evidence references`}</p></div>) : <Notice reason={`${missing}: versioned ALARP evaluation and evidence.`} compact />}
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold">Residual risk provenance</p><dl className="mt-2">{field("Proposed", item?.residual.proposed?.level)}{field("Approved forecast", item?.residual.approved?.level)}{field("Verified outcome", item?.residual.verified?.level)}{field("Inherent Risk", item?.inherent.level)}{field("Current Risk", item?.current.level)}</dl><p className="mt-2 text-[10px] text-slate-500">{item?.residual.reason || `${missing}: verified reassessment outcome. Action completion never lowers official risk.`}</p></div>
            {item ? <p className="mt-3 break-words text-[10px] text-slate-500">Treatment {item.treatmentId} · Revision {item.revisionNumber} ({item.state}) · Baseline {item.baselineRevisionId} · Methodology {item.methodologyVersionId} · Matrix {item.matrixVersionId}</p> : <Notice reason={detail?.reason || `${missing}: select an accessible treatment revision.`} compact />}
          </div>
        </Panel>
        <Panel className="overflow-hidden p-0"><Heading title="Approval Workflow" icon="users"><button type="button" onClick={props.onWorkflow} className="text-xs text-slateblue-600">{props.workflowExpanded ? "Hide Workflow" : "View Workflow"}</button></Heading><ol className="space-y-5 p-4">{stages.map(stage => { const value = item?.workflow.find(entry => entry.stage === stage); return <li key={stage} className="grid grid-cols-[20px_1fr] gap-3"><span aria-hidden="true" className="mt-0.5 h-4 w-4 rounded-full border-2 border-slate-300" /><div className="grid grid-cols-[1fr_1.3fr] gap-2 text-xs"><span className="text-slate-500">{stage}</span><div><p>{value?.actorName || unavailable}</p><p className="mt-1 text-[10px] text-slate-500">{value?.status || unavailable} · {date(value?.date)}</p>{props.workflowExpanded ? <p className="mt-1 break-words text-[10px] text-slate-500">Actor ID: {value?.actorId || unavailable}. Approval permissions/job title: {missing}.</p> : null}</div></div></li>; })}</ol><p className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500">Recorded events are not proof of policy approval. No workflow stage is automatically completed from task status.</p></Panel>
      </aside>
    </div>
    <p className="text-xs text-slate-500">Implementation tasks belong only to the Central Action Register (Action_ID). Risk owns treatment strategy and ALARP evaluation. All mutation, approval, export and calculation workflows remain locked.</p>
  </div>;
}

export function RiskTreatmentWorkspace({ pipelineId, methodologyVersionId, scopeReady, scopeError, riskOverview }: { pipelineId?: string; methodologyVersionId?: string; scopeReady: boolean; scopeError: string | null; riskOverview: RiskOverview | null }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<TreatmentPage | null>(null), [summary, setSummary] = useState<TreatmentSummary | null>(null), [detail, setDetail] = useState<TreatmentDetail | null>(null);
  const [selectedAction, setSelectedAction] = useState<TreatmentActionRow | null>(null), [selection, setSelection] = useState<Selection>(null);
  const [loading, setLoading] = useState(false), [detailLoading, setDetailLoading] = useState(false), [error, setError] = useState<string | null>(null), [workflowExpanded, setWorkflowExpanded] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setQuery(filters.q), 250); return () => clearTimeout(timer); }, [filters.q]);
  useEffect(() => { setFilters(initialFilters); setSelectedAction(null); setSelection(null); }, [pipelineId, methodologyVersionId]);
  useEffect(() => {
    let current = true;
    setPage(null); setSummary(null); setSelectedAction(null); setSelection(null); setError(scopeError);
    if (!scopeReady || scopeError) { setLoading(false); return; }
    setLoading(true);
    const scope: TreatmentFilters = { pipelineId: pipelineId || filters.pipelineId || undefined, methodologyVersionId, q: query || undefined, status: filters.status || undefined, riskLevel: filters.riskLevel || undefined, page: filters.page, pageSize: filters.pageSize, basis: filters.basis || undefined };
    void Promise.allSettled([fetchRiskTreatments(scope), fetchRiskTreatmentSummary(scope)]).then(([list, metrics]) => {
      if (!current) return;
      if (list.status === "fulfilled") setPage(list.value); else setError("Authoritative treatment/action records could not be loaded.");
      if (metrics.status === "fulfilled") setSummary(metrics.value); else setError("Treatment summary could not be loaded; no fallback metrics were supplied.");
      setLoading(false);
    });
    return () => { current = false; };
  }, [scopeReady, scopeError, pipelineId, methodologyVersionId, query, filters.status, filters.riskLevel, filters.pipelineId, filters.page, filters.pageSize, filters.basis]);
  useEffect(() => {
    let current = true; setDetail(null);
    if (!selection) { setDetailLoading(false); return; }
    setDetailLoading(true);
    void fetchRiskTreatment(selection.treatmentId, selection.revisionId).then(value => { if (current) setDetail(value); }).catch(() => { if (current) setDetail({ status: "unavailable", reason: "Selected treatment could not be loaded.", item: null }); }).finally(() => { if (current) setDetailLoading(false); });
    return () => { current = false; };
  }, [selection?.treatmentId, selection?.revisionId]);
  function changeFilters(value: Partial<Filters>) { setFilters(previous => ({ ...previous, ...value, page: value.page ?? 1 })); }
  function close() { setSelectedAction(null); setSelection(null); setDetail(null); }
  return <RiskTreatmentView page={page} summary={summary} detail={detail} riskOverview={riskOverview} filters={filters} loading={loading || !scopeReady} detailLoading={detailLoading} error={scopeError || error} selectedAction={selectedAction} selection={selection} workflowExpanded={workflowExpanded} onFilters={changeFilters} onSelectAction={action => { setSelectedAction(action); const single = action.treatmentLinks.length === 1 ? action.treatmentLinks[0] : null; setSelection(single ? { treatmentId: single.treatmentId, revisionId: single.revisionId } : null); }} onSelectTreatment={setSelection} onClose={close} onWorkflow={() => setWorkflowExpanded(value => !value)} />;
}
