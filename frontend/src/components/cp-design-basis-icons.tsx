import { SVGProps } from "react";

type BasisIconName = "document" | "pdf" | "database" | "check" | "clock" | "search" | "filter" | "export";

/** Presentation only; never infers a record's lifecycle, file type or approval. */
export function BasisIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: BasisIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" data-basis-icon={name} aria-hidden="true" focusable="false" {...props}>
    {name === "document" || name === "pdf" ? <><path d="M5 2h9l5 5v15H5z" fill="currentColor" stroke="none" /><path d="M14 2v6h5M8 11h8M8 15h8M8 19h6" stroke="white" />{name === "pdf" ? <path d="m8 17 3-7 3 7-6-2 8-1" stroke="white" strokeWidth={1} /> : null}</> : null}
    {name === "database" ? <><ellipse cx={12} cy={5} rx={8} ry={3} fill="currentColor" /><path d="M4 5v14c0 4 16 4 16 0V5" fill="currentColor" /><path d="M4 10c0 4 16 4 16 0M4 15c0 4 16 4 16 0" stroke="white" /><ellipse cx={12} cy={5} rx={8} ry={3} stroke="white" /></> : null}
    {name === "check" ? <><circle cx={12} cy={12} r={11} fill="currentColor" stroke="none" /><path d="m6 12 4 4 8-8" stroke="white" strokeWidth={2.5} /></> : null}
    {name === "clock" ? <><circle cx={12} cy={12} r={11} fill="currentColor" stroke="none" /><path d="M12 6v7l4 2" stroke="white" strokeWidth={2} /></> : null}
    {name === "search" ? <><circle cx={10} cy={10} r={6} /><path d="m15 15 6 6" /></> : null}
    {name === "filter" ? <><path d="M3 4h18l-7 8v8l-4-2v-6zM5 7h14" /><path d="M7 2v5M17 2v5" /></> : null}
    {name === "export" ? <><path d="M12 3v11m-4-7 4-4 4 4M7 10H4v11h16V10h-3M8 17h8" /></> : null}
  </svg>;
}

export function BasisSourceIcon({ index, fileName }: { index: number; fileName: string }) {
  return <BasisIcon name={index === 0 && /\.pdf$/i.test(fileName) ? "pdf" : "document"} className={`h-4 w-4 shrink-0 ${index === 0 ? "text-red-500" : "text-blue-600"}`} />;
}
