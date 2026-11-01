"use client";

import { useState } from "react";
import Link from "next/link";
import { BrainCircuit, FileChartColumn, Layers, RadioTower, type LucideIcon } from "lucide-react";

const workspaceModules: Array<{ label: string; value: string; href: string; Icon: LucideIcon; iconClass: string; iconBg: string }> = [
  { label: "Assessment", value: "12 Types", href: "/external-corrosion-assessment", Icon: Layers, iconClass: "text-[#0879C8]", iconBg: "bg-blue-50 dark:bg-blue-950/40" },
  { label: "SCADA & Sensor Monitoring", value: "(SCADA) Integration", href: "/internal-corrosion-assessment", Icon: RadioTower, iconClass: "text-[#00A8B5]", iconBg: "bg-cyan-50 dark:bg-cyan-950/40" },
  { label: "AI Analysis", value: "Process Analysis", href: "/report", Icon: BrainCircuit, iconClass: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-950/40" },
  { label: "Reports", value: "Decide an Action", href: "/sensors", Icon: FileChartColumn, iconClass: "text-[#36B54A]", iconBg: "bg-green-50 dark:bg-green-950/40" }
];

type HeroPipeline = { id: string; name: string; kp: string; wallLoss: string; cpPotential: string; remainingLife: string; risk: string; curve: string; marker: { x: number; y: number } };
const heroPipelines: HeroPipeline[] = [
  { id: "ad-36l", name: "AD-36L Trunk", kp: "0.0–48.5", wallLoss: "18.4%", cpPotential: "−942 mV CSE", remainingLife: "22.6 yrs", risk: "Low–Med", curve: "M0 57 C34 52 47 59 76 50 S118 42 146 54 S188 69 215 43 S259 22 285 43 S325 61 354 32 S397 18 423 44 S463 70 490 35 S507 28 520 18", marker: { x: 354, y: 32 } },
  { id: "hb-246", name: "HB-246 Gas", kp: "0.0–62.0", wallLoss: "24.7%", cpPotential: "−875 mV CSE", remainingLife: "17.3 yrs", risk: "Moderate", curve: "M0 55 C35 45 62 62 92 48 S135 28 166 49 S208 70 236 39 S278 31 308 52 S348 63 376 27 S414 22 442 47 S480 67 520 29", marker: { x: 376, y: 27 } },
  { id: "cp-18", name: "CP-18 North", kp: "0.0–35.8", wallLoss: "12.1%", cpPotential: "−963 mV CSE", remainingLife: "28.4 yrs", risk: "Low", curve: "M0 50 C38 58 62 41 94 53 S143 67 174 45 S218 20 248 42 S292 59 322 38 S365 25 396 47 S442 61 470 40 S500 32 520 36", marker: { x: 248, y: 42 } }
];

export default function LandingIntegrityPreview() {
  const [selectedPipelineId, setSelectedPipelineId] = useState(heroPipelines[0].id);
  const pipeline = heroPipelines.find(item => item.id === selectedPipelineId) || heroPipelines[0];

  return <div className="relative min-h-[320px] w-full max-w-[680px] justify-self-end overflow-hidden rounded-[26px] border border-[#d8e7ef] bg-white/90 p-4 shadow-[0_24px_70px_rgba(8,121,200,0.14)] backdrop-blur lg:p-5 dark:border-slate-700 dark:bg-slate-900/90">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,181,0.12),transparent_35%)]" />
    <div className="absolute inset-[1px] rounded-[31px] border border-[#e3f0f5] dark:border-slate-700" />
    <div className="relative flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#d8e7ef] pb-3 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00A8B5]">Integrity Workspace</p>
          <span className="rounded-full bg-[#e9fbfc] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#0879C8] dark:bg-cyan-950/40 dark:text-cyan-300">Illustrative data</span>
        </div>
        <div role="tablist" aria-label="Illustrative pipelines" className="mt-3 flex items-center justify-between overflow-x-auto rounded-xl border border-[#d8e7ef] bg-[#f7fbfd] p-1 text-[10px] dark:border-slate-700 dark:bg-slate-800/80">{heroPipelines.map(item => <button key={item.id} type="button" role="tab" aria-selected={pipeline.id === item.id} onClick={() => setSelectedPipelineId(item.id)} className={`shrink-0 rounded-lg px-3 py-1.5 font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${pipeline.id === item.id ? "bg-[#0879C8] text-white shadow-sm" : "text-[#557184] hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700"}`}>{item.name}</button>)}</div>
        <div className="mt-3 rounded-2xl border border-[#d8e7ef] bg-[#f7fbfd] p-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#557184] dark:text-slate-400">MFL wall-loss scan · illustrative</p><p className="mt-1 text-sm font-bold text-[#123047] dark:text-white">{pipeline.name} · KP {pipeline.kp}</p></div><span className="rounded-full bg-[#e8f8ec] px-2 py-1 text-[9px] font-bold text-[#238b38]">{pipeline.risk}</span></div>
          <svg viewBox="0 0 520 80" className="mt-3 h-14 w-full overflow-visible" role="img" aria-label={`Illustrative MFL wall-loss line chart for ${pipeline.name}`}><path d={pipeline.curve} fill="none" stroke="#0879C8" strokeWidth="3" className="hero-chart-line" /><path d="M0 70 H520" stroke="#d8e7ef" strokeWidth="1" /><circle cx={pipeline.marker.x} cy={pipeline.marker.y} r="4" fill="#E3AC24" className="hero-chart-marker" /><circle cx="490" cy="35" r="4" fill="#00A8B5" /></svg>
          <div className="mt-2 grid grid-cols-3 gap-2"><div><p className="text-[9px] uppercase text-[#557184]">Max wall loss</p><p className="font-bold text-[#123047] dark:text-white transition-all">{pipeline.wallLoss}</p></div><div><p className="text-[9px] uppercase text-[#557184]">CP potential</p><p className="font-bold text-[#0879C8] transition-all">{pipeline.cpPotential}</p></div><div><p className="text-[9px] uppercase text-[#557184]">Remaining life</p><p className="font-bold text-[#36B54A] transition-all">{pipeline.remainingLife}</p></div></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{workspaceModules.map(module => <Link key={module.label} href={module.href} className="group rounded-2xl border border-[#d8e7ef] bg-[#f7fbfd] p-3 outline-none transition hover:-translate-y-0.5 hover:border-[#0879C8]/50 hover:bg-white hover:shadow-[0_12px_30px_rgba(8,121,200,0.14)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-100/40 dark:border-slate-700 dark:bg-slate-800/80"><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#557184] transition group-hover:text-[#0879C8] dark:text-slate-400"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${module.iconBg}`}><module.Icon size={19} strokeWidth={2} className={module.iconClass} /></span>{module.label}</p><p className="mt-2 text-base font-semibold leading-tight text-[#123047] dark:text-white">{module.value}</p></Link>)}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">{["Structured engineering inputs", "Risk and remaining-life review", "Report-ready corrosion summaries"].map(label => <div key={label} className="rounded-xl border border-[#d8e7ef] bg-[#f7fbfd] px-3 py-2 text-[10px] font-medium text-[#557184] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#36B54A]" /><span>{label}</span></div></div>)}</div>
    </div>
  </div>;
}
