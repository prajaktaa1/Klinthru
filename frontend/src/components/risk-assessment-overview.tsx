"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, StatCard } from "@/components/ui";
import type { OfficialRiskRow, RiskDistribution, RiskOverview, RiskTab } from "@/lib/risk-assessment-types";

const missing = "MISSING FIELD — APPROVAL NEEDED";
// Series colors distinguish chart entries only. They never classify risk scores.
const colors = ["#3188ff", "#ff8037", "#1eb4cf", "#dd40b5", "#70d6af", "#32bd81", "#647e98", "#9baec1"];
function seriesColor(title: string, label: string, index: number) {
  // IMG-01 legend presentation, with no status/category records manufactured.
  const reference: Record<string, string> = title === "Risk Status"
    ? { Open: "#00ab71", "In Mitigation": "#3188ff", "Under Review": "#ff9d24", Closed: "#ff2444" }
    : { Corrosion: colors[0], "Third Party": colors[1], Geotechnical: colors[2], Operational: colors[3], "Material / Fabrication": colors[4], Environmental: colors[5], "Natural Hazards": colors[6], Other: colors[7] };
  return reference[label] ?? colors[index % colors.length];
}
type OverviewView = "overview" | "reviews" | "risks";

export function riskOverviewHref(search: string, view: OverviewView) {
  const params = new URLSearchParams(search);
  params.delete("riskTab");
  if (view === "overview") params.delete("riskOverviewView"); else params.set("riskOverviewView", view);
  return `/risk-assessment${params.size ? `?${params.toString()}` : ""}`;
}

export function upcomingRiskReviews(reviews: RiskOverview["reviews"]) {
  // Use actual API dates and the approved calendar result, never browser time.
  return reviews.filter(review => Number.isFinite(review.daysLeft) && review.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.riskId.localeCompare(b.riskId));
}

function Missing({ field }: { field: string }) {
  return <p className="mt-2 text-xs text-slate-500">{missing}: {field}.</p>;
}
function Unavailable({ message = `${missing}: authoritative official-risk data and approved methodology.` }: { message?: string }) {
  return <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{message}</p>;
}
function Heading({ title, menu = true }: { title: string; menu?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{title}</h3>{menu ? <button type="button" disabled aria-label={`${title} options`} title={`${missing}: panel action workflow`} className="px-2 text-slate-400 disabled:cursor-not-allowed">⋮</button> : null}</div>;
}
function ChartTable({ rows }: { rows: RiskDistribution[] }) {
  return <table className="sr-only"><caption>Number of Risks</caption><thead><tr><th>Group</th><th>Count</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td>{row.label}</td><td>{row.count}</td></tr>)}</tbody></table>;
}

function Donut({ title, rows, available, total }: { title: string; rows: RiskDistribution[]; available: boolean; total: number | null }) {
  const reconciles = total !== null && rows.reduce((sum, row) => sum + row.count, 0) === total;
  let offset = 0;
  return <Panel><Heading title={title} />{!available ? <Unavailable /> : !reconciles ? <Unavailable message={`${missing}: reconciled chart population.`} /> : <>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
      <svg viewBox="0 0 220 220" className="h-48 w-48 shrink-0" role="img" aria-label={`${title}: ${total} Total Risks`}>
        <circle cx="110" cy="110" r="80" fill="none" stroke="#e2e8f0" strokeWidth="34" />
        {rows.map((row, index) => {
          const length = total ? row.count / total * 100 : 0, start = offset; offset += length;
          return <circle key={`${row.label}-${index}`} cx="110" cy="110" r="80" pathLength="100" fill="none" stroke={seriesColor(title, row.label, index)} strokeWidth="34" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"><title>{`${row.label}: ${row.count}`}</title></circle>;
        })}
        <text x="110" y="107" textAnchor="middle" className="fill-slate-900 text-2xl font-semibold">{total}</text><text x="110" y="130" textAnchor="middle" className="fill-slate-600 text-xs">Total Risks</text>
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-2 text-sm" aria-label={`${title} legend`}>{rows.map((row, index) => <li key={`${row.label}-${index}`} className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(title, row.label, index) }} /><span className="flex-1">{row.label}</span><span>({row.count})</span></li>)}</ul>
    </div><ChartTable rows={rows} /><Missing field="percentage rounding policy" />
  </>}</Panel>;
}

function BarChart({ title, rows, available, horizontal = false }: { title: string; rows: RiskDistribution[]; available: boolean; horizontal?: boolean }) {
  const step = Math.max(1, Math.ceil(Math.max(0, ...rows.map(row => row.count)) / 4));
  const max = step * 4, ticks = [0, step, step * 2, step * 3, step * 4];
  const width = Math.max(620, horizontal ? 620 : rows.length * 110);
  const left = horizontal ? 170 : 52, right = 32, top = 24;
  const height = horizontal ? Math.max(220, rows.length * 34 + 64) : 285;
  const bottom = horizontal ? 42 : 78, plotWidth = width - left - right, plotHeight = height - top - bottom;
  return <Panel><Heading title={title} />{!available ? <Unavailable /> : !rows.length ? <Unavailable message="No eligible official risks in the selected scope and methodology." /> : <>
    <div className="mt-4 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[380px]" role="img" aria-label={`${title}; Number of Risks`}>
      {ticks.map(tick => horizontal ? <g key={tick}><line x1={left + tick / max * plotWidth} x2={left + tick / max * plotWidth} y1={top} y2={height - bottom} stroke="#e2e8f0" /><text x={left + tick / max * plotWidth} y={height - bottom + 18} textAnchor="middle" className="fill-slate-500 text-xs">{tick}</text></g> : <g key={tick}><line x1={left} x2={width - right} y1={height - bottom - tick / max * plotHeight} y2={height - bottom - tick / max * plotHeight} stroke="#e2e8f0" /><text x={left - 10} y={height - bottom - tick / max * plotHeight + 4} textAnchor="end" className="fill-slate-500 text-xs">{tick}</text></g>)}
      {rows.map((row, index) => {
        const slot = (horizontal ? plotHeight : plotWidth) / rows.length;
        const label = /^(.*) (\([^)]*\))$/.exec(row.label);
        return horizontal ? <g key={index}><text x={left - 10} y={top + slot * (index + .5) + 4} textAnchor="end" className="fill-slate-600 text-xs">{row.label}</text><rect x={left} y={top + slot * index + slot * .2} width={row.count / max * plotWidth} height={slot * .6} rx="2" fill="#3188ff"><title>{`${row.label}: ${row.count}`}</title></rect><text x={left + row.count / max * plotWidth + 6} y={top + slot * (index + .5) + 4} className="fill-slate-900 text-xs">{row.count}</text></g>
          : <g key={index}><rect x={left + slot * index + slot * .2} y={height - bottom - row.count / max * plotHeight} width={slot * .6} height={row.count / max * plotHeight} rx="2" fill="#3188ff"><title>{`${row.label}: ${row.count}`}</title></rect><text x={left + slot * (index + .5)} y={height - bottom - row.count / max * plotHeight - 8} textAnchor="middle" className="fill-slate-900 text-xs">{row.count}</text><text x={left + slot * (index + .5)} y={height - bottom + 20} textAnchor="middle" className="fill-slate-600 text-xs"><tspan x={left + slot * (index + .5)}>{label ? label[1] : row.label}</tspan>{label ? <tspan x={left + slot * (index + .5)} dy="16">{label[2]}</tspan> : null}</text></g>;
      })}
      {horizontal ? <text x={(width + left - right) / 2} y={height - 4} textAnchor="middle" className="fill-slate-600 text-xs">Number of Risks</text> : <text transform={`translate(15 ${(height - bottom + top) / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-600 text-xs">Number of Risks</text>}
    </svg></div><ChartTable rows={rows} />
  </>}</Panel>;
}

function RiskTable({ rows }: { rows: OfficialRiskRow[] }) {
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{["ID", "Title / Description", "Pipeline / Segment", "Category", "Risk Level", "Status", "Target Date", "Actions"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.riskId} className="border-t border-slate-200"><td className="p-2">{row.riskId}</td><td className="p-2">{row.title}</td><td className="p-2">{row.pipelineName} ({row.pipelineCode})<Missing field="Segment / KP binding" /></td><td className="p-2">{row.category}</td><td className="p-2"><details><summary className="cursor-pointer" title="Current approved risk">{row.current.level}</summary><dl className="mt-2 space-y-1 text-xs"><dt>Inherent Risk</dt><dd>{row.inherent.level} ({row.inherent.likelihood} × {row.inherent.consequence})</dd><dt>Current Risk</dt><dd>{row.current.level} ({row.current.likelihood} × {row.current.consequence})</dd><dt>Residual Risk</dt><dd>{row.residual.level} ({row.residual.likelihood} × {row.residual.consequence})</dd></dl></details></td><td className="p-2">{row.status}</td><td className="p-2"><Missing field="Target Date meaning and field" /></td><td className="p-2"><button type="button" disabled aria-label={`Actions for ${row.riskId}`} title={`${missing}: authoritative risk details/action workflow`} className="text-slate-400 disabled:cursor-not-allowed">⋯</button></td></tr>)}</tbody></table></div>;
}

function ReviewTable({ rows }: { rows: RiskOverview["reviews"] }) {
  const date = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(value));
    return ["day", "month", "year"].map(type => parts.find(part => part.type === type)?.value).join(" ");
  };
  return <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["ID", "Title", "Due Date", "Days Left"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.map(review => <tr key={review.riskId} className="border-t border-slate-200"><td className="p-2">{review.riskId}</td><td>{review.title}</td><td><time dateTime={review.dueDate.slice(0, 10)}>{date(review.dueDate)}</time></td><td>{review.daysLeft}</td></tr>)}</tbody></table></div>;
}

export function RiskAssessmentOverview({ data, loading, error, onTab }: { data: RiskOverview | null; loading: boolean; error: string | null; onTab: (tab: RiskTab) => void }) {
  const router = useRouter();
  const [view, setView] = useState<OverviewView>("overview");
  const [mapPipeline, setMapPipeline] = useState("");
  const [mapLevel, setMapLevel] = useState("");
  useEffect(() => { setMapPipeline(""); setMapLevel(""); }, [data?.methodologyVersionId, data?.asOf]);
  useEffect(() => {
    const synchronize = () => { const requested = new URLSearchParams(window.location.search).get("riskOverviewView"); setView(requested === "reviews" || requested === "risks" ? requested : "overview"); };
    synchronize(); window.addEventListener("popstate", synchronize);
    return () => window.removeEventListener("popstate", synchronize);
  }, []);
  function navigate(next: OverviewView) { setView(next); router.replace(riskOverviewHref(window.location.search, next)); }
  const available = !loading && !error && data?.status === "available" && data.summary !== null;
  const summary = available ? data!.summary : null;
  const unavailable = loading ? "Loading…" : "Unavailable";
  const latest = available ? data!.latest : [];
  const reviews = upcomingRiskReviews(available ? data!.reviews : []);
  const reasons = error ? [error] : data?.reasons ?? [];
  const chartRows = (key: "byCategory" | "byPipeline" | "bySource" | "byStatus") => available ? data![key] : [];
  const levels = available ? [...new Set(data!.matrix.map(cell => cell.level))] : [];
  const pipelines = [...new Map(latest.map(row => [row.pipelineId, { id: row.pipelineId, label: `${row.pipelineName} (${row.pipelineCode})` }])).values()];
  const locations = available ? data!.locationRecords.filter(location => (!mapLevel || location.level === mapLevel) && (!mapPipeline || latest.some(row => row.riskId === location.riskId && row.pipelineId === mapPipeline))) : [];
  const failure = reasons.length ? <Panel><p className="font-semibold text-amber-700">{missing}</p>{reasons.map(reason => <p key={reason} role="status" className="mt-2 text-sm text-slate-600">{reason}</p>)}</Panel> : null;

  if (view !== "overview") return <div className="space-y-6"><Panel><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">{view === "reviews" ? "Upcoming Reviews" : "Latest / Key Risks"} — All</h3><button type="button" className="text-sm text-slateblue-600" onClick={() => navigate("overview")}>Back to Overview</button></div><p className="mt-2 text-sm text-slate-500">Full read-only list within the current pipeline and methodology scope.</p>{!available ? <Unavailable /> : view === "reviews" ? reviews.length ? <ReviewTable rows={reviews} /> : <Unavailable message="No scheduled reviews for eligible official risks in this scope." /> : latest.length ? <RiskTable rows={latest} /> : <Unavailable message="No eligible official risks in the selected scope and methodology." />}</Panel>{failure}</div>;

  return <div className="space-y-6">{failure}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Total Risks" value={summary?.total ?? unavailable} tone="blue" /><StatCard label="High Risk" value={summary?.high ?? unavailable} tone="red" /><StatCard label="Medium Risk" value={summary?.medium ?? unavailable} tone="amber" /><StatCard label="Low Risk" value={summary?.low ?? unavailable} tone="green" /><StatCard label="Overdue Reviews" value={summary?.overdueReviews ?? unavailable} tone="blue" /></div>
    <p className="text-sm text-slate-500">Current approved risk only. {missing}: percentages, historical comparison deltas and urgency colors.</p>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Panel><Heading title="Risk Location Map" menu={false} /><div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Map pipeline" value={mapPipeline} disabled={!available} onChange={event => setMapPipeline(event.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="">All Pipelines</option>{pipelines.map(pipeline => <option key={pipeline.id} value={pipeline.id}>{pipeline.label}</option>)}</select>
        <select aria-label="Map risk level" value={mapLevel} disabled={!available} onChange={event => setMapLevel(event.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="">All Risk Levels</option>{levels.map(level => <option key={level} value={level}>{level}</option>)}</select>
        <button type="button" disabled aria-label="Expand risk map" title={`${missing}: GIS integration`} className="rounded-lg border border-slate-200 px-3 text-slate-400">⛶</button>
      </div><p className="mt-2 text-xs text-slate-500">Map filters apply to verified coordinate records within the current scope.</p><Unavailable message={`${missing}: GIS basemap and route geometry are unavailable. No route or risk markers are fabricated.`} />
        <div className="mt-3 flex justify-end gap-2">{["+", "−"].map(symbol => <button type="button" key={symbol} disabled aria-label={symbol === "+" ? "Zoom in" : "Zoom out"} title={`${missing}: GIS integration`} className="rounded border border-slate-200 px-3 text-slate-400">{symbol}</button>)}</div><Missing field="georeferenced scale (km), risk-marker and classification legend binding" />
        {available && data!.locationRecords.length ? locations.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left text-xs text-slate-500">Verified source coordinates; no map markers inferred</caption><thead><tr><th>Risk_ID / Asset</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>{locations.map(location => <tr key={location.riskId}><td>{location.riskId} / {location.assetName}</td><td>{location.latitude}</td><td>{location.longitude}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">No coordinate records match these map filters.</p> : null}
      </Panel>
      <Panel><Heading title="Risk Matrix (Current)" />{!available || data!.matrix.length !== 25 ? <Unavailable /> : <div className="mt-4 overflow-x-auto"><p className="mb-2 text-sm text-slate-500">Likelihood</p><table className="w-full border-collapse text-center text-sm"><caption className="sr-only">Current approved 5 by 5 risk distribution; cell values are counts</caption><thead><tr><th scope="col"><span className="sr-only">Likelihood</span></th>{[1, 2, 3, 4, 5].map(value => <th scope="col" key={value}>{value}</th>)}</tr></thead><tbody>{[5, 4, 3, 2, 1].map(likelihood => <tr key={likelihood}><th scope="row" className="p-2">{likelihood}</th>{[1, 2, 3, 4, 5].map(consequence => { const cell = data!.matrix.find(value => value.likelihood === likelihood && value.consequence === consequence); return <td key={consequence} className="border border-slate-200 p-3" title={cell?.level}>{cell?.count ?? missing}</td>; })}</tr>)}</tbody></table><p className="mt-2 text-center text-sm text-slate-500">Consequence</p><p className="mt-3 text-xs text-slate-500">Approved classifications: {levels.join(" · ")}</p><Missing field="API bindings for likelihood/consequence descriptions and approved matrix colors" /></div>}</Panel>
      <Donut title="Risk by Category (Threat Type)" rows={chartRows("byCategory")} available={available} total={summary?.total ?? null} />
      <BarChart title="Risk by Pipeline / Segment" rows={chartRows("byPipeline")} available={available} />
      <BarChart title="Risk by Source" rows={chartRows("bySource")} available={available} horizontal />
      <Donut title="Risk Status" rows={chartRows("byStatus")} available={available} total={summary?.total ?? null} />
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><Panel className="min-w-0 xl:col-span-2"><div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">Latest / Key Risks</h3><button type="button" className="text-sm text-slateblue-600" onClick={() => navigate("risks")}>View All</button></div>{!available ? <Unavailable /> : latest.length ? <RiskTable rows={latest.slice(0, 5)} /> : <Unavailable message="No eligible official risks in the selected scope and methodology." />}</Panel>
      <Panel><Heading title="Quick Actions" /><div className="mt-4 flex flex-col gap-3">{["New Risk Assessment", "Add to Risk Register", "Run Risk Matrix", "Import from Inspection"].map(action => <button key={action} type="button" disabled title={`${missing}: authoritative workflow and database deployment`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-400 disabled:cursor-not-allowed"><span className="flex-1">{action}</span><span aria-hidden="true">›</span></button>)}<button type="button" className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slateblue-600" onClick={() => onTab("Reports")}><span className="flex-1">View Reports</span><span aria-hidden="true">›</span></button></div></Panel>
    </div>
    <Panel><div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">Upcoming Reviews</h3><button type="button" className="text-sm text-slateblue-600" onClick={() => navigate("reviews")}>View All</button></div>{!available ? <Unavailable /> : reviews.length ? <ReviewTable rows={reviews.slice(0, 5)} /> : <Unavailable message="No scheduled reviews for eligible official risks in this scope." />}<Missing field="review urgency badge rules" /></Panel>
    {data ? <p className="text-xs text-slate-500">Basis: {data.basis}. Population: {data.population}. As of: {data.asOf}. {data.comparisons.reason}</p> : null}
  </div>;
}
