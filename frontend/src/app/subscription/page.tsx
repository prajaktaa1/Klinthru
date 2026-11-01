"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

const modules = [
  "Pipeline integrity data management",
  "External and internal corrosion assessment",
  "Cathodic protection and sensor monitoring",
  "ILI, risk and remaining-life analysis",
  "Executive dashboards and engineering reports"
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function SubscriptionPage() {
  const [pipelineKm, setPipelineKm] = useState(2000);
  const [namedUsers, setNamedUsers] = useState(50);
  const [integrations, setIntegrations] = useState(0);
  const [onboarding, setOnboarding] = useState(true);

  const estimate = useMemo(() => {
    const platform = 50000;
    const pipelineCapacity = Math.ceil(Math.max(0, pipelineKm - 2000) / 100) * 500;
    const userCapacity = Math.max(0, namedUsers - 50) * 300;
    const integrationCapacity = integrations * 1500;
    const onboardingFee = onboarding ? 30000 : 0;
    const annual = platform + pipelineCapacity + userCapacity + integrationCapacity;
    return { platform, pipelineCapacity, userCapacity, integrationCapacity, onboardingFee, annual, firstYear: annual + onboardingFee };
  }, [pipelineKm, namedUsers, integrations, onboarding]);

  function copyEstimate() {
    const text = `Klinthru annual subscription estimate\n${pipelineKm} pipeline km · ${namedUsers} named users · ${integrations} external integration(s)\nAnnual platform estimate: ${money(estimate.annual)}\nFirst-year estimate: ${money(estimate.firstYear)}`;
    void navigator.clipboard?.writeText(text);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <PublicNavbar />
      <section className="border-b border-[#d8e5e8] bg-[#edf6f7] dark:border-slate-800 dark:bg-[#102830]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#087e7c]">Klinthru annual platform plan</p>
          <div className="mt-3 max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">One complete workspace for pipeline integrity.</h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">Build an indicative annual estimate for your team. Final pricing is subject to review and approval by Klinthru.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-12">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#d8e5e8] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Configure your annual plan</h2><p className="mt-1 text-sm text-slate-500">Adjust capacity to match your operation.</p></div><span className="rounded-full bg-[#e7f1f2] px-3 py-1 text-xs font-bold text-[#155e64]">365 days</span></div>
            <div className="mt-8 space-y-7">
              <label className="block"><span className="flex justify-between text-sm font-semibold"><span>Pipeline capacity</span><span className="text-[#087e7c]">{pipelineKm.toLocaleString()} km</span></span><input aria-label="Pipeline capacity" className="mt-3 w-full accent-[#087e7c]" max="10000" min="100" onChange={(event) => setPipelineKm(Number(event.target.value))} step="100" type="range" value={pipelineKm} /><span className="mt-1 flex justify-between text-xs text-slate-400"><span>100 km</span><span>10,000 km</span></span></label>
              <label className="block"><span className="flex justify-between text-sm font-semibold"><span>Named users</span><span className="text-[#087e7c]">{namedUsers}</span></span><input aria-label="Named users" className="mt-3 w-full accent-[#087e7c]" max="250" min="1" onChange={(event) => setNamedUsers(Number(event.target.value))} type="range" value={namedUsers} /><span className="mt-1 flex justify-between text-xs text-slate-400"><span>1 user</span><span>250 users</span></span></label>
              <label className="block"><span className="flex justify-between text-sm font-semibold"><span>External integrations</span><span className="text-[#087e7c]">{integrations}</span></span><input aria-label="External integrations" className="mt-3 w-full accent-[#087e7c]" max="20" min="0" onChange={(event) => setIntegrations(Number(event.target.value))} type="range" value={integrations} /><span className="mt-1 flex justify-between text-xs text-slate-400"><span>None</span><span>20 integrations</span></span></label>
              <label className="flex items-start gap-3 rounded-xl border border-[#d8e5e8] bg-[#f6fafb] p-4 text-sm dark:border-slate-700 dark:bg-slate-800"><input checked={onboarding} className="mt-0.5 accent-[#087e7c]" onChange={(event) => setOnboarding(event.target.checked)} type="checkbox" /><span><strong className="block">Add guided onboarding</strong><span className="text-xs text-slate-500">Optional implementation and workspace setup support.</span></span></label>
            </div>
          </div>
          <div className="rounded-2xl border border-[#d8e5e8] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"><h2 className="text-xl font-bold">Everything included</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{modules.map((module) => <div className="flex gap-3 rounded-xl bg-[#f6fafb] p-3 text-sm dark:bg-slate-800" key={module}><span className="text-[#087e7c]">✓</span><span>{module}</span></div>)}</div></div>
        </div>
        <aside className="h-fit rounded-2xl border border-[#123441] bg-[#123441] p-5 text-white shadow-xl sm:p-7 lg:sticky lg:top-24"><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9bd9d4]">Indicative estimate</p><h2 className="mt-3 text-3xl font-bold">{money(estimate.annual)}<span className="text-base font-medium text-cyan-100"> / year</span></h2><p className="mt-2 text-sm text-cyan-100">First year with selected onboarding: <strong>{money(estimate.firstYear)}</strong></p><div className="my-7 border-t border-white/15 pt-5"><h3 className="text-sm font-bold">Estimate breakdown</h3><dl className="mt-4 space-y-3 text-sm text-cyan-100"><div className="flex justify-between gap-4"><dt>Annual platform</dt><dd>{money(estimate.platform)}</dd></div><div className="flex justify-between gap-4"><dt>Pipeline capacity</dt><dd>{money(estimate.pipelineCapacity)}</dd></div><div className="flex justify-between gap-4"><dt>Named users</dt><dd>{money(estimate.userCapacity)}</dd></div><div className="flex justify-between gap-4"><dt>Integrations</dt><dd>{money(estimate.integrationCapacity)}</dd></div>{onboarding ? <div className="flex justify-between gap-4"><dt>Onboarding</dt><dd>{money(estimate.onboardingFee)}</dd></div> : null}</dl></div><div className="grid gap-3"><Link className="inline-flex items-center justify-center rounded-xl bg-[#0b8d89] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#087e7c]" href="/signup">Request this plan</Link><div className="grid grid-cols-2 gap-2"><button className="rounded-xl border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10" onClick={copyEstimate} type="button">Copy estimate</button><button className="rounded-xl border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10" onClick={() => window.print()} type="button">Print / PDF</button></div></div><p className="mt-5 text-[11px] leading-5 text-cyan-100/75">Pricing is indicative only and subject to approval. Requesting a plan creates a pending company application; it does not activate paid access or confirm payment.</p></aside>
      </section>
      <PublicFooter />
    </main>
  );
}
