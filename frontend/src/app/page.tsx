import Link from "next/link";

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

const steps = [
  "Enter input data.",
  "Fetch sensor data",
  "Run corrosion assessment.",
  "Generate report"
];

const workspaceModules = [
  { label: "Assessment", value: "12 Types", href: "/external-corrosion-assessment" },
  { label: "Existing Sensor, System", value: "(SCADA) Integration", href: "/internal-corrosion-assessment" },
  { label: "AI (Artificial Intelligence)", value: "Process Analysis", href: "/report" },
  { label: "Report", value: "Decide an Action", href: "/sensors" }
];

const supportFormFields = [
  { label: "Your name", name: "support-name", type: "text", placeholder: "Your full name" },
  { label: "Email to reach you", name: "support-email", type: "email", placeholder: "you@company.com" }
];

export default function LandingPage() {
  return (
    <main className="public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950">
      <PublicNavbar />

      <section className="overflow-hidden border-b border-slate-200 bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.09),transparent_34%)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:gap-12 lg:px-8 lg:py-24">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="max-w-full text-[30px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              Pipeline ILI (In-Line Inspection)
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Corrosion Prediction, Pipeline Risk Assessment, AI Detection &amp; Engineering Report Generation.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slateblue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-slateblue-700 hover:shadow-md focus-visible:bg-slateblue-700 focus-visible:ring-4 focus-visible:ring-slateblue-100"
              >
                Start Now
              </Link>
            </div>
          </div>

          <div className="relative min-h-[320px] w-full max-w-[680px] justify-self-end overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 p-5 shadow-panel lg:p-6">
            <div className="absolute inset-0 pipeguard-landing-preview-bg" />
            <div className="absolute inset-[1px] rounded-[31px] border border-white/5" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-700">
                    Integrity Workspace
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {workspaceModules.map((module) => (
                    <Link
                      key={module.label}
                      href={module.href}
                      className={`group rounded-[22px] border bg-white/[0.05] p-4 outline-none transition hover:bg-white/[0.08] hover:shadow-[0_12px_30px_rgba(11,23,57,0.24)] focus-visible:bg-white/[0.08] focus-visible:ring-4 ${
                        module.href === "/sensors"
                          ? "border-cyan-500/35 hover:border-cyan-500/60 focus-visible:border-cyan-500/60 focus-visible:ring-cyan-100/20"
                          : "border-white/10 hover:border-slateblue-500/35 focus-visible:border-slateblue-500/35 focus-visible:ring-slateblue-100/20"
                      }`}
                    >
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition group-hover:text-slateblue-700">
                        {module.href === "/sensors" ? (
                          <span className="h-2 w-2 rounded-full bg-cyan-600" />
                        ) : null}
                        {module.label}
                      </p>
                      <p className="mt-3 text-lg font-semibold leading-tight text-slate-900 sm:text-lg">
                        {module.value}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-2.5">
                {[
                  "Structured engineering inputs",
                  "Risk and remaining-life review",
                  "Report-ready corrosion summaries"
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-slate-600 sm:text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-slateblue-600" />
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              About Us
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              One System for Pipeline Data, Assessments, Monitoring, and Engineering Workflows
            </h2>
          </div>
          <div className="grid gap-5">
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              Klinthru is a pipeline data management platform that brings integrity records, corrosion assessments, cathodic protection (CP) monitoring, inspection and In-Line Inspection (ILI) data, risk reviews, documents, and reporting workflows together in one integrated engineering workspace.
            </p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              Klinthru is designed around the way pipeline integrity and engineering teams actually work. It provides a centralized environment for maintaining pipeline context, entering and reviewing corrosion assessments, tracking CP and sensor readiness, reviewing inspection and ILI information, managing engineering documents, evaluating risk, and preparing comprehensive engineering reports.
            </p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              By connecting pipeline data, assessments, monitoring, and engineering workflows in one system, Klinthru helps teams maintain organized records, improve visibility, and make more informed pipeline integrity decisions.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Centralized Assesment", "Engineering-focused workflows", "Risk visibility", "AI Prediction"].map((item) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700 dark:text-cyan-300">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Tools for corrosion assessment, monitoring, prediction, and pipeline risk management
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className={`group flex h-full flex-col rounded-[24px] border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel dark:bg-slate-950 ${
                  feature.title === "Sensor Monitoring"
                    ? "border-slate-200 hover:border-cyan-500 dark:border-slate-700"
                    : "border-slate-200 hover:border-slateblue-500 dark:border-slate-700"
                }`}
              >
                <div
                  className={`mb-6 h-1.5 w-12 rounded-full transition group-hover:w-16 ${
                    feature.title === "Sensor Monitoring" ? "bg-cyan-600" : "bg-slateblue-600"
                  }`}
                />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.href ? (
                    <Link
                      href={feature.href}
                      className="rounded-sm outline-none transition hover:text-slateblue-700 focus-visible:text-slateblue-700 focus-visible:ring-4 focus-visible:ring-slateblue-100 dark:hover:text-cyan-300 dark:focus-visible:text-cyan-300"
                    >
                      {feature.title}
                    </Link>
                  ) : (
                    feature.title
                  )}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
            How It Works
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slateblue-500 hover:bg-white"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slateblue-600 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {index === 0
                    ? "Start with the required pipeline and environment inputs."
                    : index === 1
                      ? "Get data from all sensors, including IoT sensors."
                      : index === 2
                        ? "Review the platform risk summary and remaining-life result."
                        : "Open the prepared report view for documentation and review."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact-support" className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.86fr)] lg:px-8">
          <div>
            <h2 className="mt-5 text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl lg:leading-[0.95]">
              Support &amp; Contact
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Tell us what you need and we will get back to you.
            </p>
            <div className="mt-8 space-y-4 text-base leading-7 text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-semibold text-slate-950 dark:text-white">Email:</span>{" "}
                <a className="text-cyan-700 transition hover:text-slateblue-700 dark:text-cyan-300 dark:hover:text-cyan-200" href="mailto:support@klinthru.com">
                  support@klinthru.com
                </a>
              </p>
              <p>
                <span className="font-semibold text-slate-950 dark:text-white">Phone:</span>{" "}
                <a className="text-cyan-700 transition hover:text-slateblue-700 dark:text-cyan-300 dark:hover:text-cyan-200" href="tel:+971543900939">
                  +971 543 900 939
                </a>
              </p>
              <p>
                <span className="font-semibold text-slate-950 dark:text-white">Location:</span>{" "}
                <span>
                  Office no. 6,<br />
                  PO Box 20317,<br />
                  Abu Dhabi, UAE.
                </span>
              </p>
            </div>
          </div>

          <section className="w-full max-w-[560px] justify-self-start rounded-[28px] border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 lg:justify-self-end">
            <form className="grid gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950 sm:p-6" aria-label="Homepage support form">
              <div className="grid gap-4 sm:grid-cols-2">
                {supportFormFields.map((field) => (
                  <label className="block" htmlFor={field.name} key={field.name}>
                    <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                      {field.label}
                    </span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      type={field.type}
                    />
                  </label>
                ))}
              </div>

              <label className="block" htmlFor="support-topic">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                  Topic
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                  id="support-topic"
                  name="support-topic"
                  placeholder="Assessment, monitoring, reporting, support request..."
                  type="text"
                />
              </label>

              <label className="block" htmlFor="support-message">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                  How can we help?
                </span>
                <textarea
                  className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                  id="support-message"
                  name="support-message"
                  placeholder="Describe the issue or question. Include steps, screenshots, or links if helpful."
                />
              </label>

              <button
                className="w-fit rounded-full bg-slateblue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-slateblue-700 hover:shadow-md focus-visible:bg-slateblue-700 focus-visible:ring-4 focus-visible:ring-slateblue-100"
                type="button"
              >
                Send to support
              </button>
            </form>
          </section>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
