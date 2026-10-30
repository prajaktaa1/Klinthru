"use client";

import { Droplets } from "lucide-react";
import { useState } from "react";
import { InternalCorrosionOverview } from "@/components/internal-corrosion-overview";
import { InternalCorrosionLoops } from "@/components/internal-corrosion-loops";
import { InternalCorrosionProcessChemistry } from "@/components/internal-corrosion-process-chemistry";
import { InternalCorrosionCouponsProbes } from "@/components/internal-corrosion-coupons-probes";
import { InternalCorrosionUtMonitoring } from "@/components/internal-corrosion-ut-monitoring";
import { InternalCorrosionTrends } from "@/components/internal-corrosion-trends";
import { InternalCorrosionInhibitorPerformance } from "@/components/internal-corrosion-inhibitor-performance";
import { InternalCorrosionFindings } from "@/components/internal-corrosion-findings";
import { InternalCorrosionAlertsEvents } from "@/components/internal-corrosion-alerts-events";
import { InternalCorrosionConfiguration } from "@/components/internal-corrosion-configuration";
import { IcUnavailableAction } from "@/components/internal-corrosion-ui";

const tabs = ["Overview", "Corrosion Loops", "Process & Chemistry", "Coupons & Probes", "UT / Monitoring", "Trends & Historical", "Inhibitor Performance", "Findings", "Alerts & Events", "Configuration"];

export function InternalCorrosionWorkspace() {
  const [activeTab, setActiveTab] = useState(0);
  function openScreening() {
    const target = document.getElementById("existing-internal-corrosion-screening");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  }

  return <section aria-label="Internal Corrosion dashboard" className="mb-8 space-y-4">
    <div className="flex flex-col justify-between gap-3 xl:flex-row">
      <div className="flex items-start gap-3"><Droplets aria-hidden="true" className="h-10 w-10 shrink-0 rounded bg-slateblue-600 p-2 text-white" /><div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Internal Corrosion</h1><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Assess internal corrosion mechanisms, rates, inhibition effectiveness and segment condition using process, chemistry and monitoring data.</p></div></div>
      <div className="shrink-0 space-y-2"><p className="text-xs text-slate-500">Corrosion Management / Internal Corrosion / {tabs[activeTab]}</p><div className="flex justify-end gap-2"><IcUnavailableAction>Export</IcUnavailableAction><button type="button" onClick={openScreening} className="rounded bg-slateblue-600 px-3 py-1.5 text-xs font-medium text-white">Add Assessment</button></div><p className="text-xs text-slate-500">Add Assessment opens the existing screening form.</p></div>
    </div>
    <nav aria-label="Internal Corrosion views" className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"><div className="flex min-w-max">{tabs.map((tab, index) => <button key={tab} type="button" onClick={() => setActiveTab(index)} aria-current={index === activeTab ? "page" : undefined} title={tab} className={`px-3 py-2.5 text-xs ${index === activeTab ? "border-b-2 border-slateblue-600 bg-white font-semibold text-slateblue-700 dark:bg-slate-800 dark:text-slateblue-300" : "text-slate-500"}`}>{tab}</button>)}</div></nav>
    <p className="text-xs text-slate-500 dark:text-slate-400">All ten views are available as UI layouts. Unopened reference configuration sections use neutral unavailable states. Engineering data, record actions and exports are unavailable until verified records and approved workflows exist. No reference values are shown as records.</p>
    <div hidden={activeTab !== 0}><InternalCorrosionOverview /></div>
    <div hidden={activeTab !== 1}><InternalCorrosionLoops /></div>
    <div hidden={activeTab !== 2}><InternalCorrosionProcessChemistry /></div>
    <div hidden={activeTab !== 3}><InternalCorrosionCouponsProbes /></div>
    <div hidden={activeTab !== 4}><InternalCorrosionUtMonitoring /></div>
    <div hidden={activeTab !== 5}><InternalCorrosionTrends /></div>
    <div hidden={activeTab !== 6}><InternalCorrosionInhibitorPerformance /></div>
    <div hidden={activeTab !== 7}><InternalCorrosionFindings /></div>
    <div hidden={activeTab !== 8}><InternalCorrosionAlertsEvents /></div>
    <div hidden={activeTab !== 9}><InternalCorrosionConfiguration /></div>
  </section>;
}
