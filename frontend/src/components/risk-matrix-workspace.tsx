"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Download, List, Settings, ShieldPlus } from "lucide-react";
import { Panel, StatCard } from "@/components/ui";
import { fetchRiskMatrix } from "@/lib/apiClient";
import { matrixBases, selectMatrixCell, type MatrixBasis, type MatrixDictionary, type MatrixSelection, type RiskMatrixData } from "@/lib/risk-matrix-types";

const missing = "Unavailable / MISSING FIELD — APPROVAL NEEDED";
const label = (basis: MatrixBasis) => basis[0].toUpperCase() + basis.slice(1);
const control = "rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-500";
const button = "inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-600 disabled:cursor-not-allowed disabled:text-slate-400";
const filledButton = button.replace("text-slateblue-600", "text-white") + " bg-slateblue-600";
function Notice({ field }: { field: string }) { return <p role="status" className="mt-2 text-[10px] text-slate-500">{missing}: {field}.</p>; }
function Menu({ name }: { name: string }) { return <button type="button" disabled title={`${missing}: panel menu workflow`} aria-label={`${name} menu unavailable`} className="text-slate-400">⋮</button>; }
function Title({ children }: { children: string }) { return <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{children}</h3><Menu name={children} /></div>; }
function axis(dictionary: MatrixDictionary | undefined, value: number) { return `${value} ${dictionary?.find(row => row.level === value)?.label ?? "Unavailable"}`; }
function Basis({ name, value, onChange }: { name: string; value: MatrixBasis; onChange(value: MatrixBasis): void }) { return <select aria-label={name} className={control} value={value} onChange={event => onChange(event.target.value as MatrixBasis)}>{matrixBases.map(basis => <option key={basis} value={basis}>{label(basis)}</option>)}</select>; }

function Matrix({ item, basis, selection, onSelect }: { item: RiskMatrixData["item"]; basis: MatrixBasis; selection: MatrixSelection | null; onSelect(value: MatrixSelection): void }) {
  return <><div className="flex gap-1"><span className="self-center text-xs font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Likelihood</span><div className="min-w-0 flex-1 overflow-x-auto"><table aria-label={`${label(basis)} risk matrix`} className="w-full min-w-[320px] table-fixed border-collapse text-center text-[10px]">
    <caption className="mb-2 text-left text-[10px] text-slate-500">Likelihood × Consequence · cell values: number of official Risk_IDs</caption>
    <tfoot><tr><th scope="col" className="w-24" aria-label="Likelihood levels" />{[1, 2, 3, 4, 5].map(c => <th scope="col" className="p-1 font-normal" key={c}>{axis(item?.matrix.consequenceDictionary, c)}</th>)}</tr></tfoot>
    <tbody>{[5, 4, 3, 2, 1].map(l => <tr key={l}><th scope="row" className="p-1 text-left font-normal">{axis(item?.matrix.likelihoodDictionary, l)}</th>{[1, 2, 3, 4, 5].map(c => {
      const cell = item?.distributions[basis].find(value => value.likelihood === l && value.consequence === c);
      const selected = selection?.basis === basis && selection.likelihood === l && selection.consequence === c;
      return <td className="border border-white p-0" key={c}><button type="button" disabled={!cell} aria-pressed={selected} aria-label={`${label(basis)} likelihood ${l}, consequence ${c}: ${cell ? `${cell.count} risks; ${cell.level}` : "Unavailable"}`} onClick={() => onSelect({ basis, likelihood: l, consequence: c })} className={`h-9 w-full bg-slate-100 text-xs text-slate-800 hover:bg-slateblue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${selected ? "ring-2 ring-inset ring-blue-600 font-semibold" : ""}`} title={cell?.level ?? missing}>{cell?.count ?? "—"}</button></td>;
    })}</tr>)}</tbody></table></div></div><p className="mt-2 text-center text-xs font-medium">Consequence</p><Notice field="approved matrix colors; neutral cells preserve saved classifications" /></>;
}
function Criteria({ name, dictionary }: { name: string; dictionary: MatrixDictionary | undefined }) { return <div><h4 className="mb-1 text-xs font-semibold">{name} Criteria</h4><table className="w-full text-left text-[10px]"><thead className="bg-slateblue-50"><tr><th className="p-2">Level</th><th className="p-2">Description</th></tr></thead><tbody>{[5, 4, 3, 2, 1].map(value => <tr key={value} className="border-b border-slate-100"><td className="p-2">{axis(dictionary, value)}</td><td className="p-2 text-slate-500">Unavailable</td></tr>)}</tbody></table></div>; }

export type RiskMatrixViewProps = {
  data: RiskMatrixData | null; loading: boolean; error: string | null; pipelineLabel: string;
  basis: MatrixBasis; comparisonBasis: MatrixBasis; category: string; selection: MatrixSelection | null; page: number; allRows: boolean;
  onBasis(value: MatrixBasis): void; onComparison(value: MatrixBasis): void; onCategory(value: string): void; onApply(): void; onReset(): void;
  onSelect(value: MatrixSelection): void; onPage(value: number): void; onAllRows(): void;
};
export function RiskMatrixView(p: RiskMatrixViewProps) {
  const item = !p.loading && !p.error && p.data?.status === "available" ? p.data.item : null;
  const selected = selectMatrixCell(item, p.selection);
  const rows = selected?.rows ?? [], pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const page = Math.min(p.page, pageCount), start = p.allRows ? 0 : (page - 1) * 10;
  const displayed = p.allRows ? rows : rows.slice(start, start + 10);
  const sum = item?.summary;
  const config = [ ["Matrix Name", item?.matrix.name], ["Matrix ID / Version", item ? `${item.matrix.matrixId} / ${item.matrix.version}` : null],
    ["Methodology ID / Version", item ? `${item.methodology.methodologyId} / ${item.methodology.version}` : null], ["Methodology Name", item?.methodology.name],
    ["Matrix Type", item ? "Likelihood × Consequence · 5×5" : null], ["Risk Basis", label(p.basis)],
    ["Likelihood Scale", item?.matrix.likelihoodDictionary?.map(row => `${row.level} ${row.label}`).join(" · ")],
    ["Consequence Scale", item?.matrix.consequenceDictionary?.map(row => `${row.level} ${row.label}`).join(" · ")],
    ["Likelihood Rule Version", item?.methodology.likelihoodRuleVersion], ["Consequence Rule Version", item?.methodology.consequenceRuleVersion], ["Last Updated", null], ["Updated By", null] ];
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{([ ["Total Risks", sum?.total, "blue"], ["High Risk", sum?.high, "red"], ["Medium Risk", sum?.medium, "amber"], ["Low Risk", sum?.low, "green"], ["Overdue Reviews", sum?.overdueReviews, "blue"] ] as const).map(([name, value, tone]) => <StatCard key={name} label={name} value={value ?? "Unavailable"} tone={tone} />)}</div>
    <p className="text-[10px] text-slate-500">KPIs: Current approved risk in the applied pipeline/category scope. Matrix bases remain separate. Percentages and comparison deltas: {missing}.</p>
    {item && (!item.matrix.likelihoodDictionary || !item.matrix.consequenceDictionary) ? <Notice field="validated approved likelihood/consequence dictionaries" /> : null}
    <Panel className="!p-3"><div className="grid items-end gap-3 md:grid-cols-3 xl:grid-cols-6">
      <label className="text-xs">Pipeline<input aria-label="Matrix pipeline scope" readOnly className={`mt-1 w-full ${control}`} value={p.pipelineLabel} title="Use the existing pipeline selector above to change authorized scope." /></label>
      <label className="text-xs">Matrix Type<div className="mt-1"><Basis name="Primary matrix basis" value={p.basis} onChange={p.onBasis} /></div></label>
      <label className="text-xs">Date Range<div className="relative mt-1"><input disabled aria-label="Historical date range unavailable" className={`w-full pr-7 ${control}`} value="Current approved revisions" readOnly /><CalendarDays size={14} className="absolute right-2 top-2" aria-hidden="true" /></div></label>
      <label className="text-xs">Threat Category<select disabled aria-label="Threat category unavailable" className={`mt-1 w-full ${control}`}><option>Unavailable</option></select></label>
      <label className="text-xs">Risk Category<select aria-label="Matrix risk category" value={p.category} disabled={!item} onChange={e => p.onCategory(e.target.value)} className={`mt-1 w-full ${control}`}><option value="">All Categories</option>{item?.categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <div className="flex gap-2"><button type="button" disabled={!item} onClick={p.onApply} className={filledButton}>Apply</button><button type="button" onClick={p.onReset} className={button}>Reset</button></div>
    </div><Notice field="historical filters and distinct threat-category dictionary; Risk Category uses the approved saved category" /></Panel>
    {p.loading ? <p role="status" className="text-sm">Loading verified matrix population…</p> : p.error || p.data?.reason ? <Panel><p role="alert" className="text-xs text-amber-700">{missing}: {p.error || p.data?.reason}</p></Panel> : null}
    <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
      <Panel className="min-w-0 !p-3 xl:col-span-4"><Title>{`${label(p.basis)} Risk Matrix`}</Title><Matrix item={item} basis={p.basis} selection={p.selection} onSelect={p.onSelect} /></Panel>
      <Panel className="min-w-0 !p-3 xl:col-span-4"><Title>{`${label(p.basis)} vs ${label(p.comparisonBasis)} Risk Matrix`}</Title><div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Comparison matrix basis">{matrixBases.map(basis => <button key={basis} type="button" aria-pressed={p.comparisonBasis === basis} onClick={() => p.onComparison(basis)} className={p.comparisonBasis === basis ? filledButton : button}>{label(basis)}</button>)}</div><Matrix item={item} basis={p.comparisonBasis} selection={p.selection} onSelect={p.onSelect} /></Panel>
      <Panel className="!p-3 xl:col-span-4"><Title>Matrix Configuration</Title><dl>{config.map(([name, value]) => <div key={name} className="grid grid-cols-[1fr_1.5fr] gap-2 border-b border-slate-100 py-1.5 text-[10px]"><dt>{name}</dt><dd className="break-words">{value || "Unavailable"}</dd></div>)}</dl><button type="button" disabled className={`mt-2 ${button}`} title={missing}><Settings size={14} />Configure Matrix</button><Notice field="matrix update provenance" /></Panel>
      <Panel className="!p-3 xl:col-span-2"><Title>Risk Matrix Legend</Title><p className="text-[10px]">Approved classifications</p><ul className="mt-2 space-y-2 text-xs">{[...new Set(item?.distributions[p.basis].map(cell => cell.level) ?? [])].map(level => <li key={level} className="flex items-center gap-2"><span className="h-4 w-6 rounded border border-slate-200 bg-slate-100" aria-hidden="true" />{level}</li>)}</ul><Notice field="approved colors and legend thresholds; risk counts are not risk classifications" /></Panel>
      <Panel className="!p-3 xl:col-span-6"><Title>Scoring Criteria</Title><div className="grid gap-3 sm:grid-cols-2"><Criteria name="Likelihood" dictionary={item?.matrix.likelihoodDictionary} /><Criteria name="Consequence" dictionary={item?.matrix.consequenceDictionary} /></div><Notice field="criteria descriptions, PoF / CoF units and quantitative rules" /></Panel>
      <Panel className="!p-3 xl:col-span-4 xl:row-span-2"><Title>Selected Cell Details</Title>{selected && p.selection ? <>
        <div className="grid grid-cols-3 gap-2 rounded bg-slateblue-50 p-3 text-[10px]"><div>Likelihood<p className="mt-1 font-semibold">{axis(item?.matrix.likelihoodDictionary, p.selection.likelihood)}</p></div><div>Consequence<p className="mt-1 font-semibold">{axis(item?.matrix.consequenceDictionary, p.selection.consequence)}</p></div><div>Total Risks<p className="mt-1 font-semibold">{selected.cell.count}</p></div></div>
        <p className="my-2 text-xs">{label(p.selection.basis)} · <span className="rounded bg-slate-100 px-2 py-1">{selected.cell.level}</span></p>
        <h4 className="mt-3 text-xs font-semibold">Description</h4><Notice field="approved selected-cell narrative" /><h4 className="my-3 text-xs font-semibold">Risk Breakdown by Category</h4>
        {selected.categories.map(row => <div key={row.label} className="mb-2 grid grid-cols-[100px_1fr_24px] items-center gap-2 text-[10px]"><span>{row.label}</span><span className="h-2 rounded bg-slate-100"><span className="block h-2 rounded bg-blue-500" style={{ width: `${100 * row.count / selected.cell.count}%` }} /></span><span>{row.count}</span></div>)}{!selected.rows.length ? <p className="text-xs">No eligible risks in this cell.</p> : null}
      </> : <p className="text-xs text-slate-500">Select a cell in either matrix to inspect the same verified population.</p>}
        <h4 className="mb-2 mt-4 text-xs font-semibold">Actions</h4><div className="flex flex-wrap gap-2"><button type="button" disabled={!selected} onClick={p.onAllRows} className={button}><List size={14} />View All Risks</button><button type="button" disabled className={button} title={missing}><ShieldPlus size={14} />Create Mitigation Plan</button><button type="button" disabled className={button} title={`${missing}: Reports & Analytics export contract`}><Download size={14} />Export List</button></div>
      </Panel>
      <Panel className="min-w-0 !p-3 xl:col-span-8"><div className="mb-2 flex flex-wrap justify-between gap-2"><h3 className="text-xs font-semibold">Risks in Selected Matrix Cell {p.selection ? `(${label(p.selection.basis)}, Likelihood: ${axis(item?.matrix.likelihoodDictionary, p.selection.likelihood)}, Consequence: ${axis(item?.matrix.consequenceDictionary, p.selection.consequence)})` : ""}</h3><div className="flex gap-3 text-xs"><span>{selected ? `${rows.length} risks` : "Unavailable"}</span><button type="button" disabled={!selected} onClick={p.onAllRows} className="text-slateblue-600 disabled:text-slate-400">View All</button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-[10px]"><thead className="bg-slateblue-50"><tr>{["ID", "Title / Description", "Pipeline / Segment", "Category", "Risk Level", "Status", "Last Updated"].map(name => <th key={name} className="p-2">{name}</th>)}</tr></thead><tbody>{displayed.map(row => <tr key={row.riskId} className="border-b border-slate-100"><td className="p-2">{row.riskId}</td><td className="p-2">{row.title}</td><td className="p-2">{row.pipelineName} ({row.pipelineCode})<p className="text-slate-500">Segment: Unavailable</p></td><td className="p-2">{row.category}</td><td className="p-2"><span className="rounded bg-slate-100 px-2 py-1">{p.selection ? row[p.selection.basis].level : "Unavailable"}</span></td><td className="p-2"><span className="rounded bg-slateblue-50 px-2 py-1">{row.status}</span></td><td className="p-2" title={`${missing}: update provenance`}>Unavailable</td></tr>)}{!displayed.length ? <tr><td colSpan={7} className="p-3">{selected ? "No eligible risks in this cell." : "Select an available matrix cell."}</td></tr> : null}</tbody></table></div>
        {selected ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>Showing {rows.length ? start + 1 : 0}–{p.allRows ? rows.length : Math.min(start + 10, rows.length)} of {rows.length} risks</span><div className="flex gap-2"><button type="button" className={button} disabled={p.allRows || page <= 1} onClick={() => p.onPage(page - 1)}>Previous</button><span className="p-2">{p.allRows ? "All risks" : `Page ${page} of ${pageCount}`}</span><button type="button" className={button} disabled={p.allRows || page >= pageCount} onClick={() => p.onPage(page + 1)}>Next</button></div></div> : null}
        <Notice field="segment projection and risk last-updated provenance" />
      </Panel>
    </div>
    <p className="text-[10px] text-slate-500">{item ? `${item.total} ${item.population} · Matrix ${item.matrix.matrixId} / ${item.matrix.version} · Read as of ${item.asOf}.` : "Official population unavailable."} Saved approved results only. No historical revisions are recalculated or modified.</p>
  </div>;
}

export function RiskMatrixWorkspace({ pipelineId, pipelineLabel, methodologyVersionId, scopeReady, scopeError }: { pipelineId?: string; pipelineLabel: string; methodologyVersionId?: string; scopeReady: boolean; scopeError: string | null }) {
  const [data, setData] = useState<RiskMatrixData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [basis, setBasis] = useState<MatrixBasis>("current"), [comparisonBasis, setComparisonBasis] = useState<MatrixBasis>("residual");
  const [category, setCategory] = useState(""), [appliedCategory, setAppliedCategory] = useState("");
  const [selection, setSelection] = useState<MatrixSelection | null>(null), [page, setPage] = useState(1), [allRows, setAllRows] = useState(false);
  function clearSelection() { setSelection(null); setPage(1); setAllRows(false); }
  useEffect(() => {
    let active = true;
    setData(null); setError(null); clearSelection();
    if (!scopeReady || scopeError) { setLoading(false); return; }
    setLoading(true);
    void fetchRiskMatrix({ pipelineId, methodologyVersionId, category: appliedCategory || undefined }).then(value => { if (active) setData(value); })
      .catch(() => { if (active) setError("Authoritative matrix data could not be loaded. No fallback records are used."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pipelineId, methodologyVersionId, appliedCategory, scopeReady, scopeError]);
  return <RiskMatrixView data={data} loading={loading} error={scopeError || error} pipelineLabel={pipelineLabel} basis={basis} comparisonBasis={comparisonBasis} category={category} selection={selection} page={page} allRows={allRows}
    onBasis={value => { setBasis(value); clearSelection(); }} onComparison={value => { setComparisonBasis(value); clearSelection(); }} onCategory={setCategory}
    onApply={() => { setAppliedCategory(category); clearSelection(); }} onReset={() => { setCategory(""); setAppliedCategory(""); setBasis("current"); setComparisonBasis("residual"); clearSelection(); }}
    onSelect={value => { setSelection(value); setPage(1); setAllRows(false); }} onPage={setPage} onAllRows={() => { setAllRows(true); setPage(1); }} />;
}
