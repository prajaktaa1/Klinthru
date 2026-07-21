import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slateblue-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function Panel({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel ${className}`}>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: "blue" | "red" | "amber" | "green";
}) {
  const tones = {
    blue: "from-slateblue-500 to-slateblue-700",
    red: "from-rose-500 to-red-700",
    amber: "from-amber-400 to-orange-600",
    green: "from-emerald-400 to-emerald-600"
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
      <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white ${tones[tone]}`}>
        {label}
      </div>
      <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
