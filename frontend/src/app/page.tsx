import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";

const features = [
  {
    title: "External Corrosion Assessment",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  },
  {
    title: "Internal Corrosion Assessment",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  },
  {
    title: "Sensor Monitoring",
    description:
      "Monitor flow, level, pressure, temperature, and discharge sensor status from one dashboard.",
    href: "/sensors"
  },
  {
    title: "Cathodic Protection Review",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  },
  {
    title: "Remaining Life Prediction",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  },
  {
    title: "PDF Report Generation",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  },
  {
    title: "Pipeline Risk Dashboard",
    description:
      "Structured workflows for engineering teams to capture inputs, assess risk, and prepare review-ready outputs."
  }
];

const steps = [
  "Enter input data.",
  "Fetch sensor data",
  "Run corrosion assessment.",
  "Generate report"
];

const workspaceModules = [
  { label: "External", value: "Assessment", href: "/external-corrosion-assessment" },
  { label: "Internal", value: "Assessment", href: "/internal-corrosion-assessment" },
  { label: "Reports", value: "Generation", href: "/report" },
  { label: "Sensors", value: "Monitoring", href: "/sensors" }
];

const scopeItems = [
  "Manual and sensor-based data entry",
  "Operational engineering calculations",
  "IoT sensor connected",
  "AI digital twin"
];

function getScopeIndicatorClasses(item: string) {
  if (item === "Manual and sensor-based data entry") {
    return "bg-[#16A34A]";
  }

  if (item === "IoT sensor connected") {
    return "bg-[#2563EB]";
  }

  return "bg-amber-500";
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F3F7FC] text-[#0F172A]">
      <header className="sticky top-0 z-20 border-b border-[#D8E2F0] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="rounded-sm text-xl font-semibold tracking-tight text-[#0B1739] outline-none transition hover:text-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Klinthru
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#475569] md:flex">
            <a
              className="rounded-full px-1 py-1 outline-none transition hover:text-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
              href="#features"
            >
              Features
            </a>
            <a
              className="rounded-full px-1 py-1 outline-none transition hover:text-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
              href="#how-it-works"
            >
              How It Works
            </a>
            <a
              className="rounded-full px-1 py-1 outline-none transition hover:text-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
              href="#modules"
            >
              Modules
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#1D4ED8] hover:shadow-md focus-visible:bg-[#1D4ED8] focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="overflow-hidden border-b border-[#D8E2F0] bg-[#F3F7FC] bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.09),transparent_34%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:gap-12 lg:px-8 lg:py-24">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1D4ED8]">
              Pipeline Integrity SaaS
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl lg:leading-[1.02]">
              Klinthru Pipeline Integrity Platform
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#475569] sm:text-lg">
              Corrosion prediction, pipeline risk assessment, and engineering report generation for external and internal pipeline corrosion.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#1D4ED8] hover:shadow-md focus-visible:bg-[#1D4ED8] focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                Login
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-[#D8E2F0] bg-white px-6 py-3 text-sm font-semibold text-[#0B1739] shadow-sm outline-none transition hover:border-[#2563EB] hover:text-[#2563EB] hover:shadow-md focus-visible:border-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                View Features
              </a>
            </div>
          </div>

          <div className="relative min-h-[320px] w-full max-w-[680px] justify-self-end overflow-hidden rounded-[32px] border border-[#14264F] bg-[#0B1739] p-5 shadow-panel lg:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(37,99,235,0.18),transparent_30%),linear-gradient(135deg,#0B1739,#14264F)]" />
            <div className="absolute inset-[1px] rounded-[31px] border border-white/5" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6E6FF]">
                    Integrity Workspace
                  </p>
                  <span className="rounded-full bg-[#2563EB]/20 px-3 py-1 text-xs font-semibold text-[#D6E6FF]">
                    Phase 1
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {workspaceModules.map((module) => (
                    <Link
                      key={module.label}
                      href={module.href}
                      className={`group rounded-[22px] border bg-white/[0.05] p-4 outline-none transition hover:bg-white/[0.08] hover:shadow-[0_12px_30px_rgba(11,23,57,0.24)] focus-visible:bg-white/[0.08] focus-visible:ring-4 ${
                        module.label === "Sensors"
                          ? "border-[#0891B2]/35 hover:border-[#0891B2]/60 focus-visible:border-[#0891B2]/60 focus-visible:ring-cyan-100/20"
                          : "border-white/10 hover:border-[#2563EB]/35 focus-visible:border-[#2563EB]/35 focus-visible:ring-blue-100/20"
                      }`}
                    >
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition group-hover:text-[#D6E6FF]">
                        {module.label === "Sensors" ? (
                          <span className="h-2 w-2 rounded-full bg-[#0891B2]" />
                        ) : null}
                        {module.label}
                      </p>
                      <p className="mt-3 text-[1.15rem] font-semibold leading-tight text-white sm:text-[1.3rem]">
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
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[13px] font-medium text-slate-200 sm:text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1D4ED8]">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A]">
            Tools for corrosion screening and pipeline risk review
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`group flex h-full flex-col rounded-[24px] border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel ${
                feature.title === "Sensor Monitoring"
                  ? "border-[#D8E2F0] hover:border-[#0891B2]"
                  : "border-[#D8E2F0] hover:border-[#2563EB]"
              }`}
            >
              <div
                className={`mb-6 h-1.5 w-12 rounded-full transition group-hover:w-16 ${
                  feature.title === "Sensor Monitoring" ? "bg-[#0891B2]" : "bg-[#2563EB]"
                }`}
              />
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {feature.href ? (
                  <Link
                    href={feature.href}
                    className="rounded-sm outline-none transition hover:text-[#2563EB] focus-visible:text-[#2563EB] focus-visible:ring-4 focus-visible:ring-blue-100"
                  >
                    {feature.title}
                  </Link>
                ) : (
                  feature.title
                )}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#475569]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#D8E2F0] bg-[#F3F7FC]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1D4ED8]">
            How It Works
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[24px] border border-[#D8E2F0] bg-white p-5 shadow-sm transition hover:border-[#2563EB] hover:bg-white"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-[#475569]">
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

      <section className="bg-[#F3F7FC]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1D4ED8]">
              Phase 1 Scope
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A]">
              Connected foundation for engineering assessment and intelligent pipeline monitoring
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {scopeItems.map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-[#D8E2F0] bg-white px-5 py-4 text-sm font-medium text-[#475569] shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${getScopeIndicatorClasses(item)}`} />
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
