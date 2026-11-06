import Link from "next/link";
import { Activity, BrainCircuit, Cable, Droplet, FileChartColumn, FileText, RadioTower, Route, Search, ShieldCheck, Target, Wrench, type LucideIcon } from "lucide-react";

import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

const solvedChallenges = [
  "Fragmented integrity data",
  "Difficult engineering assessments",
  "Corrosion monitoring",
  "Risk visibility",
  "Inspection and ILI data management",
  "SCADA and sensor data visibility",
  "Reporting and integrity decision support",
  "Analyze with AI predictions"
];

const platformCapabilities = [
  {
    title: "External Corrosion Assessment",
    status: "Source-backed workflow",
    description: "Structured inputs, saved assessment records, history review, and report outputs for external corrosion workflows."
  },
  {
    title: "Internal Corrosion Assessment",
    status: "Source-backed workflow",
    description: "Pipeline and process-side inputs with calculated internal corrosion outputs and saved assessment records."
  },
  {
    title: "ECDA",
    status: "Foundation workspace",
    description: "Staged ECDA workspace for pre-assessment, indirect inspection, direct examination, and post-assessment context."
  },
  {
    title: "CP Monitoring / Engineering",
    status: "Data-dependent workflow",
    description: "CP monitoring, CP calculations, and engineering gap analysis surfaces that use selected-pipeline evidence when available."
  },
  {
    title: "ILI Analysis",
    status: "Data-dependent workspace",
    description: "ILI readiness checks and inspection/anomaly review surfaces where selected-pipeline data is available."
  },
  {
    title: "Defect Management",
    status: "Foundation workspace",
    description: "Defect review, workflow, and timeline surfaces with real-data and demo-preview modes kept separate."
  },
  {
    title: "Risk Assessment",
    status: "Data-dependent workspace",
    description: "Risk visualization, scoring context, and assessment information for selected pipeline data."
  },
  {
    title: "AI Predictions",
    status: "Configuration-dependent",
    description: "Prediction readiness, blocked-state explanations, and demo previews without claiming unsupported autonomous prediction."
  },
  {
    title: "SCADA / Sensors",
    status: "Inventory and readiness",
    description: "Sensor inventory, assignments, SCADA status surfaces, and clear separation from true live telemetry."
  },
  {
    title: "Integration Hub",
    status: "Configuration-dependent",
    description: "Connector records, integration summary, event log, protocol reference, and mapping/webhook readiness surfaces."
  },
  {
    title: "Document Management",
    status: "Source-backed workflow",
    description: "Document upload, upload history, preview, download, delete, and letter-head handling."
  },
  {
    title: "Engineering Reports",
    status: "Source-backed workflow",
    description: "Report workspace, saved report history, and PDF or Word download paths for supported records."
  }
];

const capabilityIcons: Record<string, { Icon: LucideIcon; color: string; background: string }> = {
  "External Corrosion Assessment": { Icon: ShieldCheck, color: "text-[#0879C8]", background: "bg-blue-50 dark:bg-blue-950/40" },
  "Internal Corrosion Assessment": { Icon: Droplet, color: "text-[#00A8B5]", background: "bg-cyan-50 dark:bg-cyan-950/40" },
  ECDA: { Icon: Route, color: "text-[#087E7C]", background: "bg-teal-50 dark:bg-teal-950/40" },
  "CP Monitoring / Engineering": { Icon: Activity, color: "text-[#36B54A]", background: "bg-green-50 dark:bg-green-950/40" },
  "ILI Analysis": { Icon: Search, color: "text-[#0879C8]", background: "bg-blue-50 dark:bg-blue-950/40" },
  "Defect Management": { Icon: Wrench, color: "text-[#E3AC24]", background: "bg-amber-50 dark:bg-amber-950/40" },
  "Risk Assessment": { Icon: Target, color: "text-[#087E7C]", background: "bg-teal-50 dark:bg-teal-950/40" },
  "AI Predictions": { Icon: BrainCircuit, color: "text-purple-600", background: "bg-purple-50 dark:bg-purple-950/40" },
  "SCADA / Sensors": { Icon: RadioTower, color: "text-[#00A8B5]", background: "bg-cyan-50 dark:bg-cyan-950/40" },
  "Integration Hub": { Icon: Cable, color: "text-[#0879C8]", background: "bg-blue-50 dark:bg-blue-950/40" },
  "Document Management": { Icon: FileText, color: "text-[#087E7C]", background: "bg-teal-50 dark:bg-teal-950/40" },
  "Engineering Reports": { Icon: FileChartColumn, color: "text-[#36B54A]", background: "bg-green-50 dark:bg-green-950/40" }
};

const flowSteps = [
  {
    title: "Data Sources",
    detail: "Pipeline records, assessments, CP readings, devices, assignments, reports, documents, ILI readiness, and connector records."
  },
  {
    title: "Integrity Analysis",
    detail: "Corrosion assessment, ECDA context, CP engineering readiness, ILI review, defect workflows, and saved calculations."
  },
  {
    title: "Risk / AI Intelligence",
    detail: "Risk context and AI readiness states are shown only from existing data and configured backend capability."
  },
  {
    title: "Engineering Decisions",
    detail: "Teams review evidence, blockers, unavailable data, and traceable assessment results before taking action."
  },
  {
    title: "Reports",
    detail: "Supported workflows produce reviewable report records and downloadable engineering documentation."
  }
];

const reasons = [
  {
    title: "Centralized Integrity Data",
    detail: "Pipeline, assessment, monitoring, report, and document records are organized around the selected asset context."
  },
  {
    title: "Engineering-Focused Workflows",
    detail: "Modules are shaped around corrosion, CP, ECDA, ILI, defect, risk, and reporting tasks."
  },
  {
    title: "Risk Visibility",
    detail: "Risk views and dashboard summaries help teams understand where review is needed without replacing engineering judgement."
  },
  {
    title: "Monitoring & Inspection Integration",
    detail: "Sensor, SCADA, CP, ILI, and connector surfaces are present while clearly showing configuration boundaries."
  },
  {
    title: "Traceable Assessments",
    detail: "Saved records, history views, readiness checks, and report paths support a more auditable review workflow."
  },
  {
    title: "Decision Support",
    detail: "Klinthru brings evidence, calculations, blockers, and documents into one place for practical integrity review."
  }
];

function SectionIntro({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slateblue-700">{eyebrow}</p>
      <h2 className="mt-3 !text-[30px] font-bold leading-[1.18] tracking-tight text-slate-900 dark:text-white sm:!text-[32px] lg:!text-[34px]">{title}</h2>
      {description ? <p className="mt-5 !text-[18px] !leading-[1.7] text-slate-600 dark:text-slate-300 sm:!text-[19px] lg:!text-[20px]">{description}</p> : null}
    </div>
  );
}

function CapabilityCard({
  description,
  status,
  title
}: {
  description: string;
  status: string;
  title: string;
}) {
  const visual = capabilityIcons[title] ?? { Icon: Activity, color: "text-[#0879C8]", background: "bg-blue-50 dark:bg-blue-950/40" };
  const Icon = visual.Icon;

  return (
    <article className="group min-w-0 overflow-visible rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-500 hover:shadow-panel dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-center"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${visual.background} transition duration-300 group-hover:scale-105`}><Icon size={23} className={visual.color} /></span></div>
      <div className="flex flex-col gap-3">
        <h3 className="break-words !text-[20px] font-bold leading-[1.25] tracking-tight text-slate-900 dark:text-white">{title}</h3>
        <span className="w-fit rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
          {status}
        </span>
      </div>
      <p className="mt-4 break-words !text-[17px] !leading-[1.7] text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

export default function AboutPage() {
  return (
    <main className="public-subpage public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950">
      <PublicNavbar />

      <section className="overflow-hidden border-b border-slate-200 bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.16),transparent_34%)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              About Klinthru
            </p>
            <h1 className="mt-5 !text-[34px] font-bold tracking-tight text-slate-900 dark:text-white sm:!text-[44px] lg:!text-[52px] lg:!leading-[1.08]">
              Engineering Intelligence for Safer Pipelines
            </h1>
            <p className="public-about-page-copy mt-6 max-w-3xl !text-[18px] !leading-[1.7] text-slate-600 dark:text-slate-300 sm:!text-[20px] lg:text-justify">
              Klinthru is a Pipeline Integrity Management platform that brings integrity records, corrosion assessments, CP monitoring, inspection context, risk review, documents, and reporting workflows into one engineering workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-slateblue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-slateblue-700 hover:shadow-md focus-visible:bg-slateblue-700 focus-visible:ring-4 focus-visible:ring-slateblue-100"
                href="/features"
              >
                Explore Features
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-cyan-500 hover:text-cyan-700 hover:shadow-md focus-visible:border-cyan-500 focus-visible:text-cyan-700 focus-visible:ring-4 focus-visible:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                href="/modules"
              >
                View Modules
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slateblue-700">
                Integrity system
              </p>
              <div className="mt-6 grid gap-3">
                {["Pipeline context", "Assessment records", "Monitoring readiness", "Risk and reports"].map((item) => (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" key={item}>
                <span className="!text-[17px] font-semibold leading-[1.5] text-slate-700 dark:text-slate-200">{item}</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 !text-[17px] !leading-[1.7] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Real outputs depend on saved records, selected-pipeline data, and configured backend capability. Demo and reference views remain clearly separated inside the application.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="About Klinthru"
            title="One system for integrity data, assessments, monitoring, and engineering workflows."
          />
          <p className="!text-[18px] !leading-[1.7] text-slate-600 dark:text-slate-300 sm:!text-[20px] lg:text-justify">
            Klinthru is built around the way pipeline integrity teams work: maintaining pipeline context, entering and reviewing corrosion assessments, tracking CP and sensor readiness, reviewing inspection and ILI information, managing documents, and preparing engineering reports. The platform is designed to centralize the evidence needed for integrity review while keeping unsupported integrations, live telemetry, and AI predictions clearly marked as unavailable or configuration-dependent.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="What We Solve"
            title="Integrity decisions become harder when engineering evidence is scattered."
            description="Klinthru focuses on organizing the core data and workflow surfaces that support pipeline integrity review."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {solvedChallenges.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={item}>
                <div className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />
                  <p className="!text-[17px] font-semibold !leading-[1.5] text-slate-700 dark:text-slate-200">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="Platform Capabilities"
            title="Verified capability areas present in the current Klinthru software."
            description="These descriptions reflect existing pages, modules, API surfaces, and capability boundaries found during the audit."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {platformCapabilities.map((capability) => (
              <CapabilityCard key={capability.title} {...capability} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="How Klinthru Works"
            title="A traceable flow from source data to engineering output."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {flowSteps.map((step, index) => (
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={step.title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slateblue-600 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 !text-[20px] font-bold leading-[1.25] text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-3 !text-[17px] !leading-[1.7] text-slate-600 dark:text-slate-300 lg:text-justify">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="Engineering Approach"
            title="Calculations, inspection data, monitoring evidence, and decision support in one workflow."
          />
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950">
            <p className="!text-[18px] !leading-[1.7] text-slate-600 dark:text-slate-300 lg:text-justify">
              Klinthru does not treat integrity review as a single score or isolated screen. The current application brings together saved corrosion assessments, pipeline history, CP monitoring evidence, CP calculation records, ILI readiness, risk review, AI readiness states, sensor inventory, integration events, documents, and report history. This creates a more traceable review path from source record to engineering output.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Source-backed records", "Selected-pipeline context", "Blocked and unavailable states", "Demo/reference separation"].map((item) => (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <SectionIntro
            eyebrow="Why Klinthru"
            title="Built for practical pipeline integrity review."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900" key={reason.title}>
                <h3 className="!text-[20px] font-bold text-slate-900 dark:text-white">{reason.title}</h3>
                <p className="mt-3 !text-[17px] !leading-[1.7] text-slate-600 dark:text-slate-300 lg:text-justify">{reason.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#9edbd9] !bg-[linear-gradient(110deg,#A9D8FA_0%,#9BDFDC_55%,#B8E8B1_100%)] !text-[#123047] dark:border-teal-900 dark:!bg-[linear-gradient(110deg,#1b4965_0%,#17605f_55%,#355d38_100%)] dark:!text-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] !text-[#123047]">Explore the Klinthru Platform</p>
            <h2 className="mt-3 !text-[30px] font-bold leading-[1.18] tracking-tight !text-[#123047] sm:!text-[34px] dark:!text-white">Review the public feature and module overview.</h2>
            <p className="mt-4 !text-[18px] !leading-[1.7] !text-[#294B5C] dark:!text-slate-200">
              The Features and Modules pages describe current software capabilities with the same data-source and configuration boundaries used inside the application.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-14 items-center justify-center whitespace-nowrap rounded-full bg-[#087E7C] px-8 text-lg font-semibold text-white shadow-sm transition hover:bg-[#066B69]" href="/features">
              Explore Features
            </Link>
            <Link className="inline-flex h-14 items-center justify-center whitespace-nowrap rounded-full border border-[#00A8B5] bg-white px-8 text-lg font-semibold !text-[#123047] transition hover:border-[#0879C8] hover:bg-slate-50 hover:!text-[#0879C8] dark:border-cyan-300/60 dark:bg-white dark:!text-[#123047] dark:hover:bg-slate-100" href="/modules">
              View Modules
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
