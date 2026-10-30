"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { IntegrationDashboard, IntegrationDashboardMetrics } from "@/components/integration-dashboard";
import { IntegrationDataFlowPreview } from "@/components/integration-data-flow-preview";
import { IntegrationDataMappingPreview } from "@/components/integration-data-mapping-preview";
import { IntegrationValidationRulesPreview } from "@/components/integration-validation-rules-preview";
import { IntegrationProcessingLogsPreview } from "@/components/integration-processing-logs-preview";
import { IntegrationDataQualityPreview } from "@/components/integration-data-quality-preview";
import { IntegrationSchedulerPreview } from "@/components/integration-scheduler-preview";
import { IntegrationNotificationsPreview } from "@/components/integration-notifications-preview";
import { IntegrationConfigurationPreview } from "@/components/integration-configuration-preview";
import { IntegrationManualRecords } from "@/components/integration-manual-records";
import { Activity, ArrowRight, CircleCheck, Clock, CopyCheck, Database, GitBranch, Network, Plug, Settings, ShieldCheck, TriangleAlert, X, type LucideIcon } from "lucide-react";

import {
  fetchIntegrationHubRealData,
  fetchIntegrationConnector,
  createIntegrationConnector,
  updateIntegrationConnector,
  testIntegrationConnector,
  type IntegrationConnectorRecord,
  type IntegrationEventRecord,
  type IntegrationHubRealData,
  type IntegrationSummary
} from "@/lib/apiClient";

export type IntegrationHubMode = "real" | "demo";
type LoadState = "idle" | "loading" | "ready" | "error";

const protocolGuides = {
  "OPC-UA": {
    label: "OPC-UA",
    status: "Reference Only",
    standard: "IEC 62541",
    rows: [
      ["Default Port", "4840 (plain) / 4843 (TLS)"],
      ["Security Modes", "None, Sign, SignAndEncrypt"],
      ["Auth Methods", "Anonymous, username/password, X.509 certificate"],
      ["Message Encoding", "Binary (UA Binary) or XML"],
      ["Sampling Rate", "Configurable monitored item interval"],
      ["Klinthru Status", "Not Configured"]
    ],
    note: "OPC-UA connector discovery and subscriptions are not active in the current backend."
  },
  Modbus: {
    label: "Modbus",
    status: "Reference Only",
    standard: "Modbus TCP / RTU",
    rows: [
      ["Default Port", "502 for Modbus TCP"],
      ["Transport", "TCP/IP or serial RTU via gateway"],
      ["Addressing", "Unit ID, register address, register type"],
      ["Data Types", "Coils, discrete inputs, input registers, holding registers"],
      ["Typical Use", "Rectifier, meter, and industrial device polling"],
      ["Klinthru Status", "Not Configured"]
    ],
    note: "No Modbus adapter, polling runtime, or live CP rectifier bus connection is configured."
  },
  MQTT: {
    label: "MQTT",
    status: "Reference Only",
    standard: "MQTT 3.1.1 / 5.0",
    rows: [
      ["Default Port", "1883 (plain) / 8883 (TLS)"],
      ["Model", "Publish / subscribe broker"],
      ["Topics", "Hierarchical topic filters with wildcards"],
      ["QoS", "0, 1, or 2 depending on delivery guarantees"],
      ["Typical Use", "IoT sensor streams and gateway messages"],
      ["Klinthru Status", "Not Configured"]
    ],
    note: "No MQTT broker connection, topic subscription, or telemetry stream is active."
  },
  REST: {
    label: "REST API",
    status: "Supported",
    standard: "HTTPS JSON API",
    rows: [
      ["Connector Type", "REST"],
      ["Auth Handling", "Secret references; sensitive values are redacted"],
      ["Test Support", "Server-side endpoint test"],
      ["Event Storage", "Persisted connector test events"],
      ["Summary Support", "Active connectors, latest success, failures"],
      ["Klinthru Status", "Supported"]
    ],
    note: "REST is the existing supported connector type. It does not imply external systems are already connected."
  },
  SQL: {
    label: "SQL",
    status: "Reference Only",
    standard: "SQL / historian database",
    rows: [
      ["Transport", "Database driver or managed connector"],
      ["Common Targets", "Historian, warehouse, Timescale-style stores"],
      ["Write Pattern", "Batch insert or scheduled sync"],
      ["Read Pattern", "Parameterized queries or views"],
      ["Typical Use", "Time-series and operational history"],
      ["Klinthru Status", "Not Configured"]
    ],
    note: "No SQL connector type, historian writer, or database sync adapter is configured."
  }
} as const;

type Protocol = keyof typeof protocolGuides;

const demoConnectors = [
  {
    name: "Wellhead OPC-UA",
    protocol: "OPC-UA",
    endpoint: "opc.tcp://demo-wellhead.local:4840",
    status: "Connected",
    lastSync: "3s ago",
    tone: "green"
  },
  {
    name: "Compressor OPC-UA",
    protocol: "OPC-UA",
    endpoint: "opc.tcp://demo-compressor.local:4840",
    status: "Connected",
    lastSync: "5s ago",
    tone: "green"
  },
  {
    name: "CP Rectifier Bus",
    protocol: "Modbus TCP",
    endpoint: "tcp://demo-rectifier-bus:502",
    status: "Connected",
    lastSync: "12s ago",
    tone: "green"
  },
  {
    name: "SCADA MQTT",
    protocol: "MQTT",
    endpoint: "mqtts://demo-broker.local/pipeline/#",
    status: "Connected",
    lastSync: "2s ago",
    tone: "green"
  },
  {
    name: "SAP PM",
    protocol: "REST",
    endpoint: "https://demo.sap.local/api/pm",
    status: "Connected",
    lastSync: "1m ago",
    tone: "green"
  },
  {
    name: "GIS REST",
    protocol: "REST",
    endpoint: "https://demo.gis.local/arcgis/rest",
    status: "Connected",
    lastSync: "45s ago",
    tone: "green"
  },
  {
    name: "Historian DB",
    protocol: "SQL",
    endpoint: "sql://demo-historian.local/timeseries",
    status: "Connected",
    lastSync: "8s ago",
    tone: "green"
  }
] as const;

const demoFlowSources = [
  { label: "Modbus", tone: "blue" },
  { label: "SCADA", tone: "green" },
  { label: "MQTT", tone: "violet" }
] as const;

const demoFlowTargets = [
  { label: "Historian", tone: "green" },
  { label: "GIS/EAM", tone: "blue" },
  { label: "Reports", tone: "amber" }
] as const;

const demoConnectorHealth = [
  { name: "Wellhead OPC-UA", value: 80, tone: "amber" },
  { name: "Compressor OPC-UA", value: 60, tone: "green" },
  { name: "CP Rectifier Bus", value: 30, tone: "green" },
  { name: "GIS / Esri API", value: 15, tone: "green" },
  { name: "SAP EAM REST", value: 10, tone: "green" },
  { name: "MQTT IoT Broker", value: 65, tone: "amber" }
] as const;

const demoMappings = [
  { source: "ns=2;s=Pipeline.KP38.Pressure", destination: "scada.pressure_kpa" },
  { source: "ns=2;s=Pipeline.KP38.FlowRate", destination: "scada.flow_m3h" },
  { source: "ns=2;s=Pipeline.KP38.Temperature", destination: "scada.temp_c" },
  { source: "ns=2;s=CP.Rectifier1.Potential", destination: "cp.pipe_potential_mv" },
  { source: "ns=2;s=CP.Rectifier1.Current", destination: "cp.output_current_a" },
  { source: "ns=2;s=ILI.LastScan.MAOP", destination: "ili.maop_psi" }
] as const;

const demoWebhooks = [
  { name: "ILI Alert Push", direction: "OUT", method: "POST", endpoint: "https://teams.demo/webhook", trigger: "severity >= CRITICAL", status: "active" },
  { name: "Work Order Import", direction: "IN", method: "POST", endpoint: "/api/webhooks/sap-demo", trigger: "SAP MO Created", status: "active" },
  { name: "CP Threshold Alert", direction: "OUT", method: "POST", endpoint: "https://pagerduty.demo/events", trigger: "CP < -850 mV", status: "active" },
  { name: "Report Complete", direction: "OUT", method: "POST", endpoint: "https://slack.demo/report", trigger: "Report generated", status: "active" },
  { name: "SCADA Anomaly", direction: "OUT", method: "PUT", endpoint: "https://maximo.demo/anomaly", trigger: "anomaly score > 0.8", status: "paused" },
  { name: "Defect Status", direction: "IN", method: "POST", endpoint: "/api/webhooks/defect-demo", trigger: "Maximo WO closed", status: "active" }
] as const;

const demoThroughputHistory = [
  { time: "60s", value: 309 },
  { time: "55s", value: 294 },
  { time: "50s", value: 273 },
  { time: "45s", value: 312 },
  { time: "40s", value: 288 },
  { time: "35s", value: 327 },
  { time: "30s", value: 352 },
  { time: "25s", value: 341 },
  { time: "20s", value: 348 },
  { time: "15s", value: 336 },
  { time: "10s", value: 351 },
  { time: "5s", value: 344 },
  { time: "now", value: 309 }
] as const;

const demoIntegrationEvents = [
  { time: "02:14:53", source: "Wellhead OPC-UA", message: "Batch of 128 nodes read in 42 ms", outcome: "Success" },
  { time: "02:14:03", source: "GIS / Esri API", message: "Token refresh successful", outcome: "Success" },
  { time: "02:14:00", source: "MQTT IoT Broker", message: "Received 52 messages on topic pipeline/#", outcome: "Success" },
  { time: "02:13:48", source: "Historian DB", message: "Hypertable insert: 340 rows @ 14:32:48", outcome: "Success" },
  { time: "02:13:35", source: "Historian DB", message: "Hypertable insert: 340 rows @ 14:32:35", outcome: "Success" },
  { time: "02:13:26", source: "GIS / Esri API", message: "Token refresh successful", outcome: "Success" },
  { time: "14:32:05", source: "Historian DB", message: "Batch write completed - 2,048 rows committed", outcome: "Success" }
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "No Data";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No Data" : `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function formatConnectivityDuration(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.max(0, Math.min(Math.round(value), 300_000))} ms` : "No Data";
}

function StatusPill({ children, tone = "slate" }: { children: string; tone?: "green" | "amber" | "red" | "slate" | "blue" }) {
  const tones = {
    green: "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
    amber: "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
    red: "border-rose-300/70 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
    slate: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    blue: "border-cyan-300/70 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300"
  };

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111821] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ title, eyebrow, action }: { title: string; eyebrow: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slateblue-600 dark:text-slate-500">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1">{detail}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone,
  isDemo = false,
  onOpen,
  icon: Icon
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: "blue" | "green" | "amber" | "red" | "slate";
  isDemo?: boolean;
  onOpen?: () => void;
  icon?: LucideIcon;
}) {
  const accents = {
    blue: "from-cyan-400 to-slateblue-600",
    green: "from-emerald-400 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    red: "from-rose-400 to-red-600",
    slate: "from-slate-300 to-slate-500"
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111821]">
      <div className={`h-1 bg-gradient-to-r ${accents[tone]}`} />
      <div className="p-4">
        {Icon && <Icon aria-hidden="true" className="mb-2 h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-500">{label}</p>
          {isDemo ? <StatusPill tone="amber">DEMO</StatusPill> : null}
        </div>
        <p className="mt-3 break-words font-mono text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-500">{helper}</p>
      </div>
      {onOpen && <button type="button" onClick={onOpen} className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500" aria-label={`${label} details`} />}
    </article>
  );
}

function makeKpis(summary: IntegrationSummary | null, loadState: LoadState, isDemo: boolean) {
  if (isDemo) {
    return [
      ["Active Connections", "7", "DEMO reference value from provided UI.", "blue"],
      ["Data Points / Sec", "309", "DEMO reference value from provided UI.", "green"],
      ["Avg Uptime", "99.4%", "DEMO reference value from provided UI.", "green"],
      ["Last Sync", "3s ago", "DEMO reference value from provided UI.", "amber"],
      ["Failed Calls (24h)", "3", "DEMO reference value from provided UI.", "red"]
    ] as const;
  }

  if (loadState === "loading") {
    return [
      ["Active Connections", "Loading", "Reading connector summary.", "blue"],
      ["Data Points / Sec", "Loading", "Throughput is checked from backend summary.", "slate"],
      ["Avg Uptime", "Loading", "Uptime is checked from backend summary.", "slate"],
      ["Last Sync", "Loading", "Latest successful connector test.", "green"],
      ["Failed Calls (24h)", "Loading", "Recent persisted integration failures.", "red"]
    ] as const;
  }

  return [
    ["Active Connections", summary?.activeConnectors ?? "Not Available", "Enabled REST connectors with non-disabled status.", "blue"],
    ["Data Points / Sec", summary?.throughput ?? "Not Available", "No real throughput metric is currently provided.", "slate"],
    ["Avg Uptime", summary?.uptime ?? "Not Available", "No real uptime calculation is currently provided.", "slate"],
    ["Last Sync", summary?.latestSuccessfulTestAt ? formatDateTime(summary.latestSuccessfulTestAt) : "Not Available", "Latest successful REST connector test.", "green"],
    ["Failed Calls (24h)", summary?.failuresLast24Hours ?? "Not Available", "Persisted failed integration test events.", "red"]
  ] as const;
}

function connectorTone(connector: IntegrationConnectorRecord): "green" | "amber" | "red" | "slate" {
  if (!connector.enabled || connector.status === "Disabled") return "slate";
  if (connector.status === "Ready") return "green";
  if (connector.status === "Degraded") return "amber";
  return "red";
}

function healthValue(connector: IntegrationConnectorRecord) {
  if (!connector.enabled || connector.status === "Disabled") return 0;
  if (connector.status === "Ready") return 100;
  if (connector.status === "Degraded") return 50;
  return 0;
}

function barToneClass(tone: "green" | "amber" | "red" | "slate" | "blue" | "violet") {
  const tones = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-rose-500",
    slate: "bg-slate-400",
    blue: "bg-blue-500",
    violet: "bg-violet-500"
  };

  return tones[tone];
}

function flowStroke(tone: "green" | "amber" | "red" | "slate" | "blue" | "violet") {
  const tones = {
    green: "#10b981",
    amber: "#f59e0b",
    red: "#ef4444",
    slate: "#64748b",
    blue: "#3b82f6",
    violet: "#7c3aed"
  };

  return tones[tone];
}

function smoothPath(points: Array<[number, number]>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length; index += 1) {
    const [previousX, previousY] = points[index - 1];
    const [currentX, currentY] = points[index];
    const midX = (previousX + currentX) / 2;
    const midY = (previousY + currentY) / 2;
    path += ` Q ${previousX} ${previousY} ${midX} ${midY}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  path += ` T ${lastX} ${lastY}`;
  return path;
}

function DemoThroughputChart() {
  const [activeIndex, setActiveIndex] = useState(demoThroughputHistory.length - 1);
  const width = 760;
  const height = 260;
  const padding = { top: 28, right: 24, bottom: 42, left: 52 };
  const min = 200;
  const max = 500;
  const x = (index: number) => padding.left + (index / (demoThroughputHistory.length - 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + ((max - value) / (max - min)) * (height - padding.top - padding.bottom);
  const chartPoints = demoThroughputHistory.map((point, index) => [x(index), y(point.value)] as [number, number]);
  const linePath = smoothPath(chartPoints);
  const linePoints = chartPoints.map(([pointX, pointY]) => `${pointX},${pointY}`).join(" ");
  const areaPoints = `${padding.left},${height - padding.bottom} ${linePoints} ${x(demoThroughputHistory.length - 1)},${height - padding.bottom}`;
  const active = demoThroughputHistory[activeIndex];
  const activeX = x(activeIndex);
  const activeY = y(active.value);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StatusPill tone="amber">DEMO</StatusPill>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Data points/sec over last 60 seconds</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unit: points/sec. Time axis: seconds before now.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-cyan-500" /> Throughput</span>
          <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-cyan-500/20" /> Area</span>
        </div>
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-x-auto">
        <svg className="h-full min-h-[210px] min-w-[640px] w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="DEMO throughput history line chart">
          {[200, 300, 400, 500].map((tick) => (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[11px] dark:fill-slate-400">{tick}</text>
            </g>
          ))}
          <polygon points={areaPoints} className="fill-cyan-500/15" />
          <path d={linePath} fill="none" className="stroke-cyan-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {demoThroughputHistory.map((point, index) => (
            <g key={point.time} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} tabIndex={0}>
              <circle cx={x(index)} cy={y(point.value)} r={index === activeIndex ? 6 : 4} className="fill-cyan-500 stroke-white dark:stroke-slate-950" strokeWidth="3" />
              {(index === 0 || index === 3 || index === 6 || index === 9 || index === 12) ? (
                <text x={x(index)} y={height - 15} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{point.time}</text>
              ) : null}
            </g>
          ))}
          <line x1={activeX} x2={activeX} y1={padding.top} y2={height - padding.bottom} className="stroke-amber-500/60" strokeDasharray="4 6" />
          <g transform={`translate(${Math.min(activeX + 12, width - 156)} ${Math.max(activeY - 48, 10)})`}>
            <rect width="144" height="42" rx="8" className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700" />
            <text x="10" y="17" className="fill-slate-900 text-[11px] font-semibold dark:fill-slate-100">{active.time}</text>
            <text x="10" y="32" className="fill-slate-500 text-[11px] dark:fill-slate-400">{active.value} points/sec</text>
          </g>
          <text x="16" y="24" className="fill-slate-500 text-[11px] dark:fill-slate-400">points/sec</text>
          <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">time</text>
        </svg>
      </div>
    </div>
  );
}

export function IntegrationHubWorkspace({ mode }: { mode: IntegrationHubMode }) {
  const [protocol, setProtocol] = useState<Protocol>("REST");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realData, setRealData] = useState<IntegrationHubRealData | null>(null);
  const isDemo = mode === "demo";
  const activeProtocol = protocolGuides[protocol];
  const isRealLoading = !isDemo && loadState === "loading";

  useEffect(() => {
    if (!realData || isDemo) return;
    const id = new URLSearchParams(window.location.search).get("connectorId");
    if (id) document.getElementById(`connector-${id}`)?.scrollIntoView({ block: "center" });
  }, [realData, isDemo]);

  useEffect(() => {
    if (isDemo) {
      setLoadState("idle");
      setErrorMessage(null);
      setRealData(null);
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    setErrorMessage(null);
    setRealData(null);

    fetchIntegrationHubRealData()
      .then((data) => {
        if (cancelled) return;
        setRealData(data);
        setLoadState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Integration Hub data is unavailable.");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const connectors = realData?.connectors ?? [];
  const events = realData?.events ?? [];
  const kpis = useMemo(() => makeKpis(realData?.summary ?? null, loadState, isDemo), [isDemo, loadState, realData?.summary]);

  if (!isDemo) return <IntegrationDataSources data={realData} loadState={loadState} error={errorMessage} onData={data => { setRealData(data); setLoadState("ready"); setErrorMessage(null); }} />;

  return (
    <section aria-label="M10 Integration Hub workspace" className="min-w-0 space-y-5 pb-8">
      {!isDemo && loadState === "error" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Integration data is not available.</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([label, value, helper, tone]) => (
          <KpiCard key={label} label={label} value={value} helper={helper} tone={tone} isDemo={isDemo} />
        ))}
      </div>

      <Card>
        <SectionHeader
          eyebrow="Connector Inventory"
          title="Registered Connectors"
          action={<StatusPill tone={isDemo ? "amber" : "blue"}>{isDemo ? "DEMO PREVIEW" : `${connectors.length} REST`}</StatusPill>}
        />
        <div className="px-5 pb-5 pt-5">
          {isDemo ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {demoConnectors.slice(0, 6).map((connector) => (
                <article key={connector.name} className="rounded-lg border border-cyan-500/60 bg-slate-50 p-4 shadow-sm dark:border-cyan-400/70 dark:bg-[#172233]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{connector.name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{connector.protocol}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill tone="amber">DEMO</StatusPill>
                      <StatusPill tone={connector.tone}>{connector.status}</StatusPill>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-[0.14em] text-slate-400">Endpoint</p>
                      <p className="mt-1 break-all font-mono text-slate-700 dark:text-slate-200">{connector.endpoint}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/70 pt-3 dark:border-amber-500/20">
                      <span className="text-slate-500 dark:text-slate-400">Last sync</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{connector.lastSync}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : isRealLoading ? (
            <EmptyState title="Loading connectors" detail="Reading real REST connector records from the Integration Hub API." />
          ) : connectors.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {connectors.slice(0, 6).map((connector) => (
                <article id={`connector-${connector.id}`} key={connector.id} tabIndex={-1} className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-[#172233]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{connector.name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{connector.connectorType}</p>
                    </div>
                    <StatusPill tone={connectorTone(connector)}>{connector.enabled ? connector.status : "Disabled"}</StatusPill>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-[0.14em] text-slate-400">Endpoint</p>
                      <p className="mt-1 break-all font-mono text-slate-700 dark:text-slate-200">{connector.endpoint}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Last sync</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{formatDateTime(connector.lastSuccessfulTestAt ?? connector.lastTestedAt)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Secret</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{connector.secretConfigured ? "Configured" : "Not configured"}</span>
                    </div>
                    {connector.lastFailureMessage ? <p className="text-rose-600 dark:text-rose-300">Failure: {connector.lastFailureMessage}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No registered connectors" detail="No REST connector records were returned by the existing Integration Hub API." />
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Controlled Path" title="Live Data Flow" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : null} />
          {isDemo ? (
            <div className="mx-5 mb-5 mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <div className="relative overflow-x-auto px-3 py-4">
                <svg className="min-w-[680px]" viewBox="0 0 720 300" role="img" aria-label="DEMO animated integration data flow">
                  <defs>
                    <filter id="integration-flow-glow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {demoFlowSources.map((node, index) => {
                    const y = 72 + index * 78;
                    const color = flowStroke(node.tone);
                    const pathId = `demo-source-path-${index}`;
                    const path = `M 118 ${y} C 205 ${y}, 235 150, 318 150`;
                    return (
                      <g key={node.label}>
                        <path id={pathId} d={path} fill="none" stroke={color} strokeOpacity="0.38" strokeWidth="3" />
                        <circle r="5" fill={color} filter="url(#integration-flow-glow)">
                          <animateMotion dur="2.8s" begin={`${index * 0.28}s`} repeatCount="indefinite">
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </circle>
                        <circle cx="70" cy={y} r="24" fill="rgba(15,23,42,0.05)" stroke={color} strokeWidth="3" />
                        <text x="70" y={y + 42} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-300">{node.label}</text>
                        <text x="70" y={y + 57} textAnchor="middle" className="fill-amber-600 text-[10px] font-semibold dark:fill-amber-300">DEMO</text>
                      </g>
                    );
                  })}
                  {demoFlowTargets.map((node, index) => {
                    const y = 72 + index * 78;
                    const color = flowStroke(node.tone);
                    const pathId = `demo-target-path-${index}`;
                    const path = `M 402 150 C 485 150, 515 ${y}, 602 ${y}`;
                    return (
                      <g key={node.label}>
                        <path id={pathId} d={path} fill="none" stroke={color} strokeOpacity="0.38" strokeWidth="3" />
                        <circle r="5" fill={color} filter="url(#integration-flow-glow)">
                          <animateMotion dur="2.8s" begin={`${0.4 + index * 0.28}s`} repeatCount="indefinite">
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </circle>
                        <circle cx="650" cy={y} r="24" fill="rgba(15,23,42,0.05)" stroke={color} strokeWidth="3" />
                        <text x="650" y={y + 42} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-300">{node.label}</text>
                        <text x="650" y={y + 57} textAnchor="middle" className="fill-amber-600 text-[10px] font-semibold dark:fill-amber-300">DEMO</text>
                      </g>
                    );
                  })}
                  <circle cx="360" cy="150" r="34" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="4" filter="url(#integration-flow-glow)" />
                  <text x="360" y="146" textAnchor="middle" className="fill-cyan-700 text-[13px] font-bold dark:fill-cyan-300">Klinthru</text>
                  <text x="360" y="162" textAnchor="middle" className="fill-cyan-700 text-[13px] font-bold dark:fill-cyan-300">Hub</text>
                </svg>
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">DEMO PREVIEW - animated reference flow, not live telemetry</p>
              </div>
            </div>
          ) : connectors.length ? (
            <div className="mx-5 mb-5 mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <div className="overflow-x-auto px-3 py-4">
                <svg className="min-w-[680px]" viewBox="0 0 720 300" role="img" aria-label="Configured integration connector flow">
                  {connectors.slice(0, 6).map((connector, index, visibleConnectors) => {
                    const y = visibleConnectors.length === 1 ? 150 : 58 + index * (184 / Math.max(visibleConnectors.length - 1, 1));
                    const tone = connectorTone(connector);
                    const color = flowStroke(tone);
                    const path = `M 132 ${y} C 215 ${y}, 235 150, 318 150`;
                    return (
                      <g key={connector.id}>
                        <path d={path} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="3" />
                        <circle cx="76" cy={y} r="22" fill="rgba(15,23,42,0.05)" stroke={color} strokeWidth="3" />
                        <text x="76" y={y + 39} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold dark:fill-slate-300">{connector.name}</text>
                        <text x="76" y={y + 53} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold dark:fill-slate-500">{connector.connectorType}</text>
                      </g>
                    );
                  })}
                  <path d="M 402 150 C 492 150, 520 150, 602 150" fill="none" stroke={flowStroke("slate")} strokeOpacity="0.3" strokeWidth="3" />
                  <circle cx="650" cy="150" r="24" fill="rgba(15,23,42,0.05)" stroke={flowStroke("slate")} strokeWidth="3" />
                  <text x="650" y="192" textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-300">Klinthru records</text>
                  <text x="650" y="207" textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold dark:fill-slate-500">No live metric</text>
                  <circle cx="360" cy="150" r="34" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="4" />
                  <text x="360" y="146" textAnchor="middle" className="fill-cyan-700 text-[13px] font-bold dark:fill-cyan-300">Klinthru</text>
                  <text x="360" y="162" textAnchor="middle" className="fill-cyan-700 text-[13px] font-bold dark:fill-cyan-300">Hub</text>
                </svg>
                <p className="px-2 pb-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Configured connectors are shown from real records only. No animated activity is shown because live flow telemetry is Not Available.</p>
              </div>
            </div>
          ) : isRealLoading ? (
            <div className="px-5 pb-5 pt-5">
              <EmptyState title="Loading flow" detail="Reading real connector records before drawing the configured REST flow." />
            </div>
          ) : (
            <div className="px-5 pb-5 pt-5">
              <EmptyState title="No configured flow" detail="No REST connector records are available to draw a real data flow. Live flow and throughput metrics are Not Available." />
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader eyebrow="Operational Snapshot" title="Connector Health" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : null} />
          <div className="space-y-3 px-5 pb-5 pt-5">
            {isDemo ? (
              demoConnectorHealth.slice(0, 6).map((connector) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950" key={connector.name}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{connector.name}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">DEMO status</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{connector.value}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${barToneClass(connector.tone)}`} style={{ width: `${connector.value}%` }} />
                  </div>
                </div>
              ))
            ) : isRealLoading ? (
              <EmptyState title="Loading connector health" detail="Reading real connector status from the Integration Hub API." />
            ) : connectors.length ? (
              connectors.slice(0, 6).map((connector) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950" key={connector.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{connector.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last success: {formatDateTime(connector.lastSuccessfulTestAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill tone={connectorTone(connector)}>{connector.enabled ? connector.status : "Disabled"}</StatusPill>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{connector.status === "Ready" ? "Available" : "Status only"}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label={`${connector.name} status indicator`}>
                    <div className={`h-full rounded-full ${barToneClass(connectorTone(connector))}`} style={{ width: `${healthValue(connector)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Capacity, uptime, and throughput health metrics: Not Available.</p>
                </div>
              ))
            ) : (
              <EmptyState title="No connector health available" detail="Connector health requires at least one persisted REST connector." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Schema Controls" title="Data Source Mapping" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : null} />
          <div className="px-5 pb-5 pt-5">
            {isDemo ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-100 text-xs uppercase tracking-[0.14em] text-slate-500 dark:bg-[#172233] dark:text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Source Field</th>
                      <th className="px-4 py-3 text-left font-semibold">Klinthru Destination</th>
                      <th className="px-4 py-3 text-left font-semibold">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {demoMappings.map((mapping) => (
                      <tr key={mapping.source}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{mapping.source}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{mapping.destination}</td>
                        <td className="px-4 py-3"><StatusPill tone="amber">DEMO</StatusPill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Mappings not configured"
                detail="The existing Integration Hub backend does not expose mapping records. No Sensors, SCADA, CP, or ILI data is duplicated here."
              />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Delivery Endpoints" title="Webhooks" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : <StatusPill>Not Available</StatusPill>} />
          <div className="px-5 pb-5 pt-5">
            {isDemo ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="min-w-[760px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-100 text-xs uppercase tracking-[0.14em] text-slate-500 dark:bg-[#172233] dark:text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Direction</th>
                      <th className="px-4 py-3 text-left font-semibold">Method</th>
                      <th className="px-4 py-3 text-left font-semibold">Endpoint</th>
                      <th className="px-4 py-3 text-left font-semibold">Trigger</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {demoWebhooks.map((webhook) => (
                      <tr key={webhook.name}>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{webhook.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{webhook.direction}</td>
                        <td className="px-4 py-3"><span className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{webhook.method}</span></td>
                        <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{webhook.endpoint}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{webhook.trigger}</td>
                        <td className="px-4 py-3"><StatusPill tone={webhook.status === "active" ? "green" : "slate"}>{webhook.status}</StatusPill></td>
                        <td className="px-4 py-3"><StatusPill tone="amber">DEMO</StatusPill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Webhook registry not configured"
                detail="No webhook model or API is currently available for inbound/outbound endpoint registration."
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        <Card className="flex flex-col xl:h-[390px]">
          <SectionHeader eyebrow="Telemetry" title="Throughput History" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : <StatusPill>Not Available</StatusPill>} />
          <div className="min-h-0 flex-1 px-5 pb-5 pt-5">
            {isDemo ? (
              <DemoThroughputChart />
            ) : (
              <EmptyState
                title="Throughput history not available"
                detail="The current backend has no throughput history endpoint and the summary API returns throughput as unavailable. No connector, device, SCADA, or sensor data is used to fabricate this chart."
              />
            )}
          </div>
        </Card>

        <Card className="flex flex-col xl:h-[390px]">
          <SectionHeader eyebrow="Auditable Operations" title="Event Log" action={isDemo ? <StatusPill tone="amber">DEMO PREVIEW</StatusPill> : <StatusPill tone="blue">{`${events.length} events`}</StatusPill>} />
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5 pt-5">
            {isDemo ? (
              demoIntegrationEvents.map((event) => (
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950" key={`${event.time}-${event.source}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{event.time}</span>
                        <StatusPill tone="amber">DEMO</StatusPill>
                      </div>
                      <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{event.source}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{event.message}</p>
                    </div>
                    <StatusPill tone="green">{event.outcome}</StatusPill>
                  </div>
                </article>
              ))
            ) : isRealLoading ? (
              <EmptyState title="Loading integration events" detail="Reading persisted integration events from the existing events API." />
            ) : events.length ? (
              events.slice(0, 6).map((event: IntegrationEventRecord) => (
                <article className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950" key={event.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{event.operation}</p>
                    <StatusPill tone={event.outcome === "Success" ? "green" : "red"}>{event.outcome}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(event.createdAt)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {event.errorMessage || event.errorCode || `Duration: ${formatConnectivityDuration(event.durationMs)}`}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState title="No integration events" detail="No persisted connector test or metadata preview events were returned." />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Protocol Guide" title="Protocol Reference" />
        <div className="flex flex-wrap gap-4 border-b border-slate-200 px-5 dark:border-slate-800" role="tablist" aria-label="Integration protocols">
          {(Object.keys(protocolGuides) as Protocol[]).map((item) => (
            <button
              aria-selected={protocol === item}
              className={`border-b-2 px-1 py-3 text-sm font-semibold transition ${protocol === item ? "border-cyan-500 text-cyan-700 dark:text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"}`}
              key={item}
              onClick={() => setProtocol(item)}
              role="tab"
              type="button"
            >
              {protocolGuides[item].label}
            </button>
          ))}
        </div>
        <div className="m-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950" role="tabpanel">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{activeProtocol.label}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{activeProtocol.standard}</p>
            </div>
            <StatusPill tone={activeProtocol.status === "Supported" ? "green" : "slate"}>{activeProtocol.status}</StatusPill>
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111821]">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeProtocol.rows.map(([label, value]) => (
                  <tr key={label}>
                    <th className="w-48 px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">{label}</th>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-100">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-[#111821] dark:text-slate-400">
            {activeProtocol.note}
          </p>
        </div>
      </Card>
    </section>
  );
}

const metadataFields = [
  { key: "sourceSystem", label: "Source System" },
  { key: "description", label: "Description" },
  { key: "sourceType", label: "Source Type", options: ["SCADA", "Historian", "PLC-RTU", "IoT Platform", "CP System", "Laboratory-LIMS", "ILI Vendor", "GIS", "SAP-ERP", "CMMS-Maximo", "External DMS", "Regulatory", "File-SFTP", "Database", "Other"] },
  { key: "direction", label: "Integration Direction", options: ["Inbound", "Outbound", "Bidirectional"] },
  { key: "protocol", label: "Protocol", options: ["REST"] },
  { key: "environment", label: "Environment", options: ["Development", "Test-UAT", "Production", "DR"] },
  { key: "dataDomains", label: "Data Domain", list: true },
  { key: "targetModules", label: "Target Module", list: true },
  { key: "syncMode", label: "Sync Mode", options: ["Streaming", "Near Real-Time", "Polling", "Scheduled Batch", "Event Driven", "Manual", "On Demand"] },
  { key: "owner", label: "Owner" },
  { key: "criticality", label: "Criticality" }
] as const;
type MetadataDraft = Record<string, string | string[] | null>;
function sourceMetadata(c: IntegrationConnectorRecord): MetadataDraft {
  const config = c.configuration as Record<string, unknown> | null;
  const raw = config && typeof config === "object" && !Array.isArray(config) ? config.integrationMetadata : null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const metadata = raw as Record<string, unknown>, values: MetadataDraft = {};
  for (const field of metadataFields) {
    const value = metadata[field.key];
    if ("list" in field) {
      if (Array.isArray(value) && value.length <= 30 && value.every(v => typeof v === "string" && v.trim().length > 0 && v.length <= 120) && new Set(value).size === value.length) values[field.key] = value;
    } else if (typeof value === "string" && value.trim() && value.length <= (field.key === "description" ? 1000 : 200) && (!("options" in field) || (field.options as readonly string[]).includes(value))) values[field.key] = value;
  }
  if (Number.isSafeInteger(metadata.configurationVersion) && (metadata.configurationVersion as number) > 0) values.configurationVersion = String(metadata.configurationVersion);
  return values;
}
function metadataValue(values: MetadataDraft, key: string): string { const v = values[key]; return Array.isArray(v) ? v.length ? v.join(", ") : "No Data" : v || "No Data"; }
function ConnectorMetadataInputs({ values, onChange, control, registries }: { values: MetadataDraft; onChange: (key: string, value: string | string[] | null) => void; control: string; registries: Record<string, string[]> }) {
  const [listDraft, setListDraft] = useState<Record<string, string>>({});
  const [listErrors, setListErrors] = useState<Record<string, string>>({});
  const registryId = useId();
  return <fieldset className="grid gap-4 sm:grid-cols-2">
    <legend className="mb-1 text-sm font-semibold">Connector metadata</legend>
    <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">Optional details are saved with this connector and can be edited later.</p>
    {metadataFields.map(field => {
      const current = Array.isArray(values[field.key]) ? values[field.key] as string[] : [];
      const choices = [...new Set([...(registries[field.key] ?? []), ...current])].sort();
      if ("list" in field) return <div key={field.key} className="text-sm">
        <label>{field.label}<select multiple aria-label={field.label} aria-invalid={Boolean(listErrors[field.key])} aria-describedby={listErrors[field.key] ? `${registryId}-${field.key}-error` : undefined} className={`${control} mt-1 w-full`} value={current} onChange={e => { const next = Array.from(e.target.selectedOptions, option => option.value); if (next.length > 30) { Array.from(e.target.options).forEach(option => { option.selected = current.includes(option.value); }); setListErrors(previous => ({ ...previous, [field.key]: "Select up to 30 values." })); return; } setListErrors(previous => ({ ...previous, [field.key]: "" })); onChange(field.key, next); }}>{!choices.length && <option disabled>No Data</option>}{choices.map(value => <option key={value} value={value} disabled={current.length >= 30 && !current.includes(value)}>{value}</option>)}</select></label>
        <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{current.length}/30</span><button type="button" aria-label={`Clear all ${field.label}`} title={`Clear all ${field.label}`} className={control} disabled={!current.length} onClick={() => { onChange(field.key, []); setListDraft(previous => ({ ...previous, [field.key]: "" })); setListErrors(previous => ({ ...previous, [field.key]: "" })); }}><X size={16} aria-hidden="true" /></button></div>
        {listErrors[field.key] && <p id={`${registryId}-${field.key}-error`} role="alert" className="mt-2 text-xs text-rose-600">{listErrors[field.key]}</p>}
        <div className="mt-2 flex gap-2"><input aria-label={`New ${field.label}`} maxLength={120} className={`${control} min-w-0 flex-1`} value={listDraft[field.key] ?? ""} onChange={e => setListDraft({ ...listDraft, [field.key]: e.target.value })} /><button type="button" className={control} disabled={!listDraft[field.key]?.trim() || current.length >= 30} onClick={() => { const value = listDraft[field.key].trim(); if (!current.includes(value)) onChange(field.key, [...current, value]); setListDraft({ ...listDraft, [field.key]: "" }); setListErrors(previous => ({ ...previous, [field.key]: "" })); }}>Add</button></div>
      </div>;
      const listId = `${registryId}-${field.key}`;
      return <label key={field.key} className={`block text-sm ${field.key === "description" ? "sm:col-span-2" : ""}`}>{field.label}{"options" in field ?
        <select aria-label={field.label} className={`${control} mt-1 w-full`} value={typeof values[field.key] === "string" ? values[field.key] as string : ""} onChange={e => onChange(field.key, e.target.value || null)}><option value="">No Data</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> :
        field.key === "description" ? <textarea aria-label={field.label} rows={3} maxLength={1000} className={`${control} mt-1 w-full resize-y`} value={typeof values[field.key] === "string" ? values[field.key] as string : ""} onChange={e => onChange(field.key, e.target.value.trim() ? e.target.value : null)} /> :
        <><input aria-label={field.label} list={listId} maxLength={200} className={`${control} mt-1 w-full`} value={typeof values[field.key] === "string" ? values[field.key] as string : ""} onChange={e => onChange(field.key, e.target.value.trim() ? e.target.value : null)} /><datalist id={listId}>{(registries[field.key] ?? []).map(value => <option key={value} value={value} />)}</datalist></>}
      </label>;
    })}
  </fieldset>;
}

function IntegrationDataFlow({ data, initialConnectorId, onNavigate }: {
  data: IntegrationHubRealData | null;
  initialConnectorId: string | null;
  onNavigate: (tab: "Data Mapping" | "Processing Logs", connectorId: string) => void;
}) {
  const connectors = data?.connectors ?? [];
  const [sourceId, setSourceId] = useState(initialConnectorId && connectors.some(c => c.id === initialConnectorId) ? initialConnectorId : "");
  const sourceFilterChanged = useRef(false);
  useEffect(() => {
    if (!sourceFilterChanged.current && initialConnectorId && data?.connectors.some(c => c.id === initialConnectorId)) setSourceId(initialConnectorId);
  }, [initialConnectorId, data]);
  const [target, setTarget] = useState(""), [mode, setMode] = useState(""), [environment, setEnvironment] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const stages = [
    { name: "Ingestion", description: "Collect & Normalize", labels: ["Records (24h)", "Active Sources"], icon: Database },
    { name: "Validation", description: "Quality & Business Rules", labels: ["Valid Records", "Invalid Records"], icon: ShieldCheck },
    { name: "Mapping", description: "Standardize & Enrich", labels: ["Mapped Records", "Mapping Errors"], icon: Network },
    { name: "Transformation", description: "Clean & Transform", labels: ["Transformed Records", "Transform Warnings"], icon: Settings },
    { name: "Deduplication", description: "Deduplication", labels: ["No Data"], icon: CopyCheck },
    { name: "Routing", description: "Distribute to Modules", labels: ["Routed Records", "Routing Failures"], icon: GitBranch }
  ];
  const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
  const choices = (key: string) => [...new Set(connectors.flatMap(c => { const value = sourceMetadata(c)[key]; return Array.isArray(value) ? value : typeof value === "string" ? [value] : []; }))].sort();
  const filtered = connectors.filter(c => {
    const metadata = sourceMetadata(c), targets = metadata.targetModules;
    return (!sourceId || c.id === sourceId) && (!target || Array.isArray(targets) && targets.includes(target)) && (!mode || metadata.syncMode === mode) && (!environment || metadata.environment === environment);
  });
  const visibleFiltered = filtered.slice(0, 6);
  const targets = [...new Set(filtered.flatMap(c => { const value = sourceMetadata(c).targetModules; return Array.isArray(value) ? value : []; }))].filter(value => !target || value === target).sort().slice(0, 6);
  const detail = connectors.find(c => c.id === detailId);
  useEffect(() => {
    if (!detailId || !panel.current) return;
    const previous = document.activeElement as HTMLElement | null, current = panel.current;
    const controls = () => Array.from(current.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailId(null);
      if (event.key !== "Tab") return;
      const buttons = controls(), first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    current.addEventListener("keydown", keyboard);
    return () => { current.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [detailId]);
  return <section aria-label="Data Flow workspace" className="min-w-0 space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Data Flow filters">
      <label className="min-w-0 text-sm">Source<select aria-label="Flow source" className={`${control} mt-1 w-full`} value={sourceId} onChange={e => { sourceFilterChanged.current = true; setSourceId(e.target.value); }}><option value="">All Sources</option>{connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="min-w-0 text-sm">Target Module<select aria-label="Flow target module" title="Configured target modules" className={`${control} mt-1 w-full`} value={target} onChange={e => setTarget(e.target.value)}><option value="">All Targets</option>{choices("targetModules").map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="min-w-0 text-sm">Flow Type<select aria-label="Flow type" title="Configured sync mode" className={`${control} mt-1 w-full`} value={mode} onChange={e => setMode(e.target.value)}><option value="">All Flow Types</option>{choices("syncMode").map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="min-w-0 text-sm">Status<select aria-label="Flow status" title="Flow status: Unavailable" disabled className={`${control} mt-1 w-full`}><option>Unavailable</option></select></label>
      <label className="min-w-0 text-sm">Environment<select aria-label="Flow environment" className={`${control} mt-1 w-full`} value={environment} onChange={e => setEnvironment(e.target.value)}><option value="">All Environments</option>{choices("environment").map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="min-w-0 text-sm">Time Range<select aria-label="Flow time range" title="Transport time-series records: Unavailable" disabled className={`${control} mt-1 w-full`}><option>Unavailable</option></select></label>
    </div>
    <button type="button" className={control} onClick={() => { sourceFilterChanged.current = true; setSourceId(""); setTarget(""); setMode(""); setEnvironment(""); }}>Reset Filters</button>
    <SectionHeader title="End-to-End Data Flow" eyebrow="Data Flow" action={<StatusPill tone="slate">Unavailable</StatusPill>} />
    <div aria-label="Data Flow legend" className="flex flex-wrap gap-4 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1"><ArrowRight size={16} aria-hidden="true" className="text-blue-500" />Real-time Stream</span>
      <span className="inline-flex items-center gap-1"><ArrowRight size={16} aria-hidden="true" className="border-b border-dashed border-green-600 text-green-600" />Batch Transfer</span>
      <span className="inline-flex items-center gap-1"><Database size={16} aria-hidden="true" />Message Queue</span>
      <span className="inline-flex items-center gap-1"><Settings size={16} aria-hidden="true" />Processing</span>
      <span className="inline-flex items-center gap-1"><ArrowRight size={16} aria-hidden="true" />Data Flow</span>
      <span className="inline-flex items-center gap-1"><CircleCheck size={16} aria-hidden="true" />Target Delivery</span>
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,4fr)_minmax(0,1fr)]">
      <section aria-label="External Systems" className="max-h-[28rem] min-w-0 space-y-3 overflow-y-auto pr-2"><h3 className="text-sm font-semibold">External Systems</h3><StatusPill tone="slate">Configured</StatusPill>{visibleFiltered.map(c => <button key={c.id} type="button" aria-label={`Flow details for ${c.name}`} onClick={() => setDetailId(c.id)} className={`${control} flex w-full min-w-0 items-start gap-2 text-left`}><Plug size={16} aria-hidden="true" className="shrink-0" /><span className="min-w-0 break-words">{c.name}<span className="block text-xs text-slate-500">{metadataValue(sourceMetadata(c), "sourceSystem")}</span></span></button>)}{!visibleFiltered.length && <p className="text-sm">No Data</p>}</section>
      <section aria-label="Integration Hub processing stages" className="min-w-0 space-y-4"><h3 className="text-center text-sm font-semibold">Integration Hub</h3><div className="overflow-x-auto" tabIndex={0} aria-label="Processing stage diagram"><div className="flex min-w-[960px] items-stretch gap-2" aria-label="Flow stage sequence">{stages.map((stage, index) => <div key={stage.name} className="flex min-w-0 flex-1 items-center gap-2"><div aria-label={`${stage.name} stage`} className="flex h-full min-w-0 flex-1 flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><span className="text-xs text-slate-500">{index + 1}</span><stage.icon size={24} aria-hidden="true" className="text-cyan-700" /><h4 className="break-words text-sm font-semibold">{stage.name}</h4><p className="text-xs text-slate-500">{stage.description}</p><dl className="mt-auto space-y-2 text-xs">{stage.labels.map(label => <div key={label}>{label !== "No Data" && <dt>{label}</dt>}<dd className="font-mono">No Data</dd></div>)}</dl><StatusPill tone="slate">Unavailable</StatusPill></div>{index < stages.length - 1 && <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-slate-400" />}</div>)}</div></div><div className="grid gap-4 sm:grid-cols-2">{["Real-time Stream", "Batch Transfer"].map(label => <dl key={label} className="space-y-2 border-y border-slate-200 py-3 text-sm dark:border-slate-800"><dt className="font-semibold">{label}</dt><dd>No Data</dd><dt>{label === "Real-time Stream" ? "msg/min" : "records/day"}</dt><dd>No Data</dd></dl>)}</div><div className="border-y border-slate-200 py-4 dark:border-slate-800"><h4 className="flex items-center gap-2 text-sm font-semibold"><Database size={18} aria-hidden="true" />Message Queue &amp; Workflow Orchestration</h4><p className="mt-2 text-sm">Unavailable</p><p className="mt-3 text-xs text-slate-500">Monitoring | Error Handling | Retry Logic | Audit Trail</p></div></section>
      <section aria-label="KLINTHRU Modules" className="min-w-0 space-y-3"><h3 className="text-sm font-semibold">KLINTHRU Modules</h3><StatusPill tone="slate">Configured</StatusPill>{targets.map(value => <dl key={value} className="border-b border-slate-200 pb-3 text-sm dark:border-slate-800"><dt className="break-words font-semibold">{value}</dt><dd>No Data</dd><dt className="text-xs text-slate-500">records (24h)</dt><dd className="text-xs">Unavailable</dd></dl>)}{!targets.length && <p className="text-sm">No Data</p>}</section>
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <section aria-label="Throughput" className="min-w-0"><SectionHeader title="Throughput (Last 24 Hours)" eyebrow="Records" /><div className="my-3 flex flex-wrap gap-4 text-xs">{[["Incoming", "bg-blue-500"], ["Processed", "bg-green-500"], ["Failed", "bg-red-500"]].map(([label, color]) => <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 ${color}`} />{label}</span>)}</div><div className="overflow-x-auto"><svg role="img" aria-label="Throughput chart: No Data" viewBox="0 0 560 220" className="w-full min-w-[380px] text-slate-400"><text x="12" y="105" transform="rotate(-90 12 105)" fill="currentColor" fontSize="11">Records</text>{["200K", "150K", "100K", "50K", "0"].map((label, i) => <g key={label}><text x="24" y={26 + i * 38} fill="currentColor" fontSize="11">{label}</text><line x1="65" x2="545" y1={22 + i * 38} y2={22 + i * 38} stroke="currentColor" opacity="0.25" /></g>)}{["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((label, i) => <text key={label} x={65 + i * 89} y="202" fill="currentColor" fontSize="11">{label}</text>)}<text x="265" y="105" fill="currentColor" fontSize="16">No Data</text></svg></div></section>
      <section aria-label="Queue Health" className="min-w-0"><SectionHeader title="Queue Health" eyebrow="Message Queue" /><table className="w-full text-left text-sm"><thead><tr><th className="py-3">Queue</th><th>messages</th><th>Status</th></tr></thead><tbody>{stages.filter(s => s.name !== "Deduplication").map(stage => <tr key={stage.name} className="border-b border-slate-200 dark:border-slate-800"><th className="py-3 font-normal">{stage.name} Queue</th><td>No Data</td><td>Unavailable</td></tr>)}</tbody></table></section>
      <section aria-label="Source to Target Flow Map" className="min-w-0"><SectionHeader title="Source to Target Flow Map" eyebrow="Configured" /><div className="max-h-96 space-y-3 overflow-y-auto py-4 pr-2">{visibleFiltered.map(c => <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-start gap-3 border-b border-slate-200 pb-3 text-sm dark:border-slate-800"><button type="button" className="min-w-0 break-words text-left text-cyan-700" aria-label={`Configured targets for ${c.name}`} onClick={() => setDetailId(c.id)}>{c.name}</button><ArrowRight size={16} aria-hidden="true" className="text-slate-400" /><span className="min-w-0 break-words">{metadataValue(sourceMetadata(c), "targetModules")}</span></div>)}{!visibleFiltered.length && <p>No Data</p>}</div><p className="text-sm">Target Delivery: Unavailable</p></section>
      <section aria-label="Recent Data Movement" className="min-w-0"><SectionHeader title="Recent Data Movement" eyebrow="Target Delivery" action={<button type="button" className={control} disabled title="Transport movement records: Unavailable">View All</button>} /><div className="overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead><tr>{["Time", "Source", "Target Module", "Records", "Status"].map(label => <th key={label} className="py-3 pr-3">{label}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="py-5">No Data</td></tr></tbody></table></div></section>
    </div>
    {detail && <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30" onClick={e => { if (e.target === e.currentTarget) setDetailId(null); }}><aside ref={panel} role="dialog" aria-modal="true" aria-label="Data Flow details" className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111821]"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{detail.name}</h3><button type="button" className={control} onClick={() => setDetailId(null)}>Close</button></div><dl className="my-5 space-y-3 text-sm">{[["Connector", detail.id], ["Source System", metadataValue(sourceMetadata(detail), "sourceSystem")], ["Configured Sync Mode", metadataValue(sourceMetadata(detail), "syncMode")], ["Configured Target Modules", metadataValue(sourceMetadata(detail), "targetModules")], ["Mode", "No Data"], ["Incoming (msg/min)", "No Data"], ["P95 Latency (sec)", "No Data"], ["Queue", "Unavailable"], ["Last Success", "No Data"], ["Validation Pass", "No Data"], ["Mapping Pass", "No Data"], ["Routing Success", "No Data"]].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-200 pb-2 dark:border-slate-800"><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><div className="flex flex-wrap gap-3"><button type="button" className={control} onClick={() => onNavigate("Data Mapping", detail.id)}>View Mapping</button><button type="button" className={control} onClick={() => onNavigate("Processing Logs", detail.id)}>View Processing Logs</button></div></aside></div>}
  </section>;
}

function IntegrationDataMapping({ data, initialConnectorId, canEdit }: {
  data: IntegrationHubRealData | null; initialConnectorId: string | null; canEdit: boolean;
}) {
  const [sourceId, setSourceId] = useState("");
  const [target, setTarget] = useState("");
  const [search, setSearch] = useState("");
  const sourceChanged = useRef(false);
  const connectors = data?.connectors ?? [];
  useEffect(() => {
    if (!sourceChanged.current && initialConnectorId && data?.connectors.some(c => c.id === initialConnectorId)) setSourceId(initialConnectorId);
  }, [initialConnectorId, data]);
  const selectedSource = connectors.find(c => c.id === sourceId);
  const scopedConnectors = sourceId ? connectors.filter(c => c.id === sourceId) : connectors;
  const targets = [...new Set(scopedConnectors.flatMap(c => sourceMetadata(c).targetModules ?? []))].sort();
  const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
  const unavailable = "Unavailable";
  const headings = ["#", "Source Field", "Source System", "Target Field", "Transformation Type", "Unit Conversion", "Required", "Status", "Mapping Version", "Actions"];
  function changeSource(value: string) { sourceChanged.current = true; setSourceId(value); setTarget(""); }
  function emptyTable(columns: string[], name: string) {
    return <div className="max-w-full overflow-x-auto" tabIndex={0} aria-label={`${name} table scroll`}>
      <table aria-label={name} className="w-full min-w-[320px] text-left text-sm"><thead><tr>{columns.map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length} className="p-5 text-center text-slate-500">No Data</td></tr></tbody></table>
    </div>;
  }
  return <section aria-label="Data Mapping workspace" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Data Mapping</h2><StatusPill tone="slate">Unavailable</StatusPill></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-label="Mapping Rules" className="min-w-0 space-y-4 border-y border-slate-200 py-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Mapping Rules</h3>{canEdit && <button type="button" className={control} disabled title={unavailable}>Add Mapping Rule</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm">Source<select aria-label="Mapping source" className={`${control} mt-1 w-full`} value={sourceId} onChange={e => changeSource(e.target.value)}><option value="">All Sources</option>{connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="min-w-0 text-sm">Target Module<select aria-label="Mapping target" title="Configured target references" className={`${control} mt-1 w-full`} value={target} onChange={e => setTarget(e.target.value)}><option value="">All Targets</option>{targets.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="min-w-0 text-sm">Status<select aria-label="Mapping status" title={unavailable} className={`${control} mt-1 w-full`} disabled><option>All Status</option></select></label>
          <label className="min-w-0 text-sm">Search<input aria-label="Search mapping rules" placeholder="Search mapping rules..." className={`${control} mt-1 w-full`} value={search} onChange={e => setSearch(e.target.value)} /></label>
        </div>
        <button type="button" className={control} onClick={() => { changeSource(""); setSearch(""); }}>Reset</button>
        <div className="max-w-full overflow-x-auto" tabIndex={0} aria-label="Mapping Rules table scroll"><table aria-label="Mapping Rules" className="w-full min-w-[1080px] text-left text-sm"><thead><tr><th scope="col" className="p-3"><input type="checkbox" aria-label="Select all mapping rules" disabled title={unavailable} /></th>{headings.map(label => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead><tbody><tr><td colSpan={headings.length + 1} className="p-5 text-center text-slate-500">No Data</td></tr></tbody></table></div>
        <nav aria-label="Mapping pagination" className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">No Data</span><div className="flex gap-2"><button type="button" aria-label="Previous mapping page" className={control} disabled title={unavailable}><ArrowRight size={16} className="rotate-180" aria-hidden="true" /></button><button type="button" aria-label="Next mapping page" className={control} disabled title={unavailable}><ArrowRight size={16} aria-hidden="true" /></button></div></nav>
      </section>
      <section aria-label="Mapping Editor" className="min-w-0 space-y-4 border-y border-slate-200 py-4 dark:border-slate-800">
        <h3 className="font-semibold">Mapping Editor</h3>
        <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Select Mapping Template<select aria-label="Mapping template" className={`${control} mt-1 w-full`} disabled title={unavailable}><option>Unavailable</option></select></label><button type="button" className={control} disabled title={unavailable}>Load Template</button></div>
        <label className="block text-sm">Connector<select aria-label="Mapping editor connector" className={`${control} mt-1 w-full`} value={sourceId} onChange={e => changeSource(e.target.value)}><option value="">Select Connector</option>{connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <section aria-label="Source Schema" className="min-w-0 space-y-3 border-l border-slate-200 pl-3 dark:border-slate-800"><h4 className="text-sm font-semibold">Source Schema</h4><p className="break-words text-xs text-slate-500">{selectedSource?.name ?? "No Data"}</p><select aria-label="Mapping source schema" className={`${control} w-full`} disabled title={unavailable}><option>Unavailable</option></select><input aria-label="Search source fields" placeholder="Search fields..." className={`${control} w-full`} disabled title={unavailable} />{["Process Data", "Location", "System"].map(group => <details key={group} open><summary className="text-sm font-semibold">{group}</summary><p className="py-2 text-sm text-slate-500">No Data</p></details>)}</section>
          <section aria-label="KLINTHRU Canonical Fields" className="min-w-0 space-y-3 border-l border-slate-200 pl-3 dark:border-slate-800"><h4 className="text-sm font-semibold">KLINTHRU Canonical Fields</h4><input aria-label="Search target fields" placeholder="Search target fields..." className={`${control} w-full`} disabled title={unavailable} />{["Asset Information", "Operational Data", "Inspection Data"].map(group => <details key={group} open><summary className="text-sm font-semibold">{group}</summary><p className="py-2 text-sm text-slate-500">No Data</p></details>)}</section>
        </div>
        <fieldset disabled className="grid min-w-0 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-800"><legend className="text-sm font-semibold">Mapping Rule</legend>
          {["Mapping Rule ID", "Source Entity", "Source Field", "Source Data Type", "Target Domain", "Target Entity", "Target Field", "Transform Type", "Source Unit", "Target Unit", "Required?", "Default Value", "Mapping Version", "Status"].map(label => <label key={label} className="min-w-0 text-xs">{label}{["Mapping Rule ID", "Source Data Type", "Source Unit", "Default Value", "Mapping Version"].includes(label) ? <input aria-label={`Mapping rule ${label}`} className={`${control} mt-1 w-full`} value="" placeholder="No Data" readOnly /> : <select aria-label={`Mapping rule ${label}`} className={`${control} mt-1 w-full`} title={unavailable}><option>Unavailable</option></select>}</label>)}
        </fieldset>
      </section>
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-3">
      <section aria-label="Mapping Validation Summary" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Mapping Validation Summary</h3><div role="img" aria-label="Mapping validation chart: No Data" className="flex h-32 items-center justify-center text-sm text-slate-500">No Data</div><dl className="space-y-2 text-sm">{[["Valid Mappings", "bg-emerald-500"], ["Errors", "bg-rose-500"], ["Warnings", "bg-amber-500"], ["Unmapped Fields", "bg-slate-400"]].map(([label, color]) => <div key={label} className="flex flex-wrap items-center justify-between gap-3"><dt className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-sm ${color}`} />{label}</dt><dd className="flex shrink-0 gap-3"><span aria-label={`${label} count`}>No Data</span><span aria-label={`${label} percentage`}>No Data</span></dd></div>)}</dl><button type="button" className={control} disabled title={unavailable}>View Validation Details</button></section>
      <section aria-label="Data Transformation Preview" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Data Transformation Preview</h3>{emptyTable(["Source Value", "Transformation", "Target Value"], "Data Transformation Preview")}</section>
      <section aria-label="Recent Mapping Changes" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Recent Mapping Changes</h3><button type="button" className={control} disabled title={unavailable}>View All</button></div>{emptyTable(["Time", "User", "Change", "Status"], "Recent Mapping Changes")}</section>
    </div>
  </section>;
}

const transportControl = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

function TransportEmptyTable({ title, columns }: { title: string; columns: string[] }) {
  return <div tabIndex={0} aria-label={`${title} table scroll`} className="max-w-full overflow-x-auto"><table aria-label={title} className={`w-full text-left text-sm ${columns.length > 5 ? "min-w-[900px]" : "min-w-[320px]"}`}><thead><tr>{columns.map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr></thead><tbody><tr><td className="p-5 text-center text-slate-500" colSpan={columns.length}>No Data</td></tr></tbody></table></div>;
}

function TransportUnavailableSelect({ label, options = [] }: { label: string; options?: string[] }) {
  return <label className="min-w-0 text-sm">{label}<select aria-label={label} className={`${transportControl} mt-1 w-full`} disabled title="Unavailable"><option>Unavailable</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}

function TransportValues({ labels }: { labels: string[] }) {
  return <dl className="space-y-3 text-sm">{labels.map(label => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-100 pb-2 dark:border-slate-800"><dt className="break-words text-slate-500">{label}</dt><dd>No Data</dd></div>)}</dl>;
}

function TransportEmptyChart({ title, axis, legends }: { title: string; axis: string; legends: string[] }) {
  return <section aria-label={title} className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="text-sm font-semibold">{title}</h3><div className="flex flex-wrap gap-3 text-xs text-slate-500">{legends.map(label => <span key={label}>{label}</span>)}</div><div role="img" aria-label={`${title}: No Data`} className="flex h-40 items-center justify-center text-sm text-slate-500">No Data</div><p className="text-xs text-slate-500">{axis}</p></section>;
}

function IntegrationValidationRules() {
  const [group, setGroup] = useState("All Rules");
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("Logic");
  const groups = ["All Rules", "General Data Quality", "Asset & Location", "Measurement & Readings", "Document & Files", "Reference & Lookup", "Business Rules"];
  return <section aria-label="Validation Rules workspace" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Validation Rules</h2><StatusPill tone="slate">Unavailable</StatusPill></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-label="Rule Groups" className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Rule Groups</h3><button className={transportControl} type="button" disabled title="Unavailable">Add Group</button></div>{groups.map(label => <button key={label} type="button" className={`${transportControl} flex w-full items-center justify-between gap-2 text-left`} aria-pressed={group === label} onClick={() => setGroup(label)}><span className="min-w-0 break-words">{label}</span><span className="shrink-0 text-xs">No Data</span></button>)}</section>
      <section aria-label="Validation rule register" className="min-w-0 space-y-4"><h3 className="font-semibold">Validation Rules</h3><input aria-label="Search validation rules" placeholder="Search rules (name, description, target domain...)" className={`${transportControl} w-full`} value={search} onChange={e => setSearch(e.target.value)} /><div className="grid gap-3 sm:grid-cols-3"><TransportUnavailableSelect label="Rule Group" options={groups.slice(1)} /><TransportUnavailableSelect label="Rule Severity" options={["Info", "Low", "Medium", "High", "Critical"]} /><TransportUnavailableSelect label="Rule Status" /></div><button type="button" className={transportControl} onClick={() => { setGroup("All Rules"); setSearch(""); }}>Reset Rules</button><TransportEmptyTable title="Validation Rules" columns={["Rule Name", "Severity", "Description", "Target Domain", "Status", "Pass Rate", "Actions"]} /></section>
      <section aria-label="Rule Details" className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Rule Details</h3><button type="button" className={transportControl} disabled title="Unavailable">Edit Rule</button></div><TransportValues labels={["Rule ID", "Name", "Severity", "Status", "Rule Group", "Target Domain", "Created By", "Created On", "Last Modified", "Version", "Owner"]} /><div className="flex flex-wrap gap-2" role="group" aria-label="Rule detail views">{["Logic", "Thresholds", "Required Fields", "Sample Results"].map(label => <button type="button" key={label} className={transportControl} aria-pressed={detailTab === label} onClick={() => setDetailTab(label)}>{label}</button>)}</div><h4 className="text-sm font-semibold">{detailTab === "Logic" ? "Logic Summary" : detailTab}</h4><p className="text-sm text-slate-500">No Data</p><TransportValues labels={["Expected Outcome"]} /><TransportUnavailableSelect label="Failure Action" options={["Warning Only", "Accept with Flag", "Quarantine", "Reject", "Stop Batch"]} /></section>
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-3"><TransportEmptyChart title="Validation Outcomes (Last 24 Hours)" axis="Records / Time (UTC)" legends={["Passed", "Failed", "Pending"]} /><section aria-label="Validation Summary" className="min-w-0 space-y-4 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Validation Summary</h3><TransportValues labels={["Valid Records (%)", "Passed", "Failed", "Pending"]} /><button type="button" className={transportControl} disabled title="Unavailable">View Detailed Results</button></section><section aria-label="Top 5 Failed Rules (Last 24 Hours)" className="min-w-0 space-y-4 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Top 5 Failed Rules (Last 24 Hours)</h3><TransportEmptyTable title="Top 5 Failed Rules" columns={["#", "Rule Name", "Failures", "Failure Rate"]} /></section></div>
  </section>;
}

function IntegrationProcessingRuns({ data, connectorId }: { data: IntegrationHubRealData | null; connectorId: string }) {
  const [eventId, setEventId] = useState("");
  const events = (data?.events ?? []).filter(event => !connectorId || event.connectorId === connectorId);
  const event = events.find(value => value.id === eventId);
  const eventConnector = data?.connectors.find(value => value.id === event?.connectorId);
  return <section aria-label="Processing runs workspace" className="min-w-0 space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><StatusPill tone="slate">Unavailable</StatusPill><button type="button" className={transportControl} disabled title="Unavailable">Export Logs</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TransportUnavailableSelect label="Processing Severity" options={["Info", "Low", "Medium", "High", "Critical"]} /><TransportUnavailableSelect label="Processing Status" options={["Running", "Success", "Success with Warnings", "Failed", "Partial", "Retrying", "Cancelled"]} /><label className="min-w-0 text-sm">Date Range<input aria-label="Processing Date Range" className={`${transportControl} mt-1 w-full`} disabled placeholder="Unavailable" /></label><TransportUnavailableSelect label="Message Type" /><label className="min-w-0 text-sm">Sync Run ID<input aria-label="Sync Run ID" className={`${transportControl} mt-1 w-full`} disabled placeholder="Unavailable" /></label><button type="button" className={transportControl} disabled title="Unavailable">Apply Filters</button></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><section aria-label="Sync Runs" className="min-w-0 space-y-3"><h3 className="font-semibold">Sync / Processing Runs</h3><TransportEmptyTable title="Sync Runs" columns={["Timestamp", "Connector", "Sync Run ID", "Message Type", "Status", "Records", "Duration", "Actions"]} /><div className="grid gap-4 sm:grid-cols-2"><TransportEmptyChart title="Processing Logs Over Time" axis="Log Entries / Time (UTC)" legends={["Success", "Failed", "Warning", "Pending"]} /><section aria-label="Log Summary (Selected Period)" className="min-w-0 space-y-3"><h3 className="font-semibold">Log Summary (Selected Period)</h3><TransportValues labels={["Total Logs", "Success", "Failed", "Warning", "Pending", "Percentage (%)"]} /></section></div></section><section aria-label="Log Details" className="min-w-0 space-y-4"><h3 className="font-semibold">Log Details</h3><TransportValues labels={["Connector", "Sync Run ID", "Message Type", "Start time", "End time", "Records received", "Records valid", "Records inserted", "Records updated", "Duplicates", "Warnings", "Rejected", "Records Processed", "Duration", "Retry Count", "Severity", "Source System ID", "Target System ID"]} /><details open><summary className="text-sm font-semibold">Payload Summary</summary><div className="my-3"><TransportValues labels={["Format", "Payload Size (MB)", "Records (in payload)"]} /></div><button type="button" className={transportControl} disabled title="Unavailable">View Payload (sample)</button></details><details open><summary className="text-sm font-semibold">Message / Error Details</summary><p className="py-3 text-sm text-slate-500">No Data</p></details></section></div>
    <section aria-label="Connectivity event details" className="min-w-0 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="font-semibold">Connectivity Event Details</h3><select aria-label="Connectivity event" className={`${transportControl} w-full`} value={event?.id ?? ""} onChange={e => setEventId(e.target.value)}><option value="">Select Event</option>{events.map(value => <option key={value.id} value={value.id}>{formatDateTime(value.createdAt)} | {value.operation} | {value.outcome}</option>)}</select>{event ? <dl className="space-y-3 text-sm">{[["Event ID", event.id], ["Connector", eventConnector?.name ?? "No Data"], ["Timestamp", formatDateTime(event.createdAt)], ["Operation", event.operation], ["Outcome", event.outcome], ["Duration", formatConnectivityDuration(event.durationMs)], ["Error Code", event.errorCode ?? "No Data"], ["Message", event.errorMessage ?? "No Data"]].map(([label, value]) => <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3" key={label}><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl> : <p className="text-sm text-slate-500">No Data</p>}</section>
  </section>;
}

function IntegrationDataQuality({ data }: { data: IntegrationHubRealData | null }) {
  const [sourceId, setSourceId] = useState("");
  const connectors = data?.connectors ?? [];
  return <section aria-label="Data Quality workspace" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Data Quality</h2><StatusPill tone="slate">Unavailable</StatusPill></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><TransportUnavailableSelect label="Quality Time Period" /><label className="min-w-0 text-sm">Source<select aria-label="Quality Source" className={`${transportControl} mt-1 w-full`} value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">All Sources</option>{connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><TransportUnavailableSelect label="Quality Domain" /><TransportUnavailableSelect label="Quality Connector" /><TransportUnavailableSelect label="Quality Target Module" /></div><button type="button" className={transportControl} onClick={() => setSourceId("")}>Reset Quality</button>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><section aria-label="Data Quality Overview" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Data Quality Overview</h3><TransportValues labels={["Overall Data Quality (%)", "Valid Records", "Invalid Records", "Duplicates", "Missing Data"]} /></section><section aria-label="Data Quality Scorecards" className="min-w-0 space-y-3"><h3 className="font-semibold">Data Quality Scorecards</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{["Validity", "Completeness", "Duplicate Rate", "Freshness", "Rejected Records", "Uniqueness", "Consistency", "Referential Integrity"].map(label => <section key={label} aria-label={`${label} scorecard`} className="min-w-0 space-y-3 border-y border-slate-200 py-3 dark:border-slate-800"><h4 className="break-words text-sm font-semibold">{label}</h4><TransportValues labels={["Percentage (%)", "Change (%)"]} /><div role="img" aria-label={`${label} sparkline: No Data`} className="flex h-16 items-center justify-center text-xs text-slate-500">No Data</div></section>)}</div></section></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-3"><TransportEmptyChart title="Data Quality Trend" axis="Percentage (%) / Time (UTC); Duplicate Rate (%) - right axis" legends={["Validity", "Completeness", "Duplicate Rate (right axis)"]} /><section aria-label="Records by Data Quality Status" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Records by Data Quality Status</h3><TransportValues labels={["Total Records (24 Hours)", "Valid", "Invalid", "Duplicates", "Missing", "Percentage (%)"]} /></section><section aria-label="Data Freshness by Domain" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Data Freshness by Domain</h3><TransportValues labels={["Pipeline / Asset", "Integrity Assessment", "Cathodic Protection", "SCADA / Operations", "External Data", "Documents", "Percentage (%)"]} /></section></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2"><section aria-label="Top Data Quality Issues" className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Top Data Quality Issues</h3><button type="button" className={transportControl} disabled title="Unavailable">View All Issues</button></div><TransportEmptyTable title="Top Data Quality Issues" columns={["#", "Issue Type", "Description", "Pipeline / Domain", "Source System", "Records", "% of Total", "Trend"]} /></section><section aria-label="Remediation Actions" className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Remediation Actions</h3><button type="button" className={transportControl} disabled title="Unavailable">View All Actions</button></div><TransportEmptyTable title="Remediation Actions" columns={["#", "Issue Type", "Root Cause", "Recommended Action", "Status"]} /><TransportValues labels={["Source", "Reason", "Rule ID", "Quarantine Location", "Recommended Correction"]} /></section></div>
  </section>;
}

function IntegrationScheduler({ data }: { data: IntegrationHubRealData | null }) {
  const [connectorId, setConnectorId] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calendarView, setCalendarView] = useState("Month");
  const jobTypes = ["Data Ingestion", "Data Sync", "File Pull", "Data Export", "Backfill", "Reconciliation", "Document Sync"];
  const frequencies = ["Every Minute", "5 min", "15 min", "30 min", "Hourly", "Daily", "Weekly", "Monthly", "Custom"];
  function moveDate(direction: number) { const value = new Date(`${date}T00:00:00Z`); if (calendarView === "Month") { value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + direction); } else value.setUTCDate(value.getUTCDate() + direction * (calendarView === "Week" ? 7 : 1)); setDate(value.toISOString().slice(0, 10)); }
  return <section aria-label="Scheduler workspace" className="min-w-0 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Scheduled Jobs</h2><StatusPill tone="slate">Unavailable</StatusPill></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="Search scheduled jobs" placeholder="Search scheduled jobs..." className={transportControl} value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Scheduler Connector" className={transportControl} value={connectorId} onChange={e => setConnectorId(e.target.value)}><option value="">All Connectors</option>{(data?.connectors ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><TransportUnavailableSelect label="Job Type" options={jobTypes} /><TransportUnavailableSelect label="Job Status" /></div><div className="flex flex-wrap gap-3"><button type="button" className={transportControl} onClick={() => { setConnectorId(""); setSearch(""); }}>Reset Scheduler</button><button type="button" className={transportControl} disabled title="Unavailable">Schedule Job</button><button type="button" className={transportControl} disabled title="Unavailable">Run Now</button></div>
    <TransportEmptyTable title="Scheduled Jobs" columns={["Job Name", "Connector", "Job Type", "Frequency", "Next Run", "Last Run", "Duration", "Owner", "Status", "Active", "Actions"]} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-3"><section aria-label="Schedule Calendar" className="min-w-0 space-y-3"><h3 className="font-semibold">Schedule Calendar</h3><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="Previous schedule period" className={transportControl} onClick={() => moveDate(-1)}><ArrowRight size={16} aria-hidden="true" className="rotate-180" /></button><label className="min-w-0 text-sm">Calendar Date (UTC)<input aria-label="Calendar Date (UTC)" type="date" className={`${transportControl} mt-1 max-w-full`} value={date} onChange={e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && Number.isFinite(new Date(`${e.target.value}T00:00:00Z`).getTime())) setDate(e.target.value); }} /></label><button type="button" aria-label="Next schedule period" className={transportControl} onClick={() => moveDate(1)}><ArrowRight size={16} aria-hidden="true" /></button></div><div className="flex flex-wrap gap-2" role="group" aria-label="Calendar view">{["Month", "Week", "Day"].map(label => <button type="button" key={label} aria-pressed={calendarView === label} className={transportControl} onClick={() => setCalendarView(label)}>{label}</button>)}</div><TransportEmptyChart title="Calendar Jobs" axis="Date (UTC)" legends={["Success", "Failed", "Scheduled"]} /></section><TransportEmptyChart title="Daily Schedule Timeline" axis="Time (UTC)" legends={[]} /><section aria-label="Scheduler Policies" className="min-w-0 space-y-4"><h3 className="font-semibold">Retry Policy</h3><TransportValues labels={["Maximum Retries", "Retry Interval (minutes)", "Backoff Strategy", "Retry on", "Notification"]} /><button type="button" className={transportControl} disabled title="Unavailable">Edit Retry Policy</button><h3 className="font-semibold">Schedule Configuration Summary</h3><TransportValues labels={["Total Scheduled Jobs", "Active Jobs", "Paused Jobs", "Failed Jobs", "Next 24 Hours Executions"]} /></section></div>
    <section aria-label="Scheduled Job Details" className="min-w-0 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="font-semibold">Scheduled Job Details</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TransportUnavailableSelect label="Job Frequency" options={frequencies} /><TransportUnavailableSelect label="Job Time Zone" /><TransportUnavailableSelect label="Job Retry Policy" /><label className="text-sm">Active<input className="ml-3" type="checkbox" aria-label="Job Active" disabled /></label></div><TransportValues labels={["Job Name", "Connector", "Job Type", "Start Date/Time", "Owner", "Next Run", "Last Run", "Status"]} /></section>
  </section>;
}

function IntegrationNotifications({ data, onNavigate }: { data: IntegrationHubRealData | null; onNavigate: (tab: "Configuration" | "Processing Logs", connectorId: string) => void }) {
  const [sourceId, setSourceId] = useState("");
  const [search, setSearch] = useState("");
  const [detailView, setDetailView] = useState("Related Logs");
  const source = data?.connectors.find(c => c.id === sourceId);
  return <section aria-label="Notifications workspace" className="min-w-0 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Integration Notifications</h2><StatusPill tone="slate">Unavailable</StatusPill></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><TransportUnavailableSelect label="Notification Severity" options={["Info", "Low", "Medium", "High", "Critical"]} /><TransportUnavailableSelect label="Unread Only" /><label className="min-w-0 text-sm">Source<select aria-label="Notification Source" className={`${transportControl} mt-1 w-full`} value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">All Sources</option>{(data?.connectors ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><TransportUnavailableSelect label="Notification Category" /><TransportUnavailableSelect label="Notification Assignee" /></div><div className="flex flex-wrap gap-3"><input aria-label="Search notifications" placeholder="Search notifications..." className={`${transportControl} min-w-0 flex-1`} value={search} onChange={e => setSearch(e.target.value)} /><button type="button" className={transportControl} onClick={() => { setSourceId(""); setSearch(""); }}>Reset Notifications</button></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><section aria-label="Integration Notifications" className="min-w-0 space-y-4"><TransportEmptyTable title="Integration Notifications" columns={["Time", "Severity", "Source", "Category", "Message", "Status", "Assignee", "Actions"]} /><p className="text-sm text-slate-500">No Data</p><TransportEmptyChart title="Notification Trend (Last 7 Days)" axis="Notifications / Date (UTC)" legends={["Critical", "High", "Medium", "Low", "Info"]} /><section aria-label="Notification Subscriptions" className="min-w-0 space-y-3"><h3 className="font-semibold">Notification Subscriptions</h3>{["Email Notifications", "In-App Notifications", "Critical Alerts (SMS)", "Daily Summary"].map(label => <div key={label} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm dark:border-slate-800"><span>{label}</span><span>No Data</span><button type="button" className={transportControl} disabled title="Unavailable">Manage {label}</button></div>)}</section></section><section aria-label="Notification Details" className="min-w-0 space-y-4"><h3 className="font-semibold">Notification Details</h3><button type="button" className={transportControl} disabled title="Unavailable">Mark as Acknowledged</button><TransportValues labels={["Message", "Severity", "Timestamp", "Source", "Category", "Affected Connector", "Impacted Data", "Impact", "Affected Target", "Recommended Action"]} /><div className="flex flex-wrap gap-2" role="group" aria-label="Notification detail views">{["Related Logs", "Impacted Assets", "Similar Events"].map(label => <button type="button" key={label} className={transportControl} aria-pressed={detailView === label} onClick={() => setDetailView(label)}>{label}</button>)}</div><h4 className="text-sm font-semibold">{detailView}</h4>{detailView === "Related Logs" ? <TransportEmptyTable title="Related Notification Logs" columns={["Time", "Level", "Message"]} /> : <p className="text-sm text-slate-500">No Data</p>}<button type="button" className={transportControl} disabled title="Unavailable">View All Logs</button><div className="border-t border-slate-200 pt-4 dark:border-slate-800"><h4 className="text-sm font-semibold">Source Context</h4><p className="my-3 break-words text-sm">{source?.name ?? "No Data"}</p><div className="flex flex-wrap gap-3"><button type="button" className={transportControl} disabled={!source} onClick={() => source && onNavigate("Configuration", source.id)}>Open Connector</button><button type="button" className={transportControl} disabled={!source} onClick={() => source && onNavigate("Processing Logs", source.id)}>View Source Logs</button></div></div></section></div>
  </section>;
}

type ConnectorSettings = Record<string, string | number | boolean | null>;
const connectorSettingFields = [
  { section: "Environment & Protocol", key: "host", label: "Host / Server", type: "text" },
  { section: "Environment & Protocol", key: "port", label: "Port", type: "number" },
  { section: "Environment & Protocol", key: "secureConnection", label: "Use Secure Connection (SSL/TLS)", type: "checkbox" },
  { section: "Authentication", key: "authenticationMethod", label: "Authentication Method", type: "select", options: ["None", "Basic", "Bearer Token", "API Key", "OAuth 2.0"] },
  { section: "Authentication", key: "username", label: "Username", type: "text" },
  { section: "API / Endpoint Settings", key: "connectionTimeoutSeconds", label: "Connection Timeout (seconds)", type: "number" },
  { section: "API / Endpoint Settings", key: "readIntervalSeconds", label: "Read Interval (seconds)", type: "number" },
  { section: "API / Endpoint Settings", key: "heartbeat", label: "Enable Heartbeat / Keep Alive", type: "checkbox" },
  { section: "Schema & Data Settings", key: "dataSchema", label: "Data Schema", type: "text" },
  { section: "Schema & Data Settings", key: "updateMode", label: "Update Mode", type: "select", options: ["Replace", "Merge", "Append"] },
  { section: "Schema & Data Settings", key: "autoDetectSchema", label: "Auto-detect schema changes", type: "checkbox" },
  { section: "Schema & Data Settings", key: "validateDataTypes", label: "Validate data types", type: "checkbox" },
  { section: "Retry & Error Handling", key: "maxRetryAttempts", label: "Max Retry Attempts", type: "number" },
  { section: "Retry & Error Handling", key: "retryIntervalSeconds", label: "Retry Interval (seconds)", type: "number" },
  { section: "Retry & Error Handling", key: "onFailure", label: "On Failure", type: "select", options: ["Stop", "Continue", "Dead Letter Queue"] },
  { section: "Retry & Error Handling", key: "deadLetterQueue", label: "Enable Dead Letter Queue", type: "checkbox" },
  { section: "Notifications", key: "notifyConnectionFailure", label: "Notify on Connection Failure", type: "checkbox" },
  { section: "Notifications", key: "notifyDataExceptions", label: "Notify on Data Exceptions", type: "checkbox" },
  { section: "Notifications", key: "notifySchemaChanges", label: "Notify on Schema Changes", type: "checkbox" },
  { section: "Notifications", key: "notificationRecipients", label: "Notification Recipients", type: "text" },
  { section: "Data Retention", key: "retainRawDataDays", label: "Retain Raw Data (days)", type: "number" },
  { section: "Data Retention", key: "retainErrorRecordsDays", label: "Retain Error Records (days)", type: "number" },
  { section: "Data Retention", key: "dataArchival", label: "Enable Data Archival", type: "checkbox" },
  { section: "Data Retention", key: "purgeProcessedFiles", label: "Purge Processed Files", type: "checkbox" },
  { section: "Transformation Defaults", key: "defaultMappingTemplate", label: "Default Mapping Template", type: "text" },
  { section: "Transformation Defaults", key: "dataTransformation", label: "Data Transformation", type: "text" },
  { section: "Transformation Defaults", key: "unitConversion", label: "Unit Conversion", type: "text" },
  { section: "Transformation Defaults", key: "trimWhitespace", label: "Trim Whitespace", type: "checkbox" },
  { section: "Transformation Defaults", key: "handleNullValues", label: "Handle Null Values", type: "select", options: ["Keep", "Drop", "Replace with default"] },
  { section: "Transformation Defaults", key: "standardizeDateFormats", label: "Standardize Date Formats", type: "checkbox" }
] as const;

function IntegrationConfigurationPanels({ source, connectors, onSelect, canEdit, onSaved }: { source: IntegrationConnectorRecord | undefined; connectors: IntegrationConnectorRecord[]; onSelect: (id: string) => void; canEdit: boolean; onSaved: (connector: IntegrationConnectorRecord) => void }) {
  const metadata = source ? sourceMetadata(source) : {};
  const existing = source?.configuration && typeof source.configuration === "object" && !Array.isArray(source.configuration) ? source.configuration as Record<string, unknown> : {};
  const existingSettings = existing.connectorSettings && typeof existing.connectorSettings === "object" && !Array.isArray(existing.connectorSettings) ? existing.connectorSettings as ConnectorSettings : {};
  const [draft, setDraft] = useState<ConnectorSettings>(existingSettings);
  const [metadataDraft, setMetadataDraft] = useState<MetadataDraft>(metadata);
  const [name, setName] = useState(source?.name ?? "");
  const [endpoint, setEndpoint] = useState(source?.endpoint ?? "");
  const [secretReference, setSecretReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [configurationEditing, setConfigurationEditing] = useState(true);
  useEffect(() => { setConfigurationEditing(true); setDraft(existingSettings); setMetadataDraft(source ? sourceMetadata(source) : {}); setName(source?.name ?? ""); setEndpoint(source?.endpoint ?? ""); setSecretReference(""); }, [source?.id, source?.updatedAt]);
  useEffect(() => { setMessage(""); }, [source?.id]);
  const setValue = (key: string, value: string | number | boolean | null) => setDraft(previous => ({ ...previous, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!source || !name.trim() || !endpoint.trim()) return;
    setSaving(true); setMessage("");
    try {
      const { configurationVersion: _version, ...writableMetadata } = metadataDraft;
      const updated = await updateIntegrationConnector(source.id, { name: name.trim(), ...(endpoint.trim() !== source.endpoint ? { endpoint: endpoint.trim() } : {}), ...(secretReference.trim() ? { secretReference: secretReference.trim() } : {}), configuration: { connectorSettings: draft, integrationMetadata: writableMetadata } });
      onSaved(updated); setMessage("Connector configuration saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save connector configuration."); }
    finally { setSaving(false); }
  }
  const basic = [["Connector Name", source?.name ?? "No Data"], ["Description", metadataValue(metadata, "description")], ["Source Type", metadataValue(metadata, "sourceType")], ["System", metadataValue(metadata, "sourceSystem")], ["Owner", metadataValue(metadata, "owner")], ["Tags", metadataValue(metadata, "dataDomains")], ["Environment", metadataValue(metadata, "environment")], ["Protocol", source?.connectorType ?? "No Data"], ["Endpoint URL", source?.endpoint ?? "No Data"], ["Configuration Version", metadata.configurationVersion ?? "No Data"]];
  return <section aria-label="Configuration workspace" className="min-w-0 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Configure Connector</h2><StatusPill tone={source?.enabled ? "green" : "slate"}>{source ? source.enabled ? "Active" : "Inactive" : "No Data"}</StatusPill></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><section aria-label="Configuration settings" className="min-w-0 space-y-4"><h3 className="font-semibold">Basic Information</h3><dl className="grid gap-3 sm:grid-cols-2">{basic.map(([label, value]) => <div key={String(label)} className="min-w-0 border-b border-slate-100 py-2 text-sm dark:border-slate-800"><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      {source && canEdit && configurationEditing ? <form onSubmit={save} className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900 dark:bg-cyan-950/20"><h3 className="font-semibold">Edit Connector Configuration</h3><p className="text-xs text-slate-500">These settings persist as connector metadata. Scheduling, transformations, notifications and retention execution require approved backend services.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Connector Name<input required maxLength={120} className={`${transportControl} mt-1 w-full`} value={name} onChange={e => setName(e.target.value)} /></label><label className="text-sm">Endpoint URL<input required type="url" maxLength={2048} className={`${transportControl} mt-1 w-full`} value={endpoint} onChange={e => setEndpoint(e.target.value)} /></label></div>
        <ConnectorMetadataInputs values={metadataDraft} onChange={(key, value) => setMetadataDraft(previous => ({ ...previous, [key]: value }))} control={transportControl} registries={{}} />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">{[...new Set(connectorSettingFields.map(field => field.section))].map(section => <section key={section} aria-label={section} className="min-w-0 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="text-sm font-semibold">{section}</h3>{connectorSettingFields.filter(field => field.section === section).map(field => field.type === "checkbox" ? <label key={field.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft[field.key])} onChange={e => setValue(field.key, e.target.checked)} />{field.label}</label> : <label key={field.key} className="block text-sm">{field.label}{field.type === "select" ? <select className={`${transportControl} mt-1 w-full`} value={String(draft[field.key] ?? "")} onChange={e => setValue(field.key, e.target.value || null)}><option value="">Select</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.type} min={field.type === "number" ? 0 : undefined} className={`${transportControl} mt-1 w-full`} value={draft[field.key] == null ? "" : String(draft[field.key])} onChange={e => setValue(field.key, field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />}</label>)}</section>)}</div>
        <label className="block text-sm">Secret Reference<input type="text" maxLength={255} placeholder={source.secretConfigured ? "Leave blank to keep configured credential" : "credential reference"} className={`${transportControl} mt-1 w-full`} value={secretReference} onChange={e => setSecretReference(e.target.value)} /></label><p className="text-xs text-slate-500">Only an existing credential reference is saved. Credential provisioning and authenticated transport require backend support.</p>
        {message && <p role="status" className="text-sm">{message}</p>}<div className="flex flex-wrap gap-2"><button type="submit" className={transportControl} disabled={saving}>{saving ? "Saving..." : "Save Configuration"}</button><button type="button" className={transportControl} disabled={saving} onClick={() => { setDraft(existingSettings); setMetadataDraft(source ? sourceMetadata(source) : {}); setName(source?.name ?? ""); setEndpoint(source?.endpoint ?? ""); setSecretReference(""); setMessage(""); setConfigurationEditing(false); }}>Cancel</button></div>
      </form> : <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">{source && canEdit ? <button type="button" className={transportControl} onClick={() => setConfigurationEditing(true)}>Edit Configuration</button> : "Select a connector and use an Admin account to edit its configuration."}</p>}
    </section><section aria-label="Configuration Profiles" className="min-w-0 space-y-4"><h3 className="font-semibold">Configuration Profiles</h3>{connectors.map(c => <button type="button" key={c.id} className={`${transportControl} w-full text-left`} aria-pressed={source?.id === c.id} onClick={() => onSelect(c.id)}><span className="block break-words font-semibold">{c.name}</span><span className="mt-1 block text-xs">{c.connectorType} | {c.enabled ? "Active" : "Inactive"}</span><span className="mt-1 block text-xs">Last updated: {formatDateTime(c.updatedAt)}</span></button>)}{!connectors.length && <p>No Data</p>}<h3 className="font-semibold">Recent Configuration Changes</h3><TransportEmptyTable title="Recent Configuration Changes" columns={["Time", "User", "Change", "Status"]} /></section></div>
  </section>;
}

function IntegrationOverview({ onNavigate }: { onNavigate: (tab: "Data Flow" | "Data Quality" | "Processing Logs") => void }) {
  return <section aria-label="Integration Overview workspace" className="min-w-0 space-y-5"><section aria-label="Data Flow Overview" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">Data Flow Overview</h3><button type="button" className={transportControl} onClick={() => onNavigate("Data Flow")}>Open Data Flow</button></div><div className="grid gap-3 sm:grid-cols-3"><TransportValues labels={["External Systems"]} /><TransportValues labels={["Data Ingestion", "Validation", "Mapping", "Transformation", "Deduplication", "Routing"]} /><TransportValues labels={["KLINTHRU Modules"]} /></div></section><div className="grid min-w-0 gap-5 xl:grid-cols-3"><TransportEmptyChart title="Processing Status (Last 24 Hours)" axis="Records / Time (UTC)" legends={["Successful", "Failed", "Pending"]} /><section aria-label="Data Quality Summary" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><h3 className="font-semibold">Data Quality Summary</h3><TransportValues labels={["Valid Records", "Invalid Records", "Duplicates", "Missing Data", "Valid Records (%)"]} /><button type="button" className={transportControl} onClick={() => onNavigate("Data Quality")}>View Data Quality Details</button></section><section aria-label="Recent Integration Events" className="min-w-0 space-y-3 border-y border-slate-200 py-4 dark:border-slate-800"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Recent Integration Events</h3><button type="button" className={transportControl} onClick={() => onNavigate("Processing Logs")}>View All Integration Logs</button></div><TransportEmptyTable title="Recent Integration Events" columns={["Time", "Source", "Event", "Status"]} /></section></div></section>;
}

function IntegrationDataSources({ data, loadState, error, onData }: {
  data: IntegrationHubRealData | null; loadState: LoadState; error: string | null;
  onData: (data: IntegrationHubRealData) => void;
}) {
  const { user } = useAuth();
  const drawer = useRef<HTMLElement>(null);
  const [search, setSearch] = useState(""), [type, setType] = useState("all"), [system, setSystem] = useState("all"), [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"recent" | "name" | "type" | "status">("recent"), [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<string | null>(null), [tab, setTab] = useState("Overview");
  const [registryDetails, setRegistryDetails] = useState(false);
  const hubTabs = ["Data Sources", "Data Flow", "Data Mapping", "Validation Rules", "Processing Logs", "Data Quality", "Scheduler", "Notifications", "Configuration"] as const;
  type HubTab = typeof hubTabs[number];
  const [hubTab, setHubTab] = useState<HubTab>("Data Sources");
  const pendingTabFocus = useRef<HubTab | null>(null);
  const [overview, setOverview] = useState(false);
  // Live records are the primary view. The reference screen remains available as a visual guide.
  const [referencePreview, setReferencePreview] = useState(false);
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1280);
  const [kpiDetails, setKpiDetails] = useState<string | null>(null);
  const [logConnector, setLogConnector] = useState("");
  const [logOutcome, setLogOutcome] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(1);
  const metricDetails: Record<string, { source: string; calculation: string; destination: HubTab }> = {
    "Successful Data Processing": { source: "Sync/processing runs", calculation: "Successfully validated/routed records / total processed", destination: "Data Quality" },
    "Records Processed": { source: "Sync runs", calculation: "Total records processed in selected period", destination: "Processing Logs" },
    "Average Latency": { source: "Source timestamp vs target accepted timestamp", calculation: "Delay for real-time/near-real-time feeds", destination: "Data Flow" },
    "Data Exceptions": { source: "Quarantine/error records", calculation: "Open records requiring mapping/validation/data-quality attention", destination: "Data Quality" },
    "Integration Service Health": { source: "Integration services", calculation: "Hub services/queues/connectors availability", destination: "Data Flow" }
  };
  const [menu, setMenu] = useState<string | null>(null), [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false), [newName, setNewName] = useState(""), [newEndpoint, setNewEndpoint] = useState("");
  const [wizardStep, setWizardStep] = useState(1);
  const [newMetadata, setNewMetadata] = useState<MetadataDraft>({}), [editMetadata, setEditMetadata] = useState<MetadataDraft>({});
  const [metadataChanges, setMetadataChanges] = useState<MetadataDraft>({});
  const [name, setName] = useState(""), [endpoint, setEndpoint] = useState("");
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState(""), [result, setResult] = useState("");
  const canEdit = user?.role === "Admin", canTest = canEdit || user?.role === "Engineer";
  const connectors = data?.connectors ?? [];
  const active = (c: IntegrationConnectorRecord) => c.enabled && c.status !== "Disabled";
  const manualLogs = (data?.manualRecords ?? []).filter(record => record.module === "Processing Logs");
  const processedRecords = manualLogs.filter(record => record.status === "Success").reduce((total, record) => total + (typeof record.details.records === "number" ? record.details.records : 0), 0);
  const qualityExceptions = (data?.manualRecords ?? []).filter(record => record.module === "Data Quality" && record.status !== "Resolved").length;
  const liveMetrics: Record<string, string> = {
    "Successful Data Processing": manualLogs.length ? `${(100 * manualLogs.filter(record => record.status === "Success").length / manualLogs.length).toFixed(1)}%` : "No Data",
    "Records Processed": manualLogs.length ? processedRecords.toLocaleString() : "No Data",
    "Average Latency": "No Data",
    "Data Exceptions": manualLogs.length || qualityExceptions ? String(manualLogs.filter(record => record.status === "Failed").length + qualityExceptions) : "No Data",
    "Integration Service Health": connectors.length ? `${Math.round(100 * connectors.filter(active).length / connectors.length)}%` : "No Data"
  };
  const systems = [...new Set(connectors.map(c => sourceMetadata(c).sourceSystem).filter((s): s is string => typeof s === "string"))].sort();
  const metadataRegistries = Object.fromEntries(metadataFields.map(field => [field.key, [...new Set(connectors.flatMap(c => { const value = sourceMetadata(c)[field.key]; return Array.isArray(value) ? value : typeof value === "string" ? [value] : []; }))].sort()]));
  const rows = useMemo(() => connectors.filter(c =>
    (!search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())) &&
    (type === "all" || c.connectorType === type) && (system === "all" || (system === "unknown" ? !sourceMetadata(c).sourceSystem : `system:${sourceMetadata(c).sourceSystem}` === system)) &&
    (status === "all" || (status === "active" ? active(c) : !active(c)))
  ).sort((a, b) => {
    if (sort === "recent") return (ascending ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const value = (c: IntegrationConnectorRecord) => sort === "name" ? c.name : sort === "type" ? c.connectorType : active(c) ? "Active" : "Inactive";
    return (ascending ? 1 : -1) * (value(a).localeCompare(value(b)) || a.id.localeCompare(b.id));
  }), [data, search, type, system, status, sort, ascending]);
  const displayPageSize = pageSize;
  const pages = Math.max(1, Math.ceil(rows.length / displayPageSize)), currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * displayPageSize, currentPage * displayPageSize);
  const source = connectors.find(c => c.id === selected);
  const metadata = source ? sourceMetadata(source) : {};
  const events = (data?.events ?? []).filter(e => e.connectorId === selected).slice(0, 6);
  const filteredLogEvents = (data?.events ?? []).filter(e => (!logConnector || e.connectorId === logConnector) && (logOutcome === "all" || e.outcome === logOutcome) && `${connectors.find(c => c.id === e.connectorId)?.name ?? ""} ${e.operation} ${e.outcome} ${e.errorMessage ?? ""} ${e.errorCode ?? ""}`.toLowerCase().includes(logSearch.trim().toLowerCase()));
  const logPages = Math.max(1, Math.ceil(filteredLogEvents.length / 6)), currentLogPage = Math.min(logPage, logPages);
  const visibleLogEvents = filteredLogEvents.slice((currentLogPage - 1) * 6, currentLogPage * 6);
  useEffect(() => { setLogPage(1); }, [logConnector, logOutcome, logSearch]);
  const control = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
  function navigate(next: HubTab, connectorId = selected, view?: string) {
    setHubTab(next); setSelected(connectorId); setMenu(null); setRegistryDetails(false); setKpiDetails(null); setEditing(false);
    setOverview(next === "Data Sources" && view === "overview");
    if (next === "Processing Logs") setLogConnector(connectorId ?? "");
    const url = new URL(window.location.href);
    url.searchParams.set("hubTab", next);
    if (view) url.searchParams.set("view", view); else url.searchParams.delete("view");
    if (connectorId) url.searchParams.set("connectorId", connectorId); else url.searchParams.delete("connectorId");
    window.history.pushState(null, "", url);
  }
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const resize = () => setDesktop(window.innerWidth >= 1280);
    const restore = () => {
      const params = new URLSearchParams(window.location.search), next = params.get("hubTab");
      setHubTab(hubTabs.includes(next as HubTab) ? next as HubTab : "Data Sources");
      setOverview(params.get("view") === "overview" && (!next || next === "Data Sources"));
      setSelected(params.get("connectorId")); setLogConnector(params.get("connectorId") ?? "");
      setRegistryDetails(false); setKpiDetails(null); setEditing(false);
    };
    resize(); restore(); media.addEventListener("change", resize); window.addEventListener("popstate", restore);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("popstate", restore); };
  }, []);
  useEffect(() => {
    if (pendingTabFocus.current !== hubTab) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(`hub-tab-${hubTab.replaceAll(" ", "-")}`)?.focus());
    pendingTabFocus.current = null;
    return () => window.cancelAnimationFrame(frame);
  }, [hubTab]);
  useEffect(() => { setPage(1); }, [search, type, system, status, pageSize]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(null); setSelected(null); setEditing(false); setRegistryDetails(false); setKpiDetails(null); } };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if ((!selected && !registryDetails && !kpiDetails) || !drawer.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = drawer.current;
    if (panel.getAttribute("role") !== "dialog") return;
    const controls = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]'));
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if ((desktop) && !registryDetails && !kpiDetails) return;
      if (event.key !== "Tab") return;
      const elements = controls(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    panel.addEventListener("keydown", trap);
    return () => { panel.removeEventListener("keydown", trap); previous?.focus(); };
  }, [selected, registryDetails, kpiDetails, desktop, hubTab]);
  function choose(c: IntegrationConnectorRecord, nextTab = "Overview") {
    setSelected(c.id); setTab(nextTab); setEditing(false); setMenu(null); setActionError(""); setResult("");
  }
  function edit(c: IntegrationConnectorRecord) { choose(c); setName(c.name); setEndpoint(c.endpoint); setEditMetadata(sourceMetadata(c)); setMetadataChanges({}); setEditing(true); }
  async function action(run: () => Promise<void>) {
    setBusy(true); setActionError(""); setResult(""); setMenu(null);
    try { await run(); } catch (e) { setActionError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }
  async function refresh() { onData(await fetchIntegrationHubRealData()); }
  function resetNewConnector() {
    setNewName(""); setNewEndpoint(""); setNewMetadata({ protocol: "REST", direction: "Inbound" });
    setWizardStep(1); setActionError("");
  }
  function startNewConnector() {
    setSelected(null); setResult(""); resetNewConnector(); setCreating(true);
  }
  async function open(c: IntegrationConnectorRecord) {
    choose(c);
    await action(async () => {
      const fresh = await fetchIntegrationConnector(c.id);
      if (data) onData({ ...data, connectors: data.connectors.map(item => item.id === fresh.id ? fresh : item) });
    });
  }
  function changeSort(next: typeof sort) { setAscending(sort === next ? !ascending : true); setSort(next); }
  const known = data !== null;
  if (creating) return <section aria-label="REST connector wizard" className="min-w-0 space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Connector registry</p><h2 className="mt-1 text-xl font-semibold">Add New REST Connector</h2><p className="mt-1 text-sm text-slate-500">Enter the connection details, review them, then save to the Integration Hub.</p></div>
      <button type="button" className={control} disabled={busy} onClick={() => void action(async () => { await refresh(); setResult("Connector registry refreshed."); })}>{busy ? "Refreshing..." : "Refresh"}</button>
    </div>
    <ol aria-label="Connector setup steps" className="flex flex-wrap gap-2 text-sm"><li aria-current={wizardStep === 1 ? "step" : undefined} className={`rounded-full px-3 py-1 ${wizardStep === 1 ? "bg-cyan-600 font-semibold text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>1. Connection details</li><li aria-current={wizardStep === 2 ? "step" : undefined} className={`rounded-full px-3 py-1 ${wizardStep === 2 ? "bg-cyan-600 font-semibold text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>2. Review &amp; save</li></ol>
    {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
    {result && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>}
    <form className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" onSubmit={e => {
      e.preventDefault();
      if (!canEdit) { setActionError("Only an Admin account can create a connector."); return; }
      if (wizardStep === 1) { setWizardStep(2); setActionError(""); return; }
      void action(async () => {
        const created = await createIntegrationConnector({ name: newName.trim(), endpoint: newEndpoint.trim(), ...(Object.keys(newMetadata).length ? { configuration: { integrationMetadata: newMetadata } } : {}) });
        if (data) onData({ ...data, connectors: [...data.connectors.filter(c => c.id !== created.id), created] });
        await refresh();
        setSearch(""); setType("all"); setSystem("all"); setStatus("all"); setSort("recent"); setAscending(false); setPage(1);
        navigate("Data Sources", created.id); choose(created); setCreating(false); resetNewConnector(); setResult(`Connector \"${created.name}\" was saved and is shown first in the refreshed registry.`);
      });
    }}>
      {wizardStep === 1 ? <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="text-base font-semibold">Connection details</h3><p className="mt-1 text-sm text-slate-500">Fields marked <span aria-hidden="true">*</span> are required.</p></div><label className="block text-sm font-medium">Connector name <span className="text-rose-600">*</span><input required autoFocus maxLength={120} placeholder="e.g. Asset Management API" className={`${control} mt-1 w-full`} value={newName} onChange={e => setNewName(e.target.value)} /></label><label className="block text-sm font-medium">Connector type<input readOnly aria-readonly="true" className={`${control} mt-1 w-full cursor-not-allowed bg-slate-50 dark:bg-slate-900`} value="REST" /></label><label className="block text-sm font-medium sm:col-span-2">REST endpoint <span className="text-rose-600">*</span><input required type="url" inputMode="url" maxLength={2048} placeholder="https://api.example.com/v1" className={`${control} mt-1 w-full`} value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Use a complete HTTP or HTTPS URL. Credentials are never entered on this screen.</span></label></section><div className="border-t border-slate-200 pt-5 dark:border-slate-800"><ConnectorMetadataInputs values={newMetadata} onChange={(key, value) => setNewMetadata(previous => ({ ...previous, [key]: value }))} control={control} registries={metadataRegistries} /></div></div> : <section><h3 className="text-base font-semibold">Review connector</h3><p className="mt-1 text-sm text-slate-500">Confirm the details before saving. You can return to edit them.</p><dl className="mt-5 space-y-3 text-sm">{[["Connector Name", newName.trim()], ["Connector Type", "REST"], ["REST Endpoint", newEndpoint.trim()], ...metadataFields.map(field => [field.label, metadataValue(newMetadata, field.key)])].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-slate-200 pb-3 dark:border-slate-800"><dt className="font-medium text-slate-600 dark:text-slate-300">{label}</dt><dd className="break-all">{value}</dd></div>)}</dl></section>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" className={control} disabled={busy} onClick={() => { setCreating(false); resetNewConnector(); }}>Cancel</button>{wizardStep === 2 && <button type="button" className={control} disabled={busy} onClick={() => { setWizardStep(1); setActionError(""); }}>Back</button>}<button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !newName.trim() || !newEndpoint.trim()}>{busy ? "Saving..." : wizardStep === 1 ? "Next: Review" : "Save Connector"}</button></div>
    </form>
  </section>;
  return <section aria-label="Integration Hub Data Sources" className="min-w-0 space-y-3 pb-4">
    {((!referencePreview && error) || actionError) && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError || error}</p>}
    {!referencePreview && data?.manualRecordsError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Saved Integration Hub records are unavailable: {data.manualRecordsError}</p>}
    {loadState === "loading" && !referencePreview && <p role="status" className="text-sm text-slate-500">Loading Integration Hub...</p>}
    {result && <p role="status" className="rounded-lg border border-slate-200 p-4 text-sm">{result}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2" role="group" aria-label="Integration Hub data view"><button type="button" className={control} aria-pressed={referencePreview} onClick={() => setReferencePreview(true)}>Reference preview</button><button type="button" className={control} aria-pressed={!referencePreview} onClick={() => setReferencePreview(false)}>Live sources &amp; saved records</button></div><div className="flex flex-wrap justify-end gap-2"><button type="button" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || loadState === "loading"} onClick={() => { setReferencePreview(false); startNewConnector(); }}>+ Add New Connector</button><button type="button" className={control} disabled={busy || loadState === "loading"} onClick={() => void action(refresh)}>{busy ? "Loading..." : "Refresh Hub"}</button><button type="button" className={control} onClick={() => navigate("Data Flow", null)}>Data Flow</button><button type="button" className={control} onClick={() => navigate("Configuration")}>Settings</button></div></div>
    {referencePreview && <p className="text-xs text-slate-500">Reference preview uses the figures and layouts in your images. Switch to Live sources &amp; saved records to enter data that is stored in the backend.</p>}
    {referencePreview && (hubTab === "Data Sources" || hubTab === "Data Flow" || hubTab === "Data Mapping" || hubTab === "Validation Rules" || hubTab === "Processing Logs" || hubTab === "Data Quality" || hubTab === "Scheduler" || hubTab === "Notifications" || hubTab === "Configuration") ? <IntegrationDashboardMetrics /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <KpiCard label="Connected Sources" value={known ? connectors.length : loadState === "loading" ? "Loading" : "No Data"} helper={known ? `${connectors.filter(active).length} Active | ${connectors.filter(c => !active(c)).length} Inactive` : "No Data"} tone="blue" onOpen={() => setRegistryDetails(true)} icon={Plug} />
      {([ ["Successful Data Processing", CircleCheck], ["Records Processed", Database], ["Average Latency", Clock], ["Data Exceptions", TriangleAlert], ["Integration Service Health", Activity] ] as const).map(([label, icon]) => <KpiCard key={label} label={label} value={liveMetrics[label]} helper={label === "Average Latency" ? "Real-time Sources" : label === "Integration Service Health" ? "Integration Services" : label === "Data Exceptions" ? "Requires Attention" : "Recorded Processing"} tone="slate" icon={icon} onOpen={() => setKpiDetails(label)} />)}
    </div>}
    <div role="tablist" aria-label="Integration Hub sections" onKeyDown={e => { const keys = ["ArrowLeft", "ArrowRight", "Home", "End"]; if (!keys.includes(e.key)) return; e.preventDefault(); const index = hubTabs.indexOf(hubTab); const next = e.key === "Home" ? hubTabs[0] : e.key === "End" ? hubTabs[hubTabs.length - 1] : hubTabs[(index + (e.key === "ArrowRight" ? 1 : hubTabs.length - 1)) % hubTabs.length]; pendingTabFocus.current = next; navigate(next); }} className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">{hubTabs.map(item => <button key={item} id={`hub-tab-${item.replaceAll(" ", "-")}`} role="tab" type="button" tabIndex={hubTab === item ? 0 : -1} aria-selected={hubTab === item} aria-controls="hub-panel" className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${hubTab === item ? "border-cyan-500 text-cyan-700 dark:text-cyan-300" : "border-transparent text-slate-500"}`} onClick={() => navigate(item)}>{item}</button>)}</div>
    <div id="hub-panel" role="tabpanel" aria-labelledby={`hub-tab-${hubTab.replaceAll(" ", "-")}`} className={`min-w-0 ${hubTab === "Data Sources" && source && desktop && !registryDetails && !kpiDetails ? "grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
    {hubTab === "Data Sources" && referencePreview && <IntegrationDashboard onNavigate={tab => navigate(tab, null)} />}
    {hubTab === "Data Sources" && !referencePreview && <Card>
      <SectionHeader title="Data Sources" eyebrow="Connector Inventory" action={<div className="flex flex-wrap gap-2"><button type="button" className={control} onClick={() => navigate("Data Sources", null, overview ? undefined : "overview")}>{overview ? "Sources" : "Overview"}</button><button type="button" className={control} disabled={busy || loadState === "loading"} onClick={() => void action(refresh)}>Refresh</button></div>} />
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-3">
          <input aria-label="Search data sources" placeholder="Search data sources..." className={`${control} min-w-0 flex-1`} value={search} onChange={e => setSearch(e.target.value)} />
          <select aria-label="Source type" className={control} value={type} onChange={e => setType(e.target.value)}><option value="all">All Types</option>{[...new Set(connectors.map(c => c.connectorType))].map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select aria-label="Source system" className={control} value={system} onChange={e => setSystem(e.target.value)}><option value="all">All Systems</option><option value="unknown">No Data</option>{systems.map(value => <option key={value} value={`system:${value}`}>{value}</option>)}</select>
          <select aria-label="Source status" className={control} value={status} onChange={e => setStatus(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <button type="button" className={control} onClick={() => { setSearch(""); setType("all"); setSystem("all"); setStatus("all"); setSort("name"); setAscending(true); setPage(1); }}>Reset</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-[#172233]"><tr>
              <th className="p-3">#</th>{([ ["name", "Source Name"], ["type", "Type"] ] as const).map(([key, label]) => <th key={key} className="p-3" aria-sort={sort === key ? ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort(key)}>{label}{sort === key ? ascending ? " +" : " -" : ""}</button></th>)}
              <th className="p-3">System</th><th className="p-3">Last Sync</th><th className="p-3" aria-sort={sort === "status" ? ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort("status")}>Status{sort === "status" ? ascending ? " +" : " -" : ""}</button></th><th className="p-3">Records (24h)</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody>{visible.map((c, i) => <tr key={c.id} tabIndex={0} className="border-b border-slate-200 dark:border-slate-800" onClick={e => { if (!busy && !(e.target as HTMLElement).closest("button, input, select, a")) void open(c); }} onKeyDown={e => { if (!busy && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); void open(c); } }}>
              <td className="p-3">{(currentPage - 1) * pageSize + i + 1}</td><td className="p-3"><button type="button" disabled={busy} className="inline-flex items-center gap-2 text-left font-semibold text-cyan-700 dark:text-cyan-300" onClick={() => void open(c)}><span title={`Source Type: ${metadataValue(sourceMetadata(c), "sourceType")}; Connector Type: ${c.connectorType}`} className="shrink-0">{sourceMetadata(c).sourceType === "SCADA" ? <Network aria-hidden="true" size={20} /> : <Plug aria-hidden="true" size={20} />}</span>{c.name}</button></td><td className="p-3">{c.connectorType}</td><td className="p-3">{metadataValue(sourceMetadata(c), "sourceSystem")}</td><td className="p-3">No Data</td><td className="p-3"><StatusPill tone={active(c) ? "green" : "slate"}>{active(c) ? "Active" : "Inactive"}</StatusPill></td><td className="p-3">{manualLogs.filter(record => record.connectorId === c.id && record.status === "Success" && Date.now() - new Date(record.createdAt).getTime() <= 86_400_000).reduce((total, record) => total + (typeof record.details.records === "number" ? record.details.records : 0), 0).toLocaleString()}</td>
              <td className="p-3"><button type="button" className={control} aria-label={`Actions for ${c.name}`} aria-expanded={menu === c.id} disabled={busy} onClick={() => setMenu(menu === c.id ? null : c.id)}>...</button>{menu === c.id && <div className="mt-2 flex flex-col gap-2" aria-label={`Source actions for ${c.name}`}>
                <button type="button" className={control} onClick={() => void open(c)}>View</button>
                {canEdit && <button type="button" className={control} onClick={() => edit(c)}>Edit</button>}
                {canTest && <button type="button" className={control} disabled={!c.enabled} onClick={() => { choose(c); void action(async () => { const tested = await testIntegrationConnector(c.id); await refresh(); setResult(`Connection test: ${tested.test.ok ? "Success" : "Failure"} | ${formatConnectivityDuration(tested.test.durationMs)}`); }); }}>Test Connection</button>}
                {canEdit && <button type="button" className={control} onClick={() => { void action(async () => { await updateIntegrationConnector(c.id, { enabled: !c.enabled }); await refresh(); }); }}>{c.enabled ? "Disable" : "Enable"}</button>}
                <button type="button" className={control} onClick={() => choose(c, "Logs")}>History</button><button type="button" className={control} onClick={() => setMenu(null)}>Close</button>
              </div>}</td>
            </tr>)}{!visible.length && <tr><td colSpan={8} className="p-5 text-slate-500">{loadState === "loading" && !data ? "Loading" : error && !data ? "No Data" : "No data sources match"}</td></tr>}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Showing {rows.length ? (currentPage - 1) * displayPageSize + 1 : 0} - {Math.min(currentPage * displayPageSize, rows.length)} of {rows.length} data sources</span><div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="Previous page" className={control} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>&lt;</button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next page" className={control} disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>&gt;</button><label>Show <select aria-label="Rows per page" className={control} value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select> per page</label></div></div>
      </div>
    </Card>}
    {hubTab === "Processing Logs" && referencePreview && <IntegrationProcessingLogsPreview />}
    {hubTab === "Processing Logs" && !referencePreview && <div className="space-y-5"><IntegrationManualRecords module="Processing Logs" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} /><section aria-label="Connector test events"><SectionHeader title="Connector Test Events" eyebrow="Service-generated" /><IntegrationProcessingRuns data={data} connectorId="" /></section></div>}
    {hubTab === "Configuration" && (referencePreview ? <IntegrationConfigurationPreview onBack={() => navigate("Data Sources", null)} onLive={() => { setReferencePreview(false); setSelected(null); }} /> : <section className="min-w-0 space-y-4" aria-label="Connector Configuration"><SectionHeader title="Configuration" eyebrow="Connector Metadata" /><select aria-label="Configuration connector" className={control} value={selected ?? ""} onChange={e => { const c = connectors.find(c => c.id === e.target.value); if (c) choose(c); else setSelected(null); }}><option value="">Select Connector</option>{connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className={control} onClick={() => navigate("Data Sources")}>Back to Data Sources</button><IntegrationConfigurationPanels source={source} connectors={connectors} canEdit={canEdit} onSaved={updated => { onData(data ? { ...data, connectors: data.connectors.map(c => c.id === updated.id ? updated : c) } : data!); }} onSelect={id => { const c = connectors.find(value => value.id === id); if (c) choose(c); }} /></section>)}
    {hubTab === "Data Sources" && !referencePreview && overview && <IntegrationOverview onNavigate={tab => navigate(tab, null)} />}
    {hubTab === "Validation Rules" && (referencePreview ? <IntegrationValidationRulesPreview /> : <IntegrationManualRecords module="Validation Rules" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} />)}
    {hubTab === "Data Quality" && (referencePreview ? <IntegrationDataQualityPreview /> : <IntegrationManualRecords module="Data Quality" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} />)}
    {hubTab === "Scheduler" && (referencePreview ? <IntegrationSchedulerPreview /> : <IntegrationManualRecords module="Scheduler" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} />)}
    {hubTab === "Notifications" && (referencePreview ? <IntegrationNotificationsPreview /> : <IntegrationManualRecords module="Notifications" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} />)}
    {hubTab === "Data Mapping" && (referencePreview ? <IntegrationDataMappingPreview /> : <IntegrationManualRecords module="Data Mapping" records={data?.manualRecords ?? []} connectors={connectors} canEdit={canEdit} onChanged={refresh} />)}
    {hubTab === "Data Flow" && (referencePreview ? <IntegrationDataFlowPreview onNavigate={next => navigate(next, null)} /> : <IntegrationDataFlow data={data} initialConnectorId={selected} onNavigate={(next, connectorId) => navigate(next, connectorId)} />)}
    {(registryDetails || kpiDetails) && <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30" onClick={e => { if (e.target === e.currentTarget) { setRegistryDetails(false); setKpiDetails(null); } }}>
      <aside ref={drawer} role="dialog" aria-modal="true" aria-label={`${kpiDetails ?? "Connected Sources"} details`} className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#111821]">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{kpiDetails ?? "Connected Sources"}</h2><button type="button" className={control} onClick={() => { setRegistryDetails(false); setKpiDetails(null); }}>Close</button></div>
        {kpiDetails ? <><dl className="my-5 space-y-3 text-sm">{[["Source", metricDetails[kpiDetails].source], ["Calculation", metricDetails[kpiDetails].calculation], ["Value", "No Data"]].map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-3"><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><button type="button" className={control} onClick={() => navigate(metricDetails[kpiDetails].destination, null, kpiDetails === "Data Exceptions" ? "unresolved" : kpiDetails === "Average Latency" ? "performance" : kpiDetails === "Integration Service Health" ? "health" : undefined)}>{metricDetails[kpiDetails].destination}</button></> : <>
        <dl className="my-5 space-y-3 text-sm">{[["Source", "Connector registry"], ["Calculation", "Active + Inactive configured connectors"], ["Connected Sources", known ? connectors.length : "No Data"], ["Active", known ? connectors.filter(active).length : "No Data"], ["Inactive", known ? connectors.filter(c => !active(c)).length : "No Data"]].map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2 dark:border-slate-800"><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>
        <button type="button" className={control} onClick={() => { navigate("Data Sources", null); setSearch(""); setType("all"); setSystem("all"); setStatus("all"); setPage(1); }}>Data Sources</button></>}
      </aside>
    </div>}
    {source && !registryDetails && !kpiDetails && hubTab === "Data Sources" && !referencePreview && <div className={desktop ? "min-w-0" : "fixed inset-0 z-[60] flex justify-end bg-slate-950/30"} onClick={e => { if (!desktop && e.target === e.currentTarget) { setSelected(null); setEditing(false); } }}>
      <aside ref={drawer} role={desktop ? "region" : "dialog"} aria-modal={!desktop ? true : undefined} aria-label="Source Details" className={desktop ? "min-w-0 border-l border-slate-200 p-5 dark:border-slate-800" : "h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#111821]"}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Source Details</h2><button type="button" className={control} onClick={() => { setSelected(null); setEditing(false); }}>Close</button></div>
        <div className="my-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-semibold"><span title={`Source Type: ${metadataValue(metadata, "sourceType")}; Connector Type: ${source.connectorType}`} className="shrink-0 text-cyan-600">{metadata.sourceType === "SCADA" ? <Network aria-hidden="true" size={24} /> : <Plug aria-hidden="true" size={24} />}</span>{source.name}</h3><p className="break-all text-xs text-slate-500">{source.id}</p><p className="break-words text-sm text-slate-500">{metadataValue(metadata, "description")}</p></div><StatusPill tone={active(source) ? "green" : "slate"}>{active(source) ? "Active" : "Inactive"}</StatusPill>{canEdit && <button type="button" className={control} disabled={busy} onClick={() => edit(source)}>Edit</button>}</div>
        {actionError && <p role="alert" className="mb-3 text-sm text-rose-600">{actionError}</p>}
        {result && <p role="status" className="mb-3 text-sm">{result}</p>}
        <div className="mb-4 flex flex-wrap gap-2"><button type="button" className={control} onClick={() => navigate("Configuration")}>Open Configuration</button><button type="button" className={control} onClick={() => navigate("Data Mapping")}>View Mapping</button><button type="button" className={control} onClick={() => navigate("Processing Logs")}>View Logs</button></div>
        {editing && canEdit && <form className="mb-5 space-y-3 border-y border-slate-200 py-4" onSubmit={e => { e.preventDefault(); void action(async () => { await updateIntegrationConnector(source.id, { name: name.trim(), ...(endpoint.trim() && endpoint.trim() !== source.endpoint ? { endpoint: endpoint.trim() } : {}), ...(Object.keys(metadataChanges).length ? { configuration: { integrationMetadata: metadataChanges } } : {}) }); await refresh(); setEditing(false); }); }}>
          <label className="block text-sm">Source Name<input required maxLength={120} className={`${control} mt-1 w-full`} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="block text-sm">REST Endpoint<input type="url" maxLength={2048} className={`${control} mt-1 w-full`} value={endpoint} onChange={e => setEndpoint(e.target.value)} /></label>
          <ConnectorMetadataInputs values={editMetadata} onChange={(key, value) => { setEditMetadata(previous => ({ ...previous, [key]: value })); setMetadataChanges(previous => ({ ...previous, [key]: value })); }} control={control} registries={metadataRegistries} />
          <button type="submit" className={control} disabled={busy || !name.trim()}>Save</button> <button type="button" className={control} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
        </form>}
        <div role="tablist" aria-label="Source detail sections" className="mb-4 flex flex-wrap gap-2">{["Overview", "Schema", "Data Quality", "Sync History", "Logs"].map(item => <button type="button" role="tab" aria-selected={tab === item} className={`${control} ${tab === item ? "border-cyan-500 text-cyan-700" : ""}`} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
        <div role="tabpanel" aria-label={tab}>{tab === "Overview" ? <div className="space-y-5">
          <dl className="space-y-3 text-sm">{[["Source Name", source.name], ["Description", metadataValue(metadata, "description")], ["System", metadataValue(metadata, "sourceSystem")], ["Connector Type", source.connectorType], ["Authentication Type", "No Data"], ["Sync Mode", metadataValue(metadata, "syncMode")], ["Owner", metadataValue(metadata, "owner")], ["Last Sync", "No Data"], ["Last Connectivity Test", source.lastTestedAt ? formatDateTime(source.lastTestedAt) : "No Data"], ["Last Successful Connectivity Test", source.lastSuccessfulTestAt ? formatDateTime(source.lastSuccessfulTestAt) : "No Data"], ["Connectivity Status", source.enabled ? source.status : "Disabled"], ["Last Connection Error", source.lastFailureMessage ?? source.lastFailureCode ?? "No Data"], ["Endpoint", source.endpoint], ["Secret Reference", source.secretConfigured ? "Configured" : "Not configured"]].map(([label,value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-100 pb-2 dark:border-slate-800"><dt className="text-slate-500">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>
          <dl className="space-y-3 text-sm">{metadataFields.filter(field => !["description", "sourceSystem", "syncMode", "owner"].includes(field.key)).map(field => <div key={field.key} className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2 dark:border-slate-800"><dt className="text-slate-500">{field.label}</dt><dd className="break-words">{metadataValue(metadata, field.key)}</dd></div>)}<div className="grid grid-cols-2 gap-3"><dt className="text-slate-500">Configuration Version</dt><dd>{metadataValue(metadata, "configurationVersion")}</dd></div></dl>
          <h3 className="font-semibold">Health Indicators</h3><dl className="space-y-2 text-sm">{["Connection", "Data Ingestion", "Data Parsing", "Validation", "Data Flow", "Latency", "Error Rate"].map(label => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd>No Data</dd></div>)}</dl>
          <div className="flex justify-between gap-3"><h3 className="font-semibold">Recent Activity</h3><button type="button" className={control} onClick={() => navigate("Processing Logs")}>View All</button></div>{events.slice(0,5).map(e => <p key={e.id} className="text-sm">{formatDateTime(e.createdAt)} | {e.operation} | {e.outcome}</p>)}{!events.length && <p className="text-sm text-slate-500">No Data</p>}
        </div> : tab === "Logs" ? <div className="space-y-3">{events.map(e => <article key={e.id} className="border-b border-slate-200 pb-3 text-sm dark:border-slate-800"><p>{formatDateTime(e.createdAt)} | {e.operation} | {e.outcome}</p><p className="break-words text-slate-500">{e.errorMessage ?? e.errorCode ?? "No Data"}</p><p>Duration: {formatConnectivityDuration(e.durationMs)}</p></article>)}{!events.length && <p>No Data</p>}</div> : <p className="text-sm text-slate-500">No Data</p>}</div>
      </aside>
    </div>}
    </div>
  </section>;
}
