"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CalendarDays, ChevronRight, Clock3, Download, Info, Leaf, MapPin, Plus, Sparkles, Target, TrendingUp, Zap } from "lucide-react";

import { PipelineSelector } from "@/components/pipeline-selector";
import { AiPredictionResults } from "@/components/ai-prediction-results";
import { AiDeteriorationTrends } from "@/components/ai-deterioration-trends";
import { AiInspectionPrioritization } from "@/components/ai-inspection-prioritization";
import { AiScenarioAnalysis } from "@/components/ai-scenario-analysis";
import { AiModelPerformance } from "@/components/ai-model-performance";
import { AiRelatedData } from "@/components/ai-related-data";
import { AiPredictionReports } from "@/components/ai-prediction-reports";
import { AiConfiguration } from "@/components/ai-configuration";
import { aiCpHistoricalSeries, scopedAiCp, scopedAiGrowth } from "@/lib/ai-predictions-bindings";
import { fetchAiPredictionsReadiness, fetchCorrosionGrowth, fetchCpMonitoringData, isUnauthorizedError, type CorrosionGrowthEndpointResponse, type CpMonitoringRealData } from "@/lib/apiClient";
import { demoDefects } from "@/lib/defect-manager-demo-fixture";
import { iliDemoAnomalies } from "@/lib/ili-demo-fixture";
import { AiCapabilityReadiness, AiPredictionsReadiness, AiReadinessStatus, PipelineRecord } from "@/lib/types";

export type DataMode = "real" | "demo";
type CorrosionGrowthState = "idle" | "loading" | "success" | "error";
type CpMonitoringState = "idle" | "loading" | "success" | "error";
type Tooltip = { x: number; y: number; title: string; value: string } | null;
type KpiCardConfig = {
  title: string;
  value: string;
  status: string;
  helper: string;
  accent: string;
  badge?: ReactNode;
};
type AnalysisStatusCardConfig = {
  title: string;
  status: string;
  detail: string;
  source: string;
  tone: "ready" | "blocked" | "not-configured" | "demo";
};
type DemoPredictionRow = {
  id: string;
  rul: string;
  growth: string;
  rsfAt2Yr: string;
  trend: string;
  type: string;
  kp: string;
};
type DemoScadaAnomaly = {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  timestamp: string;
  asset: string;
  signal: string;
  message: string;
  status: string;
};
type DemoScadaPressurePoint = {
  label: string;
  actual: number | null;
  forecast: number;
};
type ModelPerformanceMetric = {
  label: string;
  value: string;
};
type DemoModelPerformance = {
  title: string;
  kind: "Regression" | "Anomaly classification";
  features: string[];
  metrics: ModelPerformanceMetric[];
};

const demoPredictionRows: DemoPredictionRow[] = iliDemoAnomalies.map((anomaly) => {
  const defect = demoDefects.find((item) => item.id === anomaly.id);
  return {
    id: anomaly.id,
    rul: defect?.rul ?? "DEMO unavailable",
    growth: `${anomaly.growthRateMmYear.toFixed(2)} mm/yr`,
    rsfAt2Yr: anomaly.rsf.toFixed(2),
    trend: anomaly.status,
    type: anomaly.type,
    kp: `${anomaly.kpKm.toFixed(1)} km`
  };
});

const demoScadaAnomalies: DemoScadaAnomaly[] = [
  {
    id: "SCADA-A01",
    severity: "Warning",
    timestamp: "2026-09-10 08:20",
    asset: "Station B",
    signal: "Inlet pressure",
    message: "DEMO pressure variance above advisory band.",
    status: "Open"
  },
  {
    id: "SCADA-A02",
    severity: "Critical",
    timestamp: "2026-09-10 11:40",
    asset: "Block Valve 07",
    signal: "Pressure drop",
    message: "DEMO pressure drop pattern requires review.",
    status: "Acknowledged"
  },
  {
    id: "SCADA-A03",
    severity: "Warning",
    timestamp: "2026-09-10 16:15",
    asset: "Metering Skid 02",
    signal: "Flow variance",
    message: "DEMO forecast residual exceeded review band.",
    status: "Investigating"
  },
  {
    id: "SCADA-A04",
    severity: "Info",
    timestamp: "2026-09-11 03:30",
    asset: "Compressor Outlet",
    signal: "Temperature drift",
    message: "DEMO operating envelope returned toward normal.",
    status: "Closed"
  }
];

const demoScadaPressureSeries: DemoScadaPressurePoint[] = [
  { label: "H-48", actual: 67.8, forecast: 68.0 },
  { label: "H-42", actual: 68.1, forecast: 68.2 },
  { label: "H-36", actual: 68.4, forecast: 68.3 },
  { label: "H-30", actual: 68.0, forecast: 68.1 },
  { label: "H-24", actual: 68.7, forecast: 68.4 },
  { label: "H-18", actual: 68.3, forecast: 68.5 },
  { label: "H-12", actual: 69.1, forecast: 68.6 },
  { label: "H-6", actual: 69.4, forecast: 68.8 },
  { label: "Now", actual: 69.0, forecast: 68.9 },
  { label: "H+6", actual: null, forecast: 69.1 },
  { label: "H+12", actual: null, forecast: 69.0 },
  { label: "H+18", actual: null, forecast: 68.7 },
  { label: "H+24", actual: null, forecast: 68.5 }
];

const demoModelPerformance: DemoModelPerformance[] = [
  {
    title: "Corrosion Growth Model",
    kind: "Regression",
    features: ["ILI depth history", "Feature class", "Orientation", "KP band"],
    metrics: [
      { label: "RMSE", value: "0.041 mm/yr" },
      { label: "R2", value: "0.86" }
    ]
  },
  {
    title: "CP Drift Model",
    kind: "Regression",
    features: ["Potential trend", "Protection status", "Rectifier state", "Survey interval"],
    metrics: [
      { label: "RMSE", value: "18 mV" },
      { label: "R2", value: "0.81" }
    ]
  },
  {
    title: "SCADA Anomaly Model",
    kind: "Anomaly classification",
    features: ["Pressure residual", "Flow variance", "Temperature drift", "Station state"],
    metrics: [
      { label: "Precision", value: "0.91" },
      { label: "Recall", value: "0.84" },
      { label: "F1", value: "0.87" }
    ]
  }
];

const statusLabels: Record<AiReadinessStatus, string> = {
  ready: "Ready",
  insufficient_history: "Insufficient history",
  data_source_not_connected: "Data source not connected",
  model_not_configured: "Model not configured",
  backend_not_implemented: "Backend not implemented",
  failure_criterion_not_configured: "Failure criterion not configured"
};

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "demo" }) {
  const toneClass = tone === "demo"
    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function ModeSwitch({ mode, setMode }: { mode: DataMode; setMode: (mode: DataMode) => void }) {
  return (
    <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-panel dark:border-slate-700 dark:bg-slate-900 sm:w-auto" aria-label="AI predictions data mode">
      <button
        aria-pressed={mode === "real"}
        className={`flex-1 rounded-xl px-5 py-3 text-xs font-bold tracking-[0.12em] transition sm:flex-none ${mode === "real" ? "bg-slateblue-600 text-white shadow-sm ring-2 ring-slateblue-200 dark:ring-slateblue-500/40" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        onClick={() => setMode("real")}
        type="button"
      >
        REAL DATA
      </button>
      <button
        aria-pressed={mode === "demo"}
        className={`flex-1 rounded-xl px-5 py-3 text-xs font-bold tracking-[0.12em] transition sm:flex-none ${mode === "demo" ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-200 dark:ring-amber-500/40" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        onClick={() => setMode("demo")}
        type="button"
      >
        DEMO PREVIEW
      </button>
    </div>
  );
}

function Details({ capability }: { capability: AiCapabilityReadiness }) {
  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs leading-5 dark:border-slate-800">
      <p className="text-slate-600 dark:text-slate-300">{capability.reason}</p>
      <div>
        <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Available data</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-500 dark:text-slate-400">
          {capability.availableData.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Required data</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-500 dark:text-slate-400">
          {capability.requiredData.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </section>
  );
}

function BlockedState({ capability }: { capability: AiCapabilityReadiness }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center dark:border-slate-700 dark:bg-slate-950">
      <Badge>{statusLabels[capability.status]}</Badge>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{capability.reason}</p>
      <div className="text-left">
        <Details capability={capability} />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  status,
  helper,
  accent,
  badge
}: {
  title: string;
  value: string;
  status: string;
  helper: string;
  accent: string;
  badge?: ReactNode;
}) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex min-h-10 items-start justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</h3>
        {badge}
      </div>
      <p className="mt-4 break-words text-2xl font-semibold leading-8 text-slate-900 dark:text-slate-100">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{status}</p>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p>
    </section>
  );
}

function AnalysisStatusCard({ card }: { card: AnalysisStatusCardConfig }) {
  const toneClass = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    blocked: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    "not-configured": "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    demo: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300"
  }[card.tone];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-h-10 items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{card.title}</h4>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
          {card.status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.detail}</p>
      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800">
        {card.source}
      </p>
    </article>
  );
}

function ChartFrame({ children, tooltip }: { children: ReactNode; tooltip: Tooltip }) {
  return (
    <div className="relative mt-5 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      {children}
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"
          style={{ left: `${(tooltip.x / 760) * 100}%`, top: Math.max(8, tooltip.y - 38), transform: "translateX(-50%)" }}
        >
          <p className="font-semibold text-slate-900 dark:text-slate-100">{tooltip.title}</p>
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">{tooltip.value}</p>
        </div>
      ) : null}
    </div>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className={`h-2 w-5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function ChartGrid({ ticks, x1, x2, y }: { ticks: number[]; x1: number; x2: number; y: (value: number) => number }) {
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={x1} x2={x2} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-slate-700" />
          <text x={x1 - 10} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[11px] dark:fill-slate-400">{tick}</text>
        </g>
      ))}
    </>
  );
}

function EmptyChartState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function CorrosionGrowthForecastChart({ growth }: { growth: CorrosionGrowthEndpointResponse }) {
  const [tip, setTip] = useState<Tooltip>(null);
  const points = [
    growth.growth.earlierInspectionDate && growth.growth.earlierDepth !== null
      ? { label: "Earlier ILI", date: growth.growth.earlierInspectionDate, depth: growth.growth.earlierDepth }
      : null,
    growth.growth.laterInspectionDate && growth.growth.laterDepth !== null
      ? { label: "Current ILI", date: growth.growth.laterInspectionDate, depth: growth.growth.laterDepth }
      : null
  ].filter((point): point is { label: string; date: string; depth: number } => Boolean(point));

  if (points.length < 2) {
    return <EmptyChartState title="Forecast chart unavailable" detail={growth.growth.reason} />;
  }

  const w = 760;
  const h = 280;
  const l = 64;
  const r = 28;
  const t = 26;
  const b = 50;
  const maxDepth = Math.max(...points.map((point) => point.depth), growth.rul.criterion.threshold ?? 0, 1);
  const min = 0;
  const max = Math.ceil(maxDepth + Math.max(1, maxDepth * 0.2));
  const x = (index: number) => l + index * ((w - l - r) / Math.max(1, points.length - 1));
  const y = (value: number) => t + (max - value) * ((h - t - b) / (max - min));
  const ticks = Array.from({ length: 5 }, (_, index) => Number(((max / 4) * index).toFixed(1)));
  const linePoints = points.map((point, index) => `${x(index)},${y(point.depth)}`).join(" ");
  const threshold = growth.rul.criterion.threshold;

  return (
    <>
      <ChartFrame tooltip={tip}>
        <svg className="h-auto w-full min-w-[560px]" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Historical ILI depth measurements">
          <ChartGrid ticks={ticks} x1={l} x2={w - r} y={y} />
          {threshold !== null ? (
            <line x1={l} x2={w - r} y1={y(threshold)} y2={y(threshold)} className="stroke-rose-500" strokeDasharray="6 5" strokeWidth="2" />
          ) : null}
          <polyline points={linePoints} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((point, index) => (
            <g
              key={point.label}
              onMouseEnter={() => setTip({ x: x(index), y: y(point.depth), title: point.label, value: `${point.depth} mm` })}
              onMouseLeave={() => setTip(null)}
            >
              <circle cx={x(index)} cy={y(point.depth)} r="5" className="fill-cyan-600 stroke-white dark:fill-cyan-300 dark:stroke-slate-900" strokeWidth="3" />
              <text x={x(index)} y={h - 18} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{point.label}</text>
            </g>
          ))}
          <text x="18" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">Depth (mm)</text>
        </svg>
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4">
        <ChartLegend color="bg-cyan-500" label="Backend ILI depth values" />
        {threshold !== null ? <ChartLegend color="bg-rose-500" label={`Failure criterion: ${threshold} ${growth.rul.criterion.unit ?? ""}`.trim()} /> : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        No projected line is drawn unless the backend provides projected forecast points.
      </p>
    </>
  );
}

function DemoCorrosionForecastChart() {
  const [tip, setTip] = useState<Tooltip>(null);
  const points = [
    { label: "Month 0", depth: 5.9, lower: 5.9, upper: 5.9, projected: false },
    { label: "Month 12", depth: 6.1, lower: 6.0, upper: 6.2, projected: false },
    { label: "Month 24", depth: 6.3, lower: 6.1, upper: 6.5, projected: true },
    { label: "Month 36", depth: 6.5, lower: 6.2, upper: 6.8, projected: true },
    { label: "Month 48", depth: 6.7, lower: 6.3, upper: 7.1, projected: true }
  ];
  const w = 760;
  const h = 280;
  const l = 64;
  const r = 28;
  const t = 26;
  const b = 50;
  const min = 5.5;
  const max = 7.4;
  const x = (index: number) => l + index * ((w - l - r) / (points.length - 1));
  const y = (value: number) => t + (max - value) * ((h - t - b) / (max - min));
  const band = [...points.map((point, index) => `${x(index)},${y(point.upper)}`), ...points.slice().reverse().map((point, index) => `${x(points.length - 1 - index)},${y(point.lower)}`)].join(" ");
  const historical = points.filter((point) => !point.projected).map((point, index) => `${x(index)},${y(point.depth)}`).join(" ");
  const forecast = points.slice(1).map((point, index) => `${x(index + 1)},${y(point.depth)}`).join(" ");

  return (
    <>
      <ChartFrame tooltip={tip}>
        <svg className="h-auto w-full min-w-[560px]" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Demo corrosion growth forecast chart">
          <ChartGrid ticks={[5.5, 6, 6.5, 7, 7.4]} x1={l} x2={w - r} y={y} />
          <polygon points={band} className="fill-cyan-400/20 dark:fill-cyan-300/15" />
          <polyline points={historical} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeLinecap="round" strokeWidth="3" />
          <polyline points={forecast} fill="none" className="stroke-amber-500" strokeDasharray="8 6" strokeLinecap="round" strokeWidth="3" />
          {points.map((point, index) => (
            <g key={point.label} onMouseEnter={() => setTip({ x: x(index), y: y(point.depth), title: point.label, value: `${point.depth.toFixed(2)} mm` })} onMouseLeave={() => setTip(null)}>
              <circle cx={x(index)} cy={y(point.depth)} r="5" className={`${point.projected ? "fill-amber-500" : "fill-cyan-600 dark:fill-cyan-300"} stroke-white dark:stroke-slate-900`} strokeWidth="3" />
              <text x={x(index)} y={h - 18} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{point.label.replace("Month ", "M")}</text>
            </g>
          ))}
          <text x="18" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">Depth (mm)</text>
        </svg>
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4">
        <ChartLegend color="bg-cyan-500" label="DEMO historical" />
        <ChartLegend color="bg-amber-500" label="DEMO forecast" />
        <ChartLegend color="bg-cyan-300" label="DEMO confidence band" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">DEMO F-005 - growth 0.19 mm/yr</p>
    </>
  );
}

function DemoCpDriftChart() {
  const [tip, setTip] = useState<Tooltip>(null);
  const points = [-812, -818, -824, -832, -841, -852, -861, -875, -690, -704];
  const labels = ["D-30", "D-26", "D-22", "D-18", "D-14", "D-10", "D-6", "D-3", "Today", "D+3"];
  const w = 760;
  const h = 280;
  const l = 64;
  const r = 28;
  const t = 26;
  const b = 50;
  const min = -920;
  const max = -640;
  const x = (index: number) => l + index * ((w - l - r) / (points.length - 1));
  const y = (value: number) => t + (max - value) * ((h - t - b) / (max - min));
  const line = points.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <>
      <ChartFrame tooltip={tip}>
        <svg className="h-auto w-full min-w-[560px]" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Demo CP potential drift forecast chart">
          <ChartGrid ticks={[-900, -850, -800, -750, -700, -650]} x1={l} x2={w - r} y={y} />
          <line x1={l} x2={w - r} y1={y(-850)} y2={y(-850)} className="stroke-rose-500" strokeDasharray="6 5" strokeWidth="2" />
          <polygon points={`${l},${h - b} ${line} ${w - r},${h - b}`} className="fill-violet-500/10" />
          <polyline points={line} fill="none" className="stroke-violet-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((value, index) => (
            <g key={labels[index]} onMouseEnter={() => setTip({ x: x(index), y: y(value), title: labels[index], value: `${value} mV CSE` })} onMouseLeave={() => setTip(null)}>
              <circle cx={x(index)} cy={y(value)} r="5" className="fill-violet-500 stroke-white dark:stroke-slate-900" strokeWidth="3" />
              <text x={x(index)} y={h - 18} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{index % 2 === 0 ? labels[index] : ""}</text>
            </g>
          ))}
          <text x="18" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">mV CSE</text>
        </svg>
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4">
        <ChartLegend color="bg-violet-500" label="DEMO TP-05 30-day potential trend" />
        <ChartLegend color="bg-rose-500" label="DEMO -850 mV criterion" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">DEMO TP-05 - CP potential drift preview</p>
    </>
  );
}

function CpHistoricalTrendChart({ data }: { data: CpMonitoringRealData }) {
  const [tip, setTip] = useState<Tooltip>(null);
  const history = aiCpHistoricalSeries(data);
  const readings = history.readings
    .map((item) => ({
      label: new Date(item.readingAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: Number(item.valueMv),
      status: item.protectionStatus
    }));

  if (readings.length < 2) {
    const reason = history.reason ?? "CP monitoring trend history is not available for the selected pipeline.";
    return <EmptyChartState title="CP forecast unavailable" detail={reason} />;
  }

  const w = 760;
  const h = 280;
  const l = 64;
  const r = 28;
  const t = 26;
  const b = 50;
  const minValue = Math.min(...readings.map((point) => point.value));
  const maxValue = Math.max(...readings.map((point) => point.value));
  const min = Math.floor((minValue - 40) / 50) * 50;
  const max = Math.ceil((maxValue + 40) / 50) * 50;
  const x = (index: number) => l + index * ((w - l - r) / (readings.length - 1));
  const y = (value: number) => t + (max - value) * ((h - t - b) / (max - min));
  const line = readings.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const ticks = Array.from({ length: 6 }, (_, index) => Math.round(max - ((max - min) / 5) * index));

  return (
    <>
      <ChartFrame tooltip={tip}>
        <svg className="h-auto w-full min-w-[560px]" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="CP monitoring historical potential chart">
          <ChartGrid ticks={ticks} x1={l} x2={w - r} y={y} />
          <polyline points={line} fill="none" className="stroke-violet-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {readings.map((point, index) => (
            <g key={`${point.label}-${index}`} onMouseEnter={() => setTip({ x: x(index), y: y(point.value), title: point.label, value: `${point.value} ${history.unit}` })} onMouseLeave={() => setTip(null)}>
              <circle cx={x(index)} cy={y(point.value)} r="5" className="fill-violet-500 stroke-white dark:stroke-slate-900" strokeWidth="3" />
              <text x={x(index)} y={h - 18} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{index === 0 || index === readings.length - 1 ? point.label : ""}</text>
            </g>
          ))}
          <text x="18" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">{history.unit}</text>
        </svg>
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4">
        <ChartLegend color="bg-violet-500" label="Existing CP monitoring trend" />
      </div>
      <EmptyChartState
        title="Forecast output not available"
        detail="Existing CP monitoring data provides stored readings only. No backend CP prediction output exists, so no forecast line is drawn."
      />
    </>
  );
}

function EmptyRegister({ capability }: { capability: AiCapabilityReadiness }) {
  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {["Defect ID", "RUL", "Growth Rate", "Projected RSF", "Trend"].map((label) => (
                <th key={label} className="break-words px-2 py-3 font-medium sm:px-4">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                No prediction results available
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Details capability={capability} />
    </>
  );
}

function DemoRulComparison() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {demoPredictionRows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{row.id}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.type} / {row.kp}</p>
            </div>
            <Badge tone="demo">DEMO</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">RUL</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{row.rul}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Trend</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{row.trend}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <p className="rounded-xl bg-cyan-50 px-3 py-2 font-semibold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">{row.growth}</p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">RSF@2yr {row.rsfAt2Yr}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function DemoPredictionRegister() {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <tr>
            {["Defect ID", "KP", "Type", "RUL", "Growth", "RSF@2yr", "Trend", "Source"].map((label) => (
              <th className="px-4 py-3 font-semibold" key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {demoPredictionRows.map((row) => (
            <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800" key={row.id}>
              <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{row.id}</td>
              <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.kp}</td>
              <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.type}</td>
              <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{row.rul}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-slate-300">{row.growth}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-slate-300">{row.rsfAt2Yr}</td>
              <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.trend}</td>
              <td className="px-4 py-4"><Badge tone="demo">DEMO</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemoScadaAnomalyFeed() {
  const severityClass: Record<DemoScadaAnomaly["severity"], string> = {
    Critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    Warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    Info: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
  };

  return (
    <div className="mt-5 space-y-3">
      {demoScadaAnomalies.map((event) => (
        <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${severityClass[event.severity]}`}>
                  {event.severity}
                </span>
                <Badge tone="demo">DEMO</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{event.message}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {event.asset} / {event.signal} / {event.timestamp}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {event.status}
            </div>
          </div>
        </article>
      ))}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
        DEMO anomaly feed only. No real SCADA telemetry source is connected.
      </p>
    </div>
  );
}

function DemoScadaForecastActualChart() {
  const [tip, setTip] = useState<Tooltip>(null);
  const w = 760;
  const h = 280;
  const l = 64;
  const r = 28;
  const t = 26;
  const b = 50;
  const values = demoScadaPressureSeries.flatMap((point) => [point.actual, point.forecast]).filter((value): value is number => value !== null);
  const min = Math.floor((Math.min(...values) - 0.6) * 2) / 2;
  const max = Math.ceil((Math.max(...values) + 0.6) * 2) / 2;
  const x = (index: number) => l + index * ((w - l - r) / (demoScadaPressureSeries.length - 1));
  const y = (value: number) => t + (max - value) * ((h - t - b) / (max - min));
  const actualPoints = demoScadaPressureSeries
    .map((point, index) => point.actual === null ? null : `${x(index)},${y(point.actual)}`)
    .filter((point): point is string => Boolean(point))
    .join(" ");
  const forecastPoints = demoScadaPressureSeries.map((point, index) => `${x(index)},${y(point.forecast)}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, index) => Number((min + ((max - min) / 4) * index).toFixed(1)));

  return (
    <>
      <ChartFrame tooltip={tip}>
        <svg className="h-auto w-full min-w-[560px]" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Demo SCADA pressure actual versus forecast chart">
          <ChartGrid ticks={ticks} x1={l} x2={w - r} y={y} />
          <polyline points={forecastPoints} fill="none" className="stroke-amber-500" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          <polyline points={actualPoints} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {demoScadaPressureSeries.map((point, index) => (
            <g key={point.label}>
              {point.actual !== null ? (
                <circle
                  cx={x(index)}
                  cy={y(point.actual)}
                  r="5"
                  className="fill-cyan-600 stroke-white dark:fill-cyan-300 dark:stroke-slate-900"
                  strokeWidth="3"
                  onMouseEnter={() => setTip({ x: x(index), y: y(point.actual ?? point.forecast), title: point.label, value: `Actual ${point.actual} bar / Forecast ${point.forecast} bar` })}
                  onMouseLeave={() => setTip(null)}
                />
              ) : (
                <circle
                  cx={x(index)}
                  cy={y(point.forecast)}
                  r="4"
                  className="fill-amber-500 stroke-white dark:stroke-slate-900"
                  strokeWidth="3"
                  onMouseEnter={() => setTip({ x: x(index), y: y(point.forecast), title: point.label, value: `Forecast ${point.forecast} bar` })}
                  onMouseLeave={() => setTip(null)}
                />
              )}
              <text x={x(index)} y={h - 18} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
                {index % 2 === 0 ? point.label : ""}
              </text>
            </g>
          ))}
          <text x="18" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">Pressure (bar)</text>
        </svg>
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4">
        <ChartLegend color="bg-cyan-500" label="DEMO actual pressure" />
        <ChartLegend color="bg-amber-500" label="DEMO forecast pressure" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
        DEMO 48-hour pressure actual vs forecast. No real SCADA history is connected.
      </p>
    </>
  );
}

function ModelPerformanceCard({
  title,
  capability,
  metricLabels
}: {
  title: string;
  capability: AiCapabilityReadiness;
  metricLabels: string[];
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{capability.reason}</p>
        </div>
        <Badge>{capability.ready ? "Ready" : "Not Available"}</Badge>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {metricLabels.map((label) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Not Available</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        No persisted model-performance metrics are available from the existing readiness data.
      </p>
    </article>
  );
}

function DemoModelPerformanceCard({ model }: { model: DemoModelPerformance }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{model.title}</h4>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slateblue-600 dark:text-blue-400">{model.kind}</p>
        </div>
        <Badge tone="demo">DEMO</Badge>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {model.metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Demo features</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {model.features.map((feature) => (
            <span key={feature} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
              {feature}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

const img02Tabs = ["Overview", "Prediction Results", "Deterioration Trends", "Inspection Prioritization", "Scenario Analysis", "Model Performance", "Related Data", "Reports", "Configuration"];
const img02Missing = "BLOCKED — saved AI outputs and approved model/run/source contracts are unavailable.";

function Img02Button({ children, reason = img02Missing }: { children: ReactNode; reason?: string }) {
  return <button type="button" disabled title={reason} className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">{children}</button>;
}

function Img02Panel({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-blue-950 dark:text-slate-100"><span className="shrink-0 text-blue-600">{icon}</span>{title}</h3>{action}
    </div>{children}
  </section>;
}

function Img02Unavailable({ reason = img02Missing, className = "" }: { reason?: string; className?: string }) {
  return <div className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-md bg-slate-50 p-4 text-center dark:bg-slate-950 ${className}`}>
    <p className="text-2xl font-semibold text-slate-400">N/A</p><p className="max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">{reason}</p>
  </div>;
}

function Img02Table({ columns, reason }: { columns: string[]; reason: string }) {
  return <div className="min-w-0 overflow-x-auto rounded-md border border-blue-100 dark:border-slate-700">
    <table className="w-full text-left text-xs"><thead className="bg-blue-50 text-blue-950 dark:bg-slate-800 dark:text-blue-200"><tr>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap px-2 py-2 font-semibold">{column}</th>)}</tr></thead>
      <tbody><tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"><strong className="block text-lg font-semibold">N/A</strong><span className="mt-2 block leading-5">{reason}</span></td></tr></tbody>
    </table>
  </div>;
}

/** IMG-02 is a read-only overview. Native history stays in its existing source views. */
export function AiImg02Overview({ readiness, loading, failed, children, historicalContext, sourceControls, reportPipelineId, onSourceUnauthorized }: { readiness: AiPredictionsReadiness | null; loading: boolean; failed: boolean; children?: ReactNode; historicalContext?: ReactNode; sourceControls?: ReactNode; reportPipelineId?: string; onSourceUnauthorized?: () => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const metrics = [
    { title: "Predicted High-Risk Locations", icon: TrendingUp, color: "bg-violet-600", note: "Advisory outlook · scoring contract pending" },
    { title: "Likely New Defects (12 months)", icon: AlertTriangle, color: "bg-red-600", note: "Predictions only · no saved outputs" },
    { title: "Assets Requiring Early Inspection", icon: Clock3, color: "bg-amber-500", note: "Recommendations · no approved schedule" },
    { title: "Estimated Life Reduction", icon: Leaf, color: "bg-emerald-700", note: "Segments affected · model estimate unavailable" },
    { title: "Model Confidence", icon: Target, color: "bg-blue-600", note: "Confidence definition and validation pending" }
  ];
  const actions = [
    { title: "Run AI Analysis", text: "Process latest data and generate new predictions", icon: Activity, reason: readiness?.capabilities.predictionScan.reason ?? img02Missing },
    { title: "View High-Risk Locations", text: "See all predicted high-risk segments on map", icon: MapPin, reason: "BLOCKED — saved advisory outlook, geometry and full-map handoff unavailable." },
    { title: "Generate Inspection Plan", text: "Create inspection plan based on AI predictions", icon: CalendarDays, reason: "BLOCKED — advisory recommendation wording and human-approved Action/planning handoff required; AI cannot create an approved schedule." },
    { title: "Download Report", text: "Export AI prediction results", icon: Download, reason: "BLOCKED — central AI reporting dataset and document linkage unavailable." }
  ];
  const iconSize = 17;
  return <div data-ai-img02="overview" className="min-w-0 space-y-3 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3"><span className="rounded-lg bg-violet-700 p-3 text-white"><Sparkles size={24} /></span><div className="min-w-0"><h2 className="text-2xl font-bold text-blue-950 dark:text-white">AI Predictions</h2><p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">Predict, prioritize and prepare for the future. AI-driven insights for pipeline integrity, based on historical data and current conditions.</p></div></div>
      <div className="flex gap-2"><Img02Button reason="BLOCKED — AI reporting dataset and export contract unavailable."><Download size={15} />Export</Img02Button><Img02Button reason={actions[0].reason}><Plus size={15} />Run AI Analysis</Img02Button></div>
    </header>
    <p role="status" aria-live="polite" className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200">
      AI advisory only · {loading ? "Loading authenticated source readiness…" : failed || !readiness ? "Source readiness unavailable. Predictions remain blocked." : "Saved AI outputs unavailable. N/A indicates blocked data, not zero."}
    </p>
    <section aria-label="AI prediction KPIs" className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(({ title, icon: Icon, color, note }) => <article key={title} className="flex min-w-0 items-start gap-3 rounded-md border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900"><span className={`shrink-0 rounded-lg p-3 text-white ${color}`}><Icon size={23} /></span><div className="min-w-0"><p className="text-xl font-bold text-blue-950 dark:text-white">N/A</p><h3 className="mt-1 text-xs font-medium leading-5 text-blue-700 dark:text-blue-300">{title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">BLOCKED · {note}</p></div></article>)}</section>
    <nav aria-label="AI Predictions tabs" className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-blue-50 p-1 dark:bg-slate-800">{img02Tabs.map((tab, index) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} disabled={index > 8} onClick={() => { setActiveTab(tab); setDetailsOpen(false); }} title={index > 8 ? "BLOCKED — all nine reference tabs have local UI; operational contracts remain independently blocked." : undefined} className={`shrink-0 whitespace-nowrap rounded-md px-4 py-3 text-xs font-medium ${activeTab === tab ? "border border-blue-500 bg-white text-blue-700 dark:bg-slate-900" : index > 8 ? "cursor-not-allowed text-blue-700 opacity-60 dark:text-blue-300" : "text-blue-700 hover:bg-white dark:text-blue-300 dark:hover:bg-slate-900"}`}>{tab}</button>)}</nav>
    {activeTab === "Configuration" ? <AiConfiguration loading={loading} failed={failed} readiness={readiness} /> : activeTab === "Reports" ? <AiPredictionReports loading={loading} failed={failed} pipelineId={reportPipelineId} sourceControls={sourceControls} onUnauthorized={onSourceUnauthorized} /> : activeTab === "Related Data" ? <AiRelatedData loading={loading} failed={failed} /> : activeTab === "Model Performance" ? <AiModelPerformance loading={loading} failed={failed} /> : activeTab === "Scenario Analysis" ? <AiScenarioAnalysis loading={loading} failed={failed} /> : activeTab === "Inspection Prioritization" ? <AiInspectionPrioritization loading={loading} failed={failed} /> : activeTab === "Deterioration Trends" ? <AiDeteriorationTrends loading={loading} failed={failed} historicalContext={historicalContext} sourceControls={sourceControls} /> : activeTab === "Prediction Results" ? <AiPredictionResults loading={loading} failed={failed} /> : <>
    <div className="grid min-w-0 gap-3 xl:grid-cols-[1.15fr_1fr_0.85fr]">
      <Img02Panel title="Predicted Risk Hotspots" icon={<MapPin size={iconSize} />} action={<Img02Button>View Full Map</Img02Button>}>
        <div className="relative rounded-md border border-slate-200 dark:border-slate-700"><div className="absolute left-2 top-2 flex flex-col"><Img02Button>+</Img02Button><Img02Button>−</Img02Button></div><Img02Unavailable className="min-h-52" reason="BLOCKED — no saved AI hotspots or approved map geometry/provider. No example locations plotted." /></div>
        <p className="mt-2 text-[10px] text-slate-500">AI Predicted Risk · Classification and pipeline geometry N/A</p>
      </Img02Panel>
      <Img02Panel title="Predicted Defect Count" icon={<TrendingUp size={iconSize} />} action={<select aria-label="Prediction horizon" disabled className="max-w-full rounded border border-blue-100 bg-white p-1 text-xs text-blue-800 dark:bg-slate-800 dark:text-blue-200"><option>Next 12 Months</option></select>}>
        <div className="mb-2 flex flex-wrap justify-center gap-3 text-[10px] text-slate-500"><span>■ AI Predicted</span><span>□ Historical Average</span></div>
        <Img02Unavailable className="min-h-44" reason="BLOCKED — monthly forecast counts, calendar basis and comparable historical baseline unavailable." />
        <p className="mt-2 text-center text-[10px] text-slate-500">Number of Defects · Time buckets N/A</p>
      </Img02Panel>
      <Img02Panel title="Remaining Life Distribution" icon={<Clock3 size={iconSize} />}>
        <div className="flex min-h-52 flex-wrap items-center justify-center gap-4"><div className="flex h-36 w-36 shrink-0 flex-col items-center justify-center rounded-full border-[18px] border-slate-100 dark:border-slate-800"><strong className="text-xl">N/A</strong><span className="text-xs">Segments</span></div><p className="max-w-44 text-xs leading-5 text-slate-500">BLOCKED — saved life estimates, eligible population and approved bin boundaries unavailable.</p></div>
      </Img02Panel>
      <Img02Panel title="AI Key Insights" icon={<Sparkles size={iconSize} />} action={<button type="button" aria-expanded={detailsOpen} aria-controls="ai-img02-blockers" onClick={() => setDetailsOpen(value => !value)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-300">View Details<ChevronRight size={14} /></button>}>
        <Img02Unavailable className="min-h-48" reason="BLOCKED — no saved prediction explanations or source-linked insight evidence." />
        {detailsOpen ? <aside id="ai-img02-blockers" aria-label="AI insight blockers" className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto border-l border-blue-100 bg-white p-6 text-xs leading-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"><h4 className="text-sm font-semibold">Required before AI insights are available</h4><p className="mt-4">{readiness?.capabilities.predictionScan.reason ?? img02Missing}</p><p className="mt-4">Immutable source snapshot, approved model/run lineage, prediction ID, confidence, horizon and explanation evidence are required. Engineering records remain source-owned.</p><button type="button" onClick={() => setDetailsOpen(false)} className="mt-4 rounded border px-3 py-2">Close</button></aside> : null}
      </Img02Panel>
      <Img02Panel title="Deterioration Trend (Sample Segment)" icon={<Activity size={iconSize} />} action={<select aria-label="Forecast segment" disabled className="max-w-full rounded border border-blue-100 bg-white p-1 text-xs text-blue-800 dark:bg-slate-800 dark:text-blue-200"><option>Segment N/A</option></select>}>
        <div className="mb-2 flex flex-wrap justify-center gap-3 text-[10px] text-slate-500"><span>— Historical</span><span>┄ AI Predicted</span><span>□ Confidence Range</span></div>
        <Img02Unavailable className="min-h-40" reason="BLOCKED — Condition Index method, saved forecasts, model version, start date and interval bounds unavailable." />
        <p className="mt-2 text-xs text-slate-500">Condition Index · N/A <span className="float-right">Estimated life reduction: N/A</span></p>
      </Img02Panel>
      <Img02Panel title="Quick Actions" icon={<Zap size={iconSize} />}><div className="space-y-2">{actions.map(({ title, text, icon: Icon, reason }) => <button key={title} type="button" disabled title={reason} className="flex w-full cursor-not-allowed items-center gap-3 rounded-md border border-blue-100 p-2 text-left opacity-60 dark:border-slate-700"><span className="rounded-md bg-blue-600 p-2 text-white"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-blue-950 dark:text-white">{title}</span><span className="mt-1 block text-[10px] leading-4 text-blue-700 dark:text-blue-300">{text}</span><span className="block text-[10px] text-slate-500">BLOCKED</span></span><ChevronRight size={14} className="shrink-0 text-blue-600" /></button>)}</div></Img02Panel>
    </div>
    <div className="grid min-w-0 gap-3 xl:grid-cols-[1.4fr_1fr_1fr]">
      <Img02Panel title="Top Predicted High-Risk Segments" icon={<AlertTriangle size={iconSize} />} action={<Img02Button>View All</Img02Button>}><Img02Table columns={["Rank", "Segment ID", "Location", "Risk Score", "Primary Concern", "Predicted Issues", "Suggested Action"]} reason="BLOCKED — no saved advisory predictions, approved score or ranking contract." /></Img02Panel>
      <Img02Panel title="Recent AI Predictions" icon={<Clock3 size={iconSize} />} action={<Img02Button>View All</Img02Button>}><Img02Table columns={["Date", "Type", "Location / Asset", "Risk Score", "Status"]} reason="BLOCKED — prediction register, lineage and approved review states unavailable." /></Img02Panel>
      <Img02Panel title="Upcoming AI Analyses" icon={<CalendarDays size={iconSize} />} action={<Img02Button>View All</Img02Button>}><Img02Table columns={["Scheduled Date", "Analysis Type", "Scope", "Status"]} reason="BLOCKED — no authorized AI schedule/job provider. No jobs created." /></Img02Panel>
    </div>
    {children ? <details className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><summary className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-200">Verified source data and readiness <span className="font-normal">· historical context, not AI forecasts</span></summary><div className="mt-4 min-w-0">{children}</div></details> : null}
    </>}
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />AI predictions are advisory. Source records, approved engineering risk and inspection schedules remain unchanged. Model promotion requires human approval.</p>
  </div>;
}

export function AiPredictionsWorkspace({
  mode: controlledMode,
  onModeChange
}: {
  mode?: DataMode;
  onModeChange?: (mode: DataMode) => void;
} = {}) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState<DataMode>("real");
  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const [readiness, setReadiness] = useState<AiPredictionsReadiness | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [corrosionGrowthRead, setCorrosionGrowth] = useState<CorrosionGrowthEndpointResponse | null>(null);
  const [corrosionGrowthState, setCorrosionGrowthState] = useState<CorrosionGrowthState>("idle");
  const [corrosionGrowthError, setCorrosionGrowthError] = useState<string | null>(null);
  const [cpMonitoringRead, setCpMonitoring] = useState<CpMonitoringRealData | null>(null);
  const [cpMonitoringState, setCpMonitoringState] = useState<CpMonitoringState>("idle");
  const [cpMonitoringError, setCpMonitoringError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const corrosionGrowth = !failed && readiness ? scopedAiGrowth(selectedPipeline?.id, corrosionGrowthRead) : null;
  const cpMonitoring = !failed && readiness ? scopedAiCp(selectedPipeline?.id, cpMonitoringRead) : null;

  useEffect(() => {
    let mounted = true;
    void fetchAiPredictionsReadiness()
      .then((data) => {
        if (mounted) {
          setReadiness(data);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setReadiness(null);
        setFailed(true);
        if (isUnauthorizedError(error)) {
          router.replace("/login");
          return;
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (mode !== "real" || !selectedPipeline?.id || !readiness || failed) {
      setCorrosionGrowth(null);
      setCorrosionGrowthState("idle");
      setCorrosionGrowthError(null);
      return;
    }

    let mounted = true;
    setCorrosionGrowth(null);
    setCorrosionGrowthState("loading");
    setCorrosionGrowthError(null);

    void fetchCorrosionGrowth(selectedPipeline.id)
      .then((data) => {
        if (!mounted) return;
        if (!scopedAiGrowth(selectedPipeline.id, data)) throw new Error("Corrosion-growth response does not match the selected pipeline.");
        setCorrosionGrowth(data);
        setCorrosionGrowthState("success");
      })
      .catch((error) => {
        if (!mounted) return;
        if (isUnauthorizedError(error)) {
          setReadiness(null);
          setFailed(true);
          setCorrosionGrowth(null);
          setCpMonitoring(null);
          router.replace("/login");
          return;
        }
        setCorrosionGrowth(null);
        setCorrosionGrowthState("error");
        setCorrosionGrowthError(error instanceof Error ? error.message : "Corrosion-growth status unavailable.");
      });

    return () => {
      mounted = false;
    };
  }, [mode, router, selectedPipeline?.id, readiness, failed]);

  useEffect(() => {
    if (mode !== "real" || !selectedPipeline?.id || !readiness || failed) {
      setCpMonitoring(null);
      setCpMonitoringState("idle");
      setCpMonitoringError(null);
      return;
    }

    let mounted = true;
    setCpMonitoring(null);
    setCpMonitoringState("loading");
    setCpMonitoringError(null);

    void fetchCpMonitoringData(selectedPipeline.id)
      .then((data) => {
        if (!mounted) return;
        if (!scopedAiCp(selectedPipeline.id, data)) throw new Error("CP response does not match the selected pipeline.");
        setCpMonitoring(data);
        setCpMonitoringState("success");
      })
      .catch((error) => {
        if (!mounted) return;
        if (isUnauthorizedError(error)) {
          setReadiness(null);
          setFailed(true);
          setCorrosionGrowth(null);
          setCpMonitoring(null);
          router.replace("/login");
          return;
        }
        setCpMonitoring(null);
        setCpMonitoringState("error");
        setCpMonitoringError(error instanceof Error ? error.message : "CP monitoring data unavailable.");
      });

    return () => {
      mounted = false;
    };
  }, [mode, router, selectedPipeline?.id, readiness, failed]);

  const capabilities = readiness?.capabilities;
  const actionReason = capabilities?.retraining.reason ?? capabilities?.predictionScan.reason ?? (loading ? "Loading readiness status" : "Readiness status unavailable");
  const isDemo = mode === "demo";

  const kpiCards = useMemo<KpiCardConfig[]>(() => {
    if (isDemo) {
      return [
        { title: "Critical Forecast", value: "F-005", status: "URGENT", helper: "DEMO preview only.", accent: "bg-rose-500", badge: <Badge tone="demo">DEMO</Badge> },
        { title: "Avg Pipeline RUL", value: "11.4 years", status: "MONITOR", helper: "DEMO preview only.", accent: "bg-blue-500", badge: <Badge tone="demo">DEMO</Badge> },
        { title: "Corrosion Rate (Max)", value: "0.19 mm/yr", status: "ELEVATED", helper: "DEMO preview only.", accent: "bg-amber-500", badge: <Badge tone="demo">DEMO</Badge> },
        { title: "CP Drift Prediction", value: "TP-05, -690 mV", status: "ALERT", helper: "DEMO preview only.", accent: "bg-violet-500", badge: <Badge tone="demo">DEMO</Badge> },
        { title: "Model Confidence", value: "87%", status: "GOOD", helper: "DEMO preview only.", accent: "bg-emerald-500", badge: <Badge tone="demo">DEMO</Badge> }
      ];
    }

    if (!capabilities) {
      return [];
    }

    const growthReason = !selectedPipeline
      ? "Select a pipeline to load the existing corrosion-growth endpoint."
      : corrosionGrowthState === "loading"
        ? "Loading existing corrosion-growth endpoint for the selected pipeline."
        : corrosionGrowthState === "error"
          ? corrosionGrowthError ?? "Corrosion-growth endpoint unavailable."
          : corrosionGrowth?.growth.reason ?? capabilities.corrosionGrowthForecasting.reason;

    return [
      {
        title: "Critical Forecast",
        value: statusLabels[capabilities.defectPrediction.status],
        status: capabilities.defectPrediction.ready ? "READY" : "BLOCKED",
        helper: capabilities.defectPrediction.reason,
        accent: "bg-rose-500"
      },
      {
        title: "Avg Pipeline RUL",
        value: "Not Available",
        status: "NOT AVAILABLE",
        helper: "MISSING FIELD — APPROVAL NEEDED: portfolio RUL population and aggregation. The existing endpoint returns a selected feature, not a pipeline average.",
        accent: "bg-blue-500"
      },
      {
        title: "Corrosion Rate (Max)",
        value: "Not Available",
        status: "NOT AVAILABLE",
        helper: `${growthReason} MISSING FIELD — APPROVAL NEEDED: an authorized maximum-rate population; a selected feature is not a portfolio maximum.`,
        accent: "bg-amber-500"
      },
      {
        title: "CP Drift Prediction",
        value: statusLabels[capabilities.cpDriftPrediction.status],
        status: capabilities.cpDriftPrediction.ready ? "READY" : "BLOCKED",
        helper: capabilities.cpDriftPrediction.reason,
        accent: "bg-violet-500"
      },
      {
        title: "Model Confidence",
        value: "Not Available",
        status: "NOT AVAILABLE",
        helper: "No real model-confidence metric exists yet.",
        accent: "bg-slate-400"
      }
    ];
  }, [capabilities, corrosionGrowth, corrosionGrowthError, corrosionGrowthState, isDemo, selectedPipeline]);

  const analysisStatusCards = useMemo<AnalysisStatusCardConfig[]>(() => {
    if (isDemo) {
      return [
        { title: "ILI Analysis", status: "DEMO", detail: "Demo anomaly review activity for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "CP Monitoring", status: "DEMO", detail: "Demo CP drift watch state for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "SCADA Analysis", status: "DEMO", detail: "Demo SCADA anomaly triage state for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Risk Analysis", status: "DEMO", detail: "Demo risk-screening activity for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Prediction Engine", status: "DEMO", detail: "Demo prediction-engine readiness state for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Document Analysis", status: "DEMO", detail: "Demo document review activity for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Alert Processing", status: "DEMO", detail: "Demo alert-prioritization activity for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Report Generation", status: "DEMO", detail: "Demo report-assist activity for preview only.", source: "DEMO PREVIEW", tone: "demo" },
        { title: "Prediction Orchestration", status: "DEMO", detail: "Demo orchestration activity for preview only.", source: "DEMO PREVIEW", tone: "demo" }
      ];
    }

    const fromCapability = (title: string, capability: AiCapabilityReadiness, source: string): AnalysisStatusCardConfig => {
      const notConfigured = capability.status === "model_not_configured" || capability.status === "backend_not_implemented" || capability.status === "data_source_not_connected";
      return {
        title,
        status: capability.ready ? "Ready" : notConfigured ? "Not Configured" : "Blocked",
        detail: capability.reason,
        source,
        tone: capability.ready ? "ready" : notConfigured ? "not-configured" : "blocked"
      };
    };

    const notConfigured = (title: string, detail: string): AnalysisStatusCardConfig => ({
      title,
      status: "Not Configured",
      detail,
      source: "No existing readiness source",
      tone: "not-configured"
    });

    if (!capabilities) {
      return [];
    }

    return [
      fromCapability("ILI Analysis", capabilities.corrosionGrowthForecasting, "AI readiness / ILI corrosion-growth source"),
      fromCapability("CP Monitoring", capabilities.cpDriftPrediction, "AI readiness / CP drift capability"),
      fromCapability("SCADA Analysis", capabilities.scadaAnomalyDetection, "AI readiness / SCADA anomaly capability"),
      fromCapability("Risk Analysis", capabilities.defectPrediction, "AI readiness / defect and risk input capability"),
      fromCapability("Prediction Engine", capabilities.predictionScan, "AI readiness / prediction scan capability"),
      notConfigured("Document Analysis", "No existing AI document-analysis readiness source is configured."),
      notConfigured("Alert Processing", "No existing AI alert-processing readiness source is configured."),
      notConfigured("Report Generation", "No existing AI report-generation readiness source is configured."),
      fromCapability("Prediction Orchestration", capabilities.predictionScan, "AI readiness / orchestration action capability")
    ];
  }, [capabilities, isDemo]);

  const sourceWorkspace = (
    <div className="min-w-0 space-y-6 dark:rounded-[28px] dark:bg-slate-950 dark:p-4 sm:dark:p-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slateblue-600 dark:text-blue-400">A7 | Predictive Analytics</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">AI Predictions</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Corrosion growth, CP drift, SCADA anomalies and remaining useful life readiness.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {isDemo
              ? "Demo preview is enabled for the completed AI prediction sections."
              : loading
                ? "Loading prediction readiness..."
                : readiness
                  ? "Readiness is based on current source data and configured backend capabilities."
                  : "Readiness status unavailable"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {isDemo ? "All demo status/activity is clearly labelled DEMO." : actionReason}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {readiness && !isDemo ? <><Badge>{readiness.readyCapabilities} ready</Badge><Badge>{readiness.blockedCapabilities} blocked</Badge></> : null}
          {!readiness && !isDemo ? <Badge>{loading ? "Loading" : "Unavailable"}</Badge> : null}
          {isDemo ? <Badge tone="demo">Demo preview active</Badge> : null}
        </div>
      </div>

      {failed && !isDemo ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          Readiness status unavailable. Prediction and retraining actions remain disabled.
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">KPI Cards</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Real values use existing readiness and corrosion-growth sources only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              disabled
              title={capabilities?.retraining.reason ?? "Readiness status unavailable"}
              type="button"
            >
              Re-train Models
            </button>
            <button
              className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              disabled
              title={capabilities?.predictionScan.reason ?? "Readiness status unavailable"}
              type="button"
            >
              Run Full Prediction Scan
            </button>
          </div>
        </div>

        {!isDemo ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline for corrosion-growth KPI</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Corrosion Rate and RUL load from the existing corrosion-growth endpoint only after a pipeline is selected.
            </p>
            <div className="mt-4">
              <PipelineSelector
                mode="select-only"
                onClear={() => setSelectedPipeline(null)}
                onSelect={setSelectedPipeline}
                selectedPipeline={selectedPipeline}
              />
            </div>
          </div>
        ) : null}

        {kpiCards.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpiCards.map((card) => (
              <KpiCard
                accent={card.accent}
                badge={card.badge}
                helper={card.helper}
                key={card.title}
                status={card.status}
                title={card.title}
                value={card.value}
              />
            ))}
          </div>
        ) : null}
      </section>

      <Panel title="AI Analysis Status" description="Nine readiness cards using existing backend status only in real mode. Demo activity is clearly marked.">
        {analysisStatusCards.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {analysisStatusCards.map((card) => (
              <AnalysisStatusCard card={card} key={card.title} />
            ))}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Corrosion Growth & RUL Forecast" description="Existing corrosion-growth endpoint only. No frontend ILI/RUL recalculation is performed.">
          {isDemo ? (
            <DemoCorrosionForecastChart />
          ) : !selectedPipeline ? (
            <EmptyChartState title="Select a pipeline" detail="Choose a pipeline above to load existing corrosion-growth data." />
          ) : corrosionGrowthState === "loading" ? (
            <EmptyChartState title="Loading corrosion-growth data" detail="Fetching existing backend corrosion-growth readiness for the selected pipeline." />
          ) : corrosionGrowthState === "error" ? (
            <EmptyChartState title="Corrosion-growth unavailable" detail={corrosionGrowthError ?? "Existing corrosion-growth endpoint could not be loaded."} />
          ) : corrosionGrowth && corrosionGrowth.growth.status === "calculated" ? (
            <CorrosionGrowthForecastChart growth={corrosionGrowth} />
          ) : corrosionGrowth ? (
            <EmptyChartState title="Forecast blocked" detail={corrosionGrowth.rul.reason || corrosionGrowth.growth.reason} />
          ) : capabilities ? (
            <BlockedState capability={capabilities.corrosionGrowthForecasting} />
          ) : null}
        </Panel>
        <Panel title="CP Potential Drift Forecast" description="Existing CP monitoring data only. Forecast line appears only when backend prediction output exists.">
          {isDemo ? (
            <DemoCpDriftChart />
          ) : !selectedPipeline ? (
            <EmptyChartState title="Select a pipeline" detail="Choose a pipeline above to load existing CP monitoring data." />
          ) : cpMonitoringState === "loading" ? (
            <EmptyChartState title="Loading CP monitoring data" detail="Fetching existing CP monitoring readings for the selected pipeline." />
          ) : cpMonitoringState === "error" ? (
            <EmptyChartState title="CP monitoring unavailable" detail={cpMonitoringError ?? "Existing CP monitoring endpoint could not be loaded."} />
          ) : cpMonitoring ? (
            <CpHistoricalTrendChart data={cpMonitoring} />
          ) : capabilities ? (
            <BlockedState capability={capabilities.cpDriftPrediction} />
          ) : null}
        </Panel>
      </div>

      <Panel title="Multi-Defect RUL Comparison" description="Real mode requires persisted prediction records. Demo mode uses approved F-001 to F-008 demo data only.">
        {isDemo ? <DemoRulComparison /> : capabilities ? <BlockedState capability={capabilities.defectPrediction} /> : null}
      </Panel>

      <Panel title="Defect Prediction Register" description="Stored forecasts for individual defects will appear only when a persisted prediction result source exists.">
        {isDemo ? <DemoPredictionRegister /> : capabilities ? <EmptyRegister capability={capabilities.defectPrediction} /> : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="SCADA Anomaly Detection Feed" description="Real mode requires persisted SCADA telemetry/anomaly data. Device inventory is not used as telemetry history.">
          {isDemo ? <DemoScadaAnomalyFeed /> : capabilities ? <BlockedState capability={capabilities.scadaAnomalyDetection} /> : null}
        </Panel>
        <Panel title="SCADA Forecast vs Actual" description="Forecast vs actual requires persisted SCADA telemetry history and backend prediction output.">
          {isDemo ? <DemoScadaForecastActualChart /> : capabilities ? <BlockedState capability={capabilities.scadaAnomalyDetection} /> : null}
        </Panel>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Prediction Model Performance</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real mode shows only existing readiness and availability. Demo mode shows labelled example metrics.
          </p>
        </div>
        {isDemo ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {demoModelPerformance.map((model) => (
              <DemoModelPerformanceCard key={model.title} model={model} />
            ))}
          </div>
        ) : capabilities ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <ModelPerformanceCard
              capability={capabilities.corrosionGrowthForecasting}
              metricLabels={["RMSE", "R2"]}
              title="Corrosion Growth Model"
            />
            <ModelPerformanceCard
              capability={capabilities.cpDriftPrediction}
              metricLabels={["RMSE", "R2"]}
              title="CP Drift Model"
            />
            <ModelPerformanceCard
              capability={capabilities.scadaAnomalyDetection}
              metricLabels={["Precision", "Recall", "F1"]}
              title="SCADA Anomaly Model"
            />
          </div>
        ) : null}
      </section>

    </div>
  );
  const historicalContext = corrosionGrowth?.growth.status === "calculated" ? <><p className="mt-2 break-words text-xs text-slate-500">{selectedPipeline?.pipelineName} · Feature {corrosionGrowth.featureId ?? "N/A"}<br />{corrosionGrowth.growth.earlierInspectionDate} → {corrosionGrowth.growth.laterInspectionDate}</p><CorrosionGrowthForecastChart growth={corrosionGrowth} /></> : <p className="mt-2 text-xs leading-5 text-slate-500">N/A — {corrosionGrowthState === "loading" ? "Loading stored ILI measurements…" : corrosionGrowthState === "error" ? corrosionGrowthError : corrosionGrowth?.growth.reason ?? "Select a pipeline with compatible repeated ILI measurements."}</p>;
  return isDemo ? sourceWorkspace : <AiImg02Overview readiness={readiness} loading={loading} failed={failed} historicalContext={historicalContext} reportPipelineId={selectedPipeline?.id} onSourceUnauthorized={() => { setReadiness(null); setFailed(true); setCorrosionGrowth(null); setCpMonitoring(null); }} sourceControls={<PipelineSelector mode="select-only" selectedPipeline={selectedPipeline} onSelect={setSelectedPipeline} onClear={() => setSelectedPipeline(null)} />}>{sourceWorkspace}</AiImg02Overview>;
}
