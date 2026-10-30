import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

type CapabilityStatus =
  | "Source-backed"
  | "Data-dependent"
  | "Configuration-dependent"
  | "Foundation";

const statusStyles: Record<CapabilityStatus, string> = {
  "Source-backed":
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Data-dependent":
    "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  "Configuration-dependent":
    "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Foundation:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const capabilityGroups: Array<{
  title: string;
  accent: "teal" | "cyan" | "blue" | "amber" | "slate";
  icon:
    | "corrosion"
    | "inspection"
    | "risk"
    | "sensor"
    | "ai"
    | "integration"
    | "report";
  status: CapabilityStatus;
  description: string;
}> = [
  {
    title: "External Corrosion Assessment",
    accent: "teal",
    icon: "corrosion",
    status: "Source-backed",
    description:
      "Assess external corrosion threats using pipeline, coating, soil, inspection, and integrity data to support engineering review.",
  },
  {
    title: "Internal Corrosion Assessment",
    accent: "teal",
    icon: "corrosion",
    status: "Source-backed",
    description:
      "Evaluate internal corrosion risk using pipeline operating conditions, fluid data, inspection inputs, and corrosion indicators.",
  },
  {
    title: "Sensor Monitoring",
    accent: "cyan",
    icon: "sensor",
    status: "Source-backed",
    description:
      "View registered pipeline sensors and monitor available pressure, temperature, flow, level, and other field measurements.",
  },
  {
    title: "Cathodic Protection Review",
    accent: "blue",
    icon: "inspection",
    status: "Data-dependent",
    description:
      "Review cathodic protection data, CP readings, compliance status, and protection performance for pipeline integrity assessment.",
  },
  {
    title: "Remaining Life Prediction",
    accent: "amber",
    icon: "ai",
    status: "Data-dependent",
    description:
      "Estimate corrosion growth and remaining pipeline life using available integrity data and prediction results.",
  },
  {
    title: "PDF Report Generation",
    accent: "slate",
    icon: "report",
    status: "Source-backed",
    description:
      "Generate structured engineering reports from completed assessments and pipeline integrity results for review and documentation.",
  },
  {
    title: "Pipeline Risk Dashboard",
    accent: "cyan",
    icon: "risk",
    status: "Data-dependent",
    description:
      "View pipeline health, anomalies, corrosion indicators, CP status, risk levels, alerts, and integrity information from one dashboard.",
  },
];

const guardrails = [
  {
    title: "REAL DATA",
    detail:
      "Uses persisted records, selected-pipeline APIs, configured connector records, readiness APIs, and saved calculations.",
  },
  {
    title: "DEMO PREVIEW",
    detail:
      "Shows clearly labelled sample screens where a module needs visual preview data.",
  },
  {
    title: "REFERENCE ONLY",
    detail:
      "Explains protocol, engineering, or model requirements without implying that a live source is connected.",
  },
  {
    title: "NOT AVAILABLE",
    detail:
      "Unsupported or missing source data is shown as blocked, unavailable, or not configured instead of being invented.",
  },
];

const workflow = [
  "Select pipeline",
  "Load source records",
  "Review module readiness",
  "Assess integrity evidence",
  "Generate supported reports",
];

function FeatureGlyph({
  icon,
}: {
  icon: (typeof capabilityGroups)[number]["icon"];
}) {
  const shared =
    "h-5 w-5 transition-transform duration-300 group-hover:scale-110";

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-700 shadow-sm shadow-cyan-500/10 dark:text-cyan-200">
      <svg
        aria-hidden="true"
        className={shared}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        {icon === "corrosion" ? (
          <>
            <path d="M4 15c3-6 13-6 16 0" />
            <path d="M7 15l1.5 4" />
            <path d="M12 13l.5 5" />
            <path d="M17 15l-1.5 4" />
            <path d="M7 7h10" />
          </>
        ) : null}
        {icon === "inspection" ? (
          <>
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l4 4" />
            <path d="M8 11h6" />
          </>
        ) : null}
        {icon === "risk" ? (
          <>
            <path d="M12 3l9 16H3z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </>
        ) : null}
        {icon === "sensor" ? (
          <>
            <path d="M3 12h4l2-6 4 12 2-6h6" />
            <circle cx="19" cy="12" r="2" />
          </>
        ) : null}
        {icon === "ai" ? (
          <>
            <path d="M12 3a7 7 0 1 0 7 7" />
            <path d="M19 3v5h-5" />
            <path d="M8 14l2-4 3 3 3-6" />
          </>
        ) : null}
        {icon === "integration" ? (
          <>
            <circle cx="5" cy="7" r="2" />
            <circle cx="19" cy="7" r="2" />
            <circle cx="12" cy="17" r="2" />
            <path d="M7 8l4 7" />
            <path d="M17 8l-4 7" />
          </>
        ) : null}
        {icon === "report" ? (
          <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function FeatureShowcaseCard({
  feature,
}: {
  feature: (typeof capabilityGroups)[number];
}) {
  const accentClasses = {
    teal: "hover:border-teal-400/70 dark:hover:border-teal-400/60",
    cyan: "hover:border-cyan-400/70 dark:hover:border-cyan-400/60",
    blue: "hover:border-blue-400/70 dark:hover:border-blue-400/60",
    amber: "hover:border-amber-400/70 dark:hover:border-amber-400/60",
    slate: "hover:border-slate-400/70 dark:hover:border-slate-400/60",
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-panel dark:border-slate-700 dark:bg-slate-900 ${accentClasses[feature.accent]}`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition duration-300 group-hover:bg-cyan-400/20" />
      <div className="relative flex items-start justify-between gap-4">
        <FeatureGlyph icon={feature.icon} />
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyles[feature.status]}`}
        >
          {feature.status}
        </span>
      </div>
      <div className="relative mt-6">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {feature.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {feature.description}
        </p>
      </div>
    </article>
  );
}

export default function FeaturesPage() {
  return (
    <main className="public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950">
      <PublicNavbar />

      <section className="overflow-hidden border-b border-slate-200 bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.16),transparent_34%)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              Features
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]">
              Verified pipeline integrity capabilities, clearly bounded.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Klinthru combines source-backed assessment workflows,
              selected-pipeline readiness checks, monitoring records,
              integration status, AI readiness, reports, and document handling
              without presenting demo or reference data as real operational
              output.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slateblue-700">
                Capability model
              </p>
              <div className="mt-5 grid gap-3">
                {guardrails.map((item) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                    key={item.title}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Tools for corrosion assessment, monitoring, prediction, and
              pipeline risk management
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              Verified Klinthru features grouped into practical engineering
              areas, with demo, foundation, and configuration-dependent
              capabilities kept clearly bounded.
            </p>
          </div>

          <article className="mt-10 overflow-hidden rounded-[32px] border border-cyan-500/20 bg-slate-950 text-white shadow-panel">
            <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_38%)] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Platform Focus
                </p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  One workspace for source-backed integrity review.
                </h3>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Klinthru connects pipeline records, assessments, CP evidence,
                  ILI readiness, risk context, reports, and configured data
                  sources while making unavailable or demo-only areas explicit.
                </p>
              </div>
              <div className="grid content-center gap-3 sm:grid-cols-2">
                {[
                  "Source records",
                  "Readiness states",
                  "Demo separation",
                  "Traceable reports",
                ].map((item) => (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilityGroups.map((feature) => (
              <FeatureShowcaseCard feature={feature} key={feature.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Features are organized around selected-pipeline evidence.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
              The application favors traceable source records and explicit
              unavailable states over hidden assumptions or duplicated
              calculations.
            </p>
          </div>
          <div className="grid gap-3">
            {workflow.map((step, index) => (
              <div
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                key={step}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slateblue-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
              Capability Boundaries
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              What this page does not claim.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "No fake live telemetry or SCADA connectivity claim.",
              "No claim that OPC-UA, Modbus, MQTT, REST, SQL, or webhooks are connected unless records are configured.",
              "No autonomous AI prediction or model-performance claim without readiness and source data.",
              "No invented customers, certifications, partnerships, deployment counts, or pipeline statistics.",
            ].map((item) => (
              <div
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
