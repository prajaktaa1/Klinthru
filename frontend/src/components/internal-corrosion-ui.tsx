import { type ReactNode } from "react";
import { Panel } from "@/components/ui";

export const unavailableReason = "Verified Internal Corrosion records and approved workflows are not available.";

export function IcUnavailableAction({ children }: { children: ReactNode }) {
  return <button type="button" disabled title={unavailableReason} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700">{children}</button>;
}

export function IcPanel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Panel className={`min-w-0 !p-3 ${className}`}><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>{action}</div>{children}</Panel>;
}

export function IcUnknown({ children = "Not Available" }: { children?: ReactNode }) {
  return <p role="status" className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">{children}</p>;
}

export function IcFields({ fields }: { fields: readonly string[] }) {
  return <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800">{fields.map(field => <div key={field} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 dark:text-slate-400">{field}</dt><dd className="text-right text-slate-600 dark:text-slate-300">Not Available</dd></div>)}</dl>;
}
