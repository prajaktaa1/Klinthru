import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, BrainCircuit, ClipboardList, Droplet, FileText, Gauge, LayoutDashboard, Layers, Mail, MapPin, Phone, RadioTower, ShieldCheck, Target, TrendingDown, Workflow, Zap, type LucideIcon } from "lucide-react";

import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

const features = [
  {
    title: "External Corrosion Assessment",
    description:
      "Assess external corrosion threats using pipeline, coating, soil, inspection, and integrity data to support engineering review."
  },
  {
    title: "Internal Corrosion Assessment",
    description:
      "Evaluate internal corrosion risk using pipeline operating conditions, fluid data, inspection inputs, and corrosion indicators."
  },
  {
    title: "Sensor Monitoring",
    description:
      "View registered pipeline sensors and monitor available pressure, temperature, flow, level, and other field measurements.",
    href: "/sensors"
  },
  {
    title: "Cathodic Protection Review",
    description:
      "Review cathodic protection data, CP readings, compliance status, and protection performance for pipeline integrity assessment."
  },
  {
    title: "Remaining Life Prediction",
    description:
      "Estimate corrosion growth and remaining pipeline life using available integrity data and prediction results."
  },
  {
    title: "PDF Report Generation",
    description:
      "Generate structured engineering reports from completed assessments and pipeline integrity results for review and documentation."
  },
  {
    title: "Pipeline Risk Dashboard",
    description:
      "View pipeline health, anomalies, corrosion indicators, CP status, risk levels, alerts, and integrity information from one dashboard."
  }
];

const workflowSteps = [
  { number: "01", title: "Enter Input Data", Icon: ClipboardList, accent: "blue", description: "Start with the required pipeline and environmental inputs for your engineering assessment." },
  { number: "02", title: "Fetch Sensor Data", Icon: Activity, accent: "teal", description: "Bring available readings from registered sensors and connected monitoring sources into the workflow." },
  { number: "03", title: "Run Corrosion Assessment", Icon: Gauge, accent: "green", description: "Review corrosion assessment results, pipeline risk, and available remaining-life predictions." },
  { number: "04", title: "Generate Report", Icon: FileText, accent: "blue-green", description: "Prepare an engineering report for documentation, technical review, and decision-making." }
] as const;

const aboutCapabilities: Array<{ Icon: LucideIcon; label: string; color: string; bg: string }> = [
  { Icon: Layers, label: "Centralized Assessment", color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { Icon: Workflow, label: "Engineering-focused Workflows", color: "text-[#00A8B5]", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
  { Icon: Target, label: "Risk Visibility", color: "text-[#E3AC24]", bg: "bg-amber-50 dark:bg-amber-950/40" },
  { Icon: BrainCircuit, label: "AI Prediction", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" }
];

const featureIcons: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  "External Corrosion Assessment": { Icon: ShieldCheck, color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  "Internal Corrosion Assessment": { Icon: Droplet, color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  "Sensor Monitoring": { Icon: RadioTower, color: "text-[#00A8B5]", bg: "bg-cyan-50 dark:bg-cyan-950/40" },
  "Cathodic Protection Review": { Icon: Zap, color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  "Remaining Life Prediction": { Icon: TrendingDown, color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  "PDF Report Generation": { Icon: FileText, color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" }
};

import LandingIntegrityPreview from "@/components/landing-integrity-preview";
import { PublicSupportForm } from "@/components/public-support-form";

export default function LandingPage() {
  return (
    <main className="public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b border-[#d8e7ef] bg-[#f5fafd] bg-[radial-gradient(circle_at_top_right,rgba(0,168,181,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(8,121,200,0.1),transparent_36%)] dark:border-slate-800 dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(8,121,200,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(8,121,200,0.08)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-20" />
        <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:px-6 sm:py-11 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] lg:gap-8 lg:px-8 lg:py-14">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#0879C8] dark:text-cyan-300">
              Klinthru integrity engineering platform
            </p>
            <p className="public-hero-heading max-w-full text-[34px] font-bold leading-[1.08] tracking-tight text-[#123047] dark:text-white sm:text-[44px] lg:text-[54px]">
              Pipeline ILI <span className="bg-gradient-to-r from-[#0879C8] to-[#00A8B5] bg-clip-text text-transparent">(In-Line Inspection)</span>
            </p>
            <p className="public-readable-copy mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
              Corrosion Prediction, Pipeline Risk Assessment, AI Detection &amp; Engineering Report Generation — unified in one structured integrity workspace.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#0879C8] px-5 text-sm font-semibold text-white shadow-sm outline-none transition duration-300 hover:bg-[#0669ad] hover:shadow-[0_8px_20px_rgba(8,121,200,0.22)] focus-visible:bg-[#0669ad] focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Start Now <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link href="/external-corrosion-assessment" className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#00A8B5] bg-white px-5 text-sm font-semibold text-[#123047] shadow-sm outline-none transition duration-300 hover:bg-[#e9fbfc] hover:shadow-[0_8px_20px_rgba(0,168,181,0.18)] focus-visible:ring-4 focus-visible:ring-cyan-100 dark:bg-slate-900 dark:text-cyan-100 dark:hover:bg-slate-800">
                Run Assessment <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
            <div className="mt-6 grid max-w-xl grid-cols-3 border-t border-[#d8e7ef] pt-4 dark:border-slate-800"><div><p className="text-[19px] font-bold leading-tight text-[#123047] dark:text-white sm:text-[21px] lg:text-[24px]">12 Types</p><p className="mt-1 text-sm font-medium leading-5 text-[#557184] dark:text-slate-400 lg:text-base">Corrosion &amp; Risk Models</p></div><div><p className="text-[19px] font-bold leading-tight text-[#00A8B5] sm:text-[21px] lg:text-[24px]">SCADA + IoT</p><p className="mt-1 text-sm font-medium leading-5 text-[#557184] dark:text-slate-400 lg:text-base">Live CP &amp; Sensor Feeds</p></div><div><p className="text-[19px] font-bold leading-tight text-[#123047] dark:text-white sm:text-[21px] lg:text-[24px]">1-Click PDF</p><p className="mt-1 text-sm font-medium leading-5 text-[#557184] dark:text-slate-400 lg:text-base">Audit-Ready Reports</p></div></div>
          </div>

          <LandingIntegrityPreview />
          {/*
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,181,0.12),transparent_35%)]" />
            <div className="absolute inset-[1px] rounded-[31px] border border-[#e3f0f5] dark:border-slate-700" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#d8e7ef] pb-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00A8B5]">
                    Integrity Workspace
                  </p>
                  <span className="rounded-full bg-[#e9fbfc] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#0879C8] dark:bg-cyan-950/40 dark:text-cyan-300">Illustrative data</span>
                </div>
                <div role="tablist" aria-label="Illustrative pipelines" className="mt-3 flex items-center justify-between overflow-x-auto rounded-xl border border-[#d8e7ef] bg-[#f7fbfd] p-1 text-[10px] dark:border-slate-700 dark:bg-slate-800/80">{heroPipelines.map(item => <button key={item.id} type="button" role="tab" aria-selected={pipeline.id === item.id} onClick={() => setSelectedPipelineId(item.id)} className={`shrink-0 rounded-lg px-3 py-1.5 font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${pipeline.id === item.id ? "bg-[#0879C8] text-white shadow-sm" : "text-[#557184] hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700"}`}>{item.name}</button>)}</div>
                <div className="mt-3 rounded-2xl border border-[#d8e7ef] bg-[#f7fbfd] p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#557184] dark:text-slate-400">MFL wall-loss scan · illustrative</p><p className="mt-1 text-sm font-bold text-[#123047] dark:text-white">{pipeline.name} · KP {pipeline.kp}</p></div><span className="rounded-full bg-[#e8f8ec] px-2 py-1 text-[9px] font-bold text-[#238b38]">{pipeline.risk}</span></div>
                  <svg viewBox="0 0 520 80" className="mt-3 h-14 w-full overflow-visible" role="img" aria-label={`Illustrative MFL wall-loss line chart for ${pipeline.name}`}><path d={pipeline.curve} fill="none" stroke="#0879C8" strokeWidth="3" className="hero-chart-line" /><path d="M0 70 H520" stroke="#d8e7ef" strokeWidth="1" /><circle cx={pipeline.marker.x} cy={pipeline.marker.y} r="4" fill="#E3AC24" className="hero-chart-marker" /><circle cx="490" cy="35" r="4" fill="#00A8B5" /></svg>
                  <div className="mt-2 grid grid-cols-3 gap-2"><div><p className="text-[9px] uppercase text-[#557184]">Max wall loss</p><p className="font-bold text-[#123047] dark:text-white transition-all">{pipeline.wallLoss}</p></div><div><p className="text-[9px] uppercase text-[#557184]">CP potential</p><p className="font-bold text-[#0879C8] transition-all">{pipeline.cpPotential}</p></div><div><p className="text-[9px] uppercase text-[#557184]">Remaining life</p><p className="font-bold text-[#36B54A] transition-all">{pipeline.remainingLife}</p></div></div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {workspaceModules.map((module) => (
                    <Link
                      key={module.label}
                      href={module.href}
                      className={`group rounded-2xl border bg-[#f7fbfd] p-3 outline-none transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(8,121,200,0.14)] focus-visible:bg-white focus-visible:ring-4 dark:bg-slate-800/80 ${
                        module.href === "/sensors"
                          ? "border-cyan-500/35 hover:border-cyan-500/60 focus-visible:border-cyan-500/60 focus-visible:ring-cyan-100/20"
                          : "border-[#d8e7ef] hover:border-[#0879C8]/50 focus-visible:border-[#0879C8]/50 focus-visible:ring-blue-100/40 dark:border-slate-700"
                      }`}
                    >
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#557184] transition group-hover:text-[#0879C8] dark:text-slate-400">
                        {module.href === "/sensors" ? (
                          <span className="h-2 w-2 rounded-full bg-cyan-600" />
                        ) : null}
                        {module.label}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-tight text-[#123047] dark:text-white sm:text-base">
                        {module.value}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  "Structured engineering inputs",
                  "Risk and remaining-life review",
                  "Report-ready corrosion summaries"
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#d8e7ef] bg-[#f7fbfd] px-3 py-2 text-[10px] font-medium text-[#557184] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:text-[10px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#36B54A]" />
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>*/}
        </div>
      </section>

      <section className="relative z-10 -mt-9 border-b border-transparent bg-transparent dark:border-transparent">
        <div className="public-banner-in mx-auto flex max-w-6xl flex-col gap-4 rounded-2xl border border-[#b9e3e3] bg-[linear-gradient(110deg,#C7E5FB_0%,#BDEBE7_55%,#D5F0CC_100%)] px-5 py-4 shadow-[0_18px_45px_rgba(18,48,71,0.14)] sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-teal-900 dark:bg-[linear-gradient(110deg,#204a69_0%,#1e5b5b_65%,#3f6139_100%)]">
          <div className="flex min-w-0 items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[#00A8B5] dark:bg-slate-950/30"><Layers size={20} /></span><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0879C8] dark:text-cyan-200 lg:text-[17px]">Annual platform subscription</p><p className="mt-1 text-sm text-[#123047] dark:text-slate-200 lg:text-base">One complete Klinthru workspace, configured for your pipeline capacity and team.</p></div></div>
          <Link className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#00A8B5] px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition duration-300 hover:bg-[#008d99] hover:shadow-[0_8px_20px_rgba(0,168,181,0.2)]" href="/subscription">View Annual Plan <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1fr] lg:gap-14 lg:px-8 lg:py-20">
          <div className="public-about-heading">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[#0879C8] dark:text-cyan-300"><span className="h-px w-6 bg-[#0879C8]" />About Us</p>
            <h2 className="mt-4 text-[27px] font-bold leading-[1.18] tracking-tight text-[#123047] dark:text-white sm:text-[32px] lg:text-[36px]">
              One System for Pipeline Data, Assessments, Monitoring, and Engineering Workflows
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {aboutCapabilities.map(({ Icon, label, color, bg }) => <div key={label} className="public-capability-card flex items-center gap-3 rounded-xl border border-[#d8e7ef] bg-[#f7fbfd] px-3 py-3 text-[14px] font-normal text-[#123047] transition duration-200 hover:border-[#0879C8]/40 hover:bg-white sm:text-[15px] lg:text-[16px] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}><Icon size={21} className={color} /></span>{label}</div>)}
            </div>
          </div>
          <div className="public-about-copy public-readable-copy grid gap-5 text-[#557184] dark:text-slate-300">
            <p className="border-l-2 border-[#0879C8] pl-5 font-semibold">
              Klinthru is a pipeline data management platform that brings integrity records, corrosion assessments, cathodic protection (CP) monitoring, inspection and In-Line Inspection (ILI) data, risk reviews, documents, and reporting workflows together in one integrated engineering workspace.
            </p>
            <p>
              Klinthru is designed around the way pipeline integrity and engineering teams actually work. It provides a centralized environment for maintaining pipeline context, entering and reviewing corrosion assessments, tracking CP and sensor readiness, reviewing inspection and ILI information, managing engineering documents, evaluating risk, and preparing comprehensive engineering reports.
            </p>
            <p>
              By connecting pipeline data, assessments, monitoring, and engineering workflows in one system, Klinthru helps teams maintain organized records, improve visibility, and make more informed pipeline integrity decisions.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-[#d8e7ef] bg-[#f5fafd] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="public-features-heading max-w-3xl"><p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[#0879C8] dark:text-cyan-300"><span className="h-px w-6 bg-[#0879C8]" />Features</p><h2 className="mt-4 text-[27px] font-bold leading-[1.18] tracking-tight text-[#123047] dark:text-white sm:text-[32px] lg:text-[36px]">Tools for corrosion assessment, monitoring, prediction, and pipeline risk management</h2><p className="public-readable-copy mt-4 text-[#557184] dark:text-slate-300">Every module works from the same pipeline record, so assessments, monitoring, and reports stay connected.</p></div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.filter(feature => feature.title !== "Pipeline Risk Dashboard").map((feature, index) => { const visual = featureIcons[feature.title]; const Icon = visual.Icon; return <article key={feature.title} style={{ animationDelay: `${index * 70}ms` }} className="public-feature-card group flex h-full flex-col rounded-[18px] border border-[#d8e7ef] bg-white p-5 shadow-[0_8px_24px_rgba(18,48,71,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#0879C8]/40 hover:shadow-[0_16px_32px_rgba(8,121,200,0.12)] dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${visual.bg} transition duration-300 group-hover:scale-105`}><Icon size={20} className={visual.color} /></span><ArrowUpRight size={15} className="text-slate-300 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></div><h3 className="mt-5 text-base font-bold text-[#123047] dark:text-white sm:text-lg">{feature.href ? <Link href={feature.href} className="outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-cyan-900">{feature.title}</Link> : feature.title}</h3><p className="public-readable-copy mt-3 text-[#557184] dark:text-slate-300">{feature.description}</p></article>; })}</div>
          <div className="public-risk-banner mt-5 overflow-hidden rounded-[20px] border border-[#9edbd9] bg-[linear-gradient(110deg,#A9D8FA_0%,#9BDFDC_55%,#B8E8B1_100%)] p-6 text-[#123047] shadow-[0_18px_40px_rgba(8,121,200,0.16)] sm:p-7 dark:border-teal-900 dark:bg-[linear-gradient(110deg,#1b4965_0%,#17605f_55%,#355d38_100%)] dark:text-slate-100"><div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(8,121,200,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(8,121,200,0.18)_1px,transparent_1px)] [background-size:28px_28px]" /><div className="relative max-w-xl"><span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 text-[#0879C8] dark:bg-slate-950/30 dark:text-cyan-300"><LayoutDashboard size={19} /></span><h3 className="text-xl font-bold sm:text-2xl">Pipeline Risk Dashboard</h3><p className="public-readable-copy mt-2 text-[#294B5C] dark:text-slate-200">View pipeline health, anomalies, corrosion indicators, CP status, risk levels, alerts, and integrity information from one dashboard.</p></div><div className="relative flex max-w-xl flex-wrap gap-2">{["Pipeline Health", "Anomalies", "Corrosion Indicators", "CP Status", "Risk Levels", "Alerts", "Integrity Information"].map(pill => <span key={pill} className="rounded-full border border-[#72c9cf] bg-white/60 px-3 py-1.5 text-xs text-[#123047] transition hover:bg-white dark:border-cyan-700 dark:bg-slate-950/30 dark:text-cyan-100 dark:hover:bg-slate-950/50">{pill}</span>)}</div></div></div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="public-workflow-heading max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[#0879C8] dark:text-cyan-300"><span className="h-px w-6 bg-[#0879C8]" />How It Works</p>
            <h2 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-tight text-[#123047] dark:text-white sm:text-[32px] lg:text-[40px]">From pipeline inputs to an engineering report in four steps</h2>
            <p className="public-readable-copy mt-4 text-[#557184] dark:text-slate-300">A clear, repeatable workflow from raw data to a documented, reviewable result.</p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map(({ number, title, Icon, accent, description }, index) => (
              <article key={title} style={{ animationDelay: `${index * 80}ms` }} className={`public-workflow-card group flex h-full flex-col rounded-2xl border border-[#d8e7ef] bg-white p-5 shadow-[0_8px_24px_rgba(18,48,71,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(8,121,200,0.12)] dark:border-slate-700 dark:bg-slate-900 ${accent}`}>
                <div className="flex items-start justify-between"><span className="workflow-step-badge inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">{number}</span><span className="workflow-step-icon flex h-9 w-9 items-center justify-center rounded-xl"><Icon size={21} /></span></div>
                <h3 className="mt-5 text-[20px] font-bold leading-tight text-[#123047] dark:text-white lg:text-[22px]">{title}</h3>
                <p className="public-readable-copy mt-3 text-[#557184] dark:text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-workflow-cta relative overflow-hidden border-b border-[#9edbd9] bg-[linear-gradient(110deg,#A9D8FA_0%,#9BDFDC_55%,#B8E8B1_100%)] dark:border-teal-900 dark:bg-[linear-gradient(110deg,#1b4965_0%,#17605f_55%,#355d38_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(8,121,200,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(8,121,200,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-tight text-[#123047] dark:text-white sm:text-[34px] lg:text-[40px]">Move from pipeline data to a finished engineering report in one workspace.</h2>
          <p className="public-readable-copy mx-auto mt-4 max-w-3xl text-[#294B5C] dark:text-slate-200">Start with your pipeline inputs, bring in available sensor data, and review assessments and reports from the same workspace.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0879C8] px-6 text-base font-semibold text-white shadow-sm transition duration-300 hover:bg-[#0669ad] hover:shadow-[0_8px_20px_rgba(8,121,200,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Start Now <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
            <Link href="/contact" className="group inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#00A8B5] bg-white/70 px-6 text-base font-semibold text-[#123047] shadow-sm transition duration-300 hover:bg-white hover:shadow-[0_8px_20px_rgba(0,168,181,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 dark:bg-slate-900/30 dark:text-white dark:hover:bg-slate-900/50">Contact Support <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
          </div>
        </div>
      </section>

      <section id="contact-support" className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.72fr_1fr] lg:gap-14 lg:px-8 lg:py-20">
          <div>
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-[#0879C8] dark:text-cyan-300"><span className="h-px w-6 bg-[#0879C8]" />Get In Touch</p>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.15] tracking-tight text-[#123047] dark:text-white sm:text-[34px] lg:text-[40px]">
              Support &amp; Contact
            </h2>
            <p className="public-readable-copy mt-4 max-w-2xl text-[#557184] dark:text-slate-300">
              Tell us what you need and we will get back to you.
            </p>
            <div className="mt-8 grid gap-3">
              {[{ Icon: Mail, label: "Email", value: "support@klinthru.com", href: "mailto:support@klinthru.com", color: "text-[#0879C8]", bg: "bg-blue-50 dark:bg-blue-950/40" }, { Icon: Phone, label: "Phone", value: "+971 543 900 939", href: "tel:+971543900939", color: "text-[#00A8B5]", bg: "bg-cyan-50 dark:bg-cyan-950/40" }, { Icon: MapPin, label: "Location", value: "Office no. 6, PO Box 20317, Abu Dhabi, UAE.", href: undefined, color: "text-[#087E7C]", bg: "bg-teal-50 dark:bg-teal-950/40" }].map(({ Icon, label, value, href, color, bg }, index) => <div key={label} style={{ animationDelay: `${index * 80}ms` }} className="public-support-card flex items-start gap-4 rounded-2xl border border-[#d8e7ef] bg-white p-4 shadow-[0_8px_22px_rgba(18,48,71,0.06)] dark:border-slate-700 dark:bg-slate-900"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}><Icon size={21} className={color} /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#557184] dark:text-slate-400">{label}</p>{href ? <a className="mt-1 block text-[17px] font-medium text-[#123047] transition hover:text-[#0879C8] dark:text-slate-100 dark:hover:text-cyan-300" href={href}>{value}</a> : <p className="mt-1 text-[17px] font-medium leading-7 text-[#123047] dark:text-slate-100">{value}</p>}</div></div>)}
            </div>
          </div>

          <section className="public-support-form-shell w-full rounded-[28px] border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 lg:justify-self-end"><PublicSupportForm /></section>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
