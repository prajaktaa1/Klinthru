import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

type Status = "Source-backed" | "Data-dependent" | "Foundation" | "Configuration-dependent";
type Group = "Core" | "Engineering" | "Inspection" | "Monitoring" | "Intelligence" | "Operations";

const statusStyles: Record<Status, string> = {
  "Source-backed": "border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  "Data-dependent": "border-cyan-400/20 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300",
  Foundation: "border-amber-400/20 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  "Configuration-dependent": "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
};

const modules: Array<{ group: Group; name: string; status: Status; description: string; icon: string }> = [
  { group: "Core", name: "Dashboard", status: "Data-dependent", description: "Pipeline records, history, risk context, and readiness in one view.", icon: "grid" },
  { group: "Core", name: "Risk Assessment", status: "Data-dependent", description: "Segment risk review and integrity assessment context.", icon: "risk" },
  { group: "Engineering", name: "External Corrosion Assessment", status: "Source-backed", description: "External corrosion inputs, CP context, and saved assessment outputs.", icon: "shield" },
  { group: "Engineering", name: "Internal Corrosion Assessment", status: "Source-backed", description: "Process-side conditions, corrosion indicators, and remaining-life outputs.", icon: "layers" },
  { group: "Engineering", name: "ECDA Assessment", status: "Foundation", description: "Staged ECDA context with inspection and anomaly input surfaces.", icon: "route" },
  { group: "Engineering", name: "CP Monitoring", status: "Source-backed", description: "Test-point, rectifier, survey, and CP calculation records.", icon: "pulse" },
  { group: "Engineering", name: "CP Engineering Gap Analysis", status: "Data-dependent", description: "Evidence readiness for CP criteria and engineering workflows.", icon: "target" },
  { group: "Inspection", name: "ILI Analysis", status: "Data-dependent", description: "ILI readiness, anomaly review, and inspection context when available.", icon: "search" },
  { group: "Inspection", name: "Defect Manager", status: "Foundation", description: "Defect register, workflow board, and repair timeline surfaces.", icon: "wrench" },
  { group: "Monitoring", name: "SCADA", status: "Configuration-dependent", description: "Telemetry and station views only when operational sources are configured.", icon: "signal" },
  { group: "Monitoring", name: "Sensors", status: "Source-backed", description: "Stored device inventory, registration, and asset assignments.", icon: "sensor" },
  { group: "Intelligence", name: "AI Predictions", status: "Configuration-dependent", description: "Readiness, blockers, and data requirements before prediction actions.", icon: "spark" },
  { group: "Intelligence", name: "Integration Hub", status: "Configuration-dependent", description: "Connector records, protocol reference, mappings, and events.", icon: "link" },
  { group: "Operations", name: "Document Upload", status: "Source-backed", description: "Upload, preview, download, and printable document handling.", icon: "upload" },
  { group: "Operations", name: "External Corrosion Report", status: "Source-backed", description: "Report outputs for saved external corrosion assessments.", icon: "file" },
  { group: "Operations", name: "Internal Corrosion Report", status: "Source-backed", description: "Report outputs for saved internal corrosion assessments.", icon: "file" }
];

const groupMeta: Record<Group, { eyebrow: string; accent: string }> = {
  Core: { eyebrow: "Core workspace", accent: "cyan" }, Engineering: { eyebrow: "Engineering", accent: "teal" }, Inspection: { eyebrow: "Inspection", accent: "blue" }, Monitoring: { eyebrow: "Monitoring", accent: "cyan" }, Intelligence: { eyebrow: "Intelligence", accent: "amber" }, Operations: { eyebrow: "Operations", accent: "teal" }
};

const accentStyles: Record<string, string> = { cyan: "from-cyan-400/20 to-transparent text-cyan-500", teal: "from-teal-400/20 to-transparent text-teal-500", amber: "from-amber-400/20 to-transparent text-amber-500", blue: "from-blue-400/20 to-transparent text-blue-500" };

function ModuleIcon({ icon }: { icon: string }) {
  const paths: Record<string, JSX.Element> = {
    grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />, risk: <><path d="m12 3 9 16H3z" /><path d="M12 9v4M12 17h.01" /></>, shield: <><path d="m12 3 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="m8 12 2 2 5-5" /></>, layers: <><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4M4 16l8 4 8-4" /></>, route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" /></>, pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />, target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>, search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4M8 11h6" /></>, wrench: <path d="M14 6a5 5 0 0 0-6 6l-5 5 4 4 5-5a5 5 0 0 0 6-6l-3 3-4-4z" />, signal: <path d="M4 18v-3M8 18v-6M12 18V9M16 18V6M20 18V3" />, sensor: <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 9h6v6H9zM2 12h3M19 12h3M12 2v3M12 19v3" /></>, spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" /></>, link: <><path d="M9 15 7 17a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M15 9l2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0M8 12h8" /></>, upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />, file: <path d="M7 3h7l4 4v14H7zM14 3v5h5M9 13h6M9 17h4" />
  };
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">{paths[icon]}</svg>;
}

function ModuleCard({ module }: { module: (typeof modules)[number] }) {
  const accent = groupMeta[module.group].accent;
  return <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-panel dark:border-slate-800 dark:bg-slate-900/75"><div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accentStyles[accent]} opacity-0 transition group-hover:opacity-100`} /><div className="relative flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/10 transition duration-300 group-hover:scale-110 ${accentStyles[accent]}`}><ModuleIcon icon={module.icon} /></span><div className="min-w-0"><h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{module.name}</h3><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusStyles[module.status]}`}>{module.status}</span></div></div><p className="relative mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{module.description}</p></article>;
}

export default function ModulesPage() {
  const groups = Array.from(new Set(modules.map((module) => module.group)));
  return <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><PublicNavbar /><section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(20,184,166,0.09),transparent_28%)]" /><div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">Klinthru modules</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">The integrity workspace, organized around the work.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">Explore the application areas available for pipeline assessment, monitoring, engineering review, and reporting.</p></div><div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">{["Assess", "Monitor", "Analyze", "Decide", "Report"].map((item) => <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70" key={item}>{item}</span>)}</div></div></section><section className="bg-white dark:bg-slate-950"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Application map</p><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">Status labels reflect the current software boundary, not a promise of live connectivity or prediction output.</p></aside><div className="space-y-12">{groups.map((group) => { const meta = groupMeta[group]; const items = modules.filter((module) => module.group === group); return <section key={group}><div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800"><div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{meta.eyebrow}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{group}</h2></div><span className="hidden text-xs text-slate-500 sm:block">{items.length} modules</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((module) => <ModuleCard key={module.name} module={module} />)}</div></section>; })}</div></div></div></section><PublicFooter /></main>;
}
