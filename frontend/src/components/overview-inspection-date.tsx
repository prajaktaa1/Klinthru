"use client";
import { watchMapDataChanged } from "@/lib/map-sync";
import { useEffect, useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { fetchCpMonitoringData, fetchIliRuns, fetchInspectionRecords, fetchPipelineHistory } from "@/lib/apiClient";
import { isSampleInspection, inspectionDate, inspectionRows, inspectionUnavailable } from "@/lib/inspection-history-data";

/** Use the same saved sources as Inspection History; never substitute createdAt. */
export function OverviewInspectionDate({ pipelineId }: { pipelineId: string }) {
  const [refresh, setRefresh] = useState(0);
  useEffect(() => watchMapDataChanged(() => setRefresh(value => value + 1)), []);
  const [snapshot, setSnapshot] = useState<{ pipelineId: string; date?: string; partial: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    setSnapshot(null);
    void Promise.allSettled([fetchPipelineHistory(pipelineId), fetchInspectionRecords(pipelineId), fetchIliRuns(pipelineId), fetchCpMonitoringData(pipelineId)]).then(([history, manual, ili, cp]) => {
      if (!active) return;
      const rows = inspectionRows(pipelineId, history.status === "fulfilled" ? history.value : null, ili.status === "fulfilled" ? ili.value : null, cp.status === "fulfilled" ? cp.value : null);
      const dates = [...rows.map(row => row.date), ...(manual.status === "fulfilled" ? manual.value.filter(row => row.pipelineId === pipelineId && row.status === "Completed" && !isSampleInspection(row)).map(row => row.date) : [])]
        .map(date => inspectionDate(date)).filter(date => date !== inspectionUnavailable).sort();
      const partial = history.status !== "fulfilled" || manual.status !== "fulfilled" || ili.status !== "fulfilled" || ili.value.status !== "available" || cp.status !== "fulfilled" || !cp.value.availability?.surveys?.available;
      setSnapshot({ pipelineId, date: dates.at(-1), partial });
    });
    return () => { active = false; };
  }, [pipelineId, refresh]);
  const current = snapshot?.pipelineId === pipelineId ? snapshot : null;
  return <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
    <span className="text-slateblue-600"><Activity size={23} /></span>
    <div className="min-w-0"><p className="text-xs text-slate-500">Latest Inspection Date</p><p className="truncate text-lg font-semibold text-slate-900">{current?.date ?? "UNKNOWN"}</p><p className="truncate text-xs text-slate-500">{!current ? "Loading saved inspection history" : current.date ? `Latest saved inspection date${current.partial ? " (partial history)" : ""}` : current.partial ? "Inspection history partially unavailable" : "No dated saved inspections"}</p></div>
    <ChevronRight className="ml-auto shrink-0 text-slate-400" size={16} />
  </div>;
}
