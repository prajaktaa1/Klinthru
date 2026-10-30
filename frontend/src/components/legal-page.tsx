import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";

type LegalSection = {
  title: string;
  body: string;
};

type LegalPageProps = {
  activeHref: string;
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const legalNavItems = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Disclaimer", href: "/disclaimer" }
];

export function LegalPage({
  activeHref,
  eyebrow,
  title,
  description,
  lastUpdated,
  sections
}: LegalPageProps) {
  return (
    <main className="public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicNavbar />
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
          <nav
            aria-label="Legal pages"
            className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            {legalNavItems.map((item) => {
              const isActive = item.href === activeHref;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-500/20 ${
                    isActive
                      ? "bg-slateblue-600 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950"
                      : "text-slate-600 hover:bg-white hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-300"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/25">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-7 dark:border-slate-800 dark:bg-slate-900/80 sm:px-9">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">{eyebrow}</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <span className="block font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">Last updated</span>
                  <span className="mt-1 block">{lastUpdated}</span>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-9">
              {sections.map((section, index) => {
                const [number, ...titleParts] = section.title.split(". ");
                const sectionTitle = titleParts.length > 0 ? titleParts.join(". ") : section.title;

                return (
                  <article
                    className={`scroll-mt-28 py-6 sm:py-7 ${index > 0 ? "border-t border-slate-200 dark:border-slate-800" : ""}`}
                    id={`legal-${number}`}
                    key={section.title}
                  >
                    <div className="flex gap-4 sm:gap-5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        {number}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{sectionTitle}</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
