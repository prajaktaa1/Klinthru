"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui";
import { PipelineSelector } from "@/components/pipeline-selector";
import { RiskAssessmentRealView } from "@/components/risk-assessment-real-view";
import { RiskAssessmentOverview } from "@/components/risk-assessment-overview";
import { RiskTreatmentWorkspace } from "@/components/risk-treatment-workspace";
import { RiskRelatedWorkspace } from "@/components/risk-related-workspace";
import { RiskConfigurationWorkspace } from "@/components/risk-configuration-workspace";
import { RiskReportsWorkspace } from "@/components/risk-reports-workspace";
import { RiskHistoryWorkspace } from "@/components/risk-history-workspace";
import { RiskRegisterWorkspace } from "@/components/risk-register-workspace";
import { RiskDriversWorkspace } from "@/components/risk-drivers-workspace";
import { RiskMatrixWorkspace } from "@/components/risk-matrix-workspace";
import { RiskAssessmentDetailWorkspace } from "@/components/risk-assessment-detail-workspace";
import { fetchOfficialRiskMethodologies, fetchOfficialRiskOverview, fetchPipelineById } from "@/lib/apiClient";
import { riskTabs, type RiskMethodologyOption, type RiskOverview, type RiskTab } from "@/lib/risk-assessment-types";
import type { PipelineRecord } from "@/lib/types";

export function RiskAssessmentOfficialWorkspace() {
  const router = useRouter();
  const [tab, setTab] = useState<RiskTab>("Overview");
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [methodologies, setMethodologies] = useState<RiskMethodologyOption[]>([]);
  const [methodologyId, setMethodologyId] = useState("");
  const [methodologyReason, setMethodologyReason] = useState<string | null>(null);
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("riskTab");
    if (riskTabs.includes(requestedTab as RiskTab)) setTab(requestedTab as RiskTab);
    setMethodologyId(params.get("riskMethodologyVersionId") ?? "");
    const pipelineId = params.get("pipelineId");
    if (!pipelineId) setReady(true);
    else void fetchPipelineById(pipelineId).then(value => { if (current) { setPipeline(value); setReady(true); } })
      .catch(() => { if (current) { setScopeError("The pipeline in this URL is unavailable. Select an accessible pipeline or explicitly clear the scope."); setReady(true); } });
    void fetchOfficialRiskMethodologies().then(result => {
      if (current) { setMethodologies(result.items); setMethodologyReason(result.reason ?? (result.items.length ? null : "APPROVAL NEEDED — no approved risk methodology is available.")); }
    }).catch(() => { if (current) setMethodologyReason("Approved methodologies could not be loaded. No defaults are substituted."); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!ready || scopeError) { setLoading(false); setOverview(null); return; }
    let current = true;
    setLoading(true); setOverview(null); setReadError(null);
    void fetchOfficialRiskOverview({ pipelineId: pipeline?.id, methodologyVersionId: methodologyId || undefined })
      .then(value => { if (current) setOverview(value); })
      .catch(() => { if (current) setReadError("Official risk data could not be loaded. No corrosion assessment counts are substituted."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [ready, pipeline?.id, methodologyId, scopeError]);

  function replaceQuery(key: string, value: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`/risk-assessment${params.size ? `?${params.toString()}` : ""}`);
  }
  function chooseTab(value: RiskTab) { setTab(value); replaceQuery("riskTab", value === "Overview" ? null : value); }
  function choosePipeline(value: PipelineRecord | null) { setPipeline(value); setScopeError(null); setReady(true); replaceQuery("pipelineId", value?.id ?? null); }

  return <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 pb-4">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
      <div><h2 className="text-3xl font-semibold tracking-tight text-slate-900">Risk Assessment</h2></div>
      <div className="flex gap-3"><button type="button" disabled title="APPROVAL NEEDED — Reports & Analytics official-risk export contract" className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-400 disabled:cursor-not-allowed">Export</button>
        <button type="button" disabled title="APPROVAL NEEDED — Risk_ID allocation, deduplication policy, approval roles and database safeguards" className="rounded-full bg-slateblue-600 px-5 py-3 text-sm text-white opacity-50 disabled:cursor-not-allowed">+ New Risk Assessment</button></div>
    </header>
    <Panel><h3 className="text-lg font-semibold">Scope and approved methodology</h3><div className="mt-4"><PipelineSelector mode="select-only" selectedPipeline={pipeline} onSelect={choosePipeline} onClear={() => choosePipeline(null)} /></div>
      <p className="mt-2 text-sm text-slate-500">{pipeline ? `Pipeline: ${pipeline.pipelineName} (${pipeline.pipelineCode})` : "All accessible pipelines; no corrosion assessment counts are included."}</p>
      <label className="mt-4 block text-sm font-medium">Methodology version<select className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900" value={methodologyId} onChange={event => { setMethodologyId(event.target.value); replaceQuery("riskMethodologyVersionId", event.target.value || null); }}>
        <option value="">Select an approved methodology</option>{methodologyId && !methodologies.some(method => method.id === methodologyId) ? <option value={methodologyId}>Requested version — verification pending</option> : null}
        {methodologies.map(method => <option key={method.id} value={method.id}>{method.name} · {method.version}</option>)}
      </select></label>{methodologyReason ? <p className="mt-2 text-sm text-amber-700">{methodologyReason}</p> : null}
    </Panel>
    <nav aria-label="Risk Assessment tabs" className="flex flex-wrap gap-2" role="tablist">{riskTabs.map(value => <button key={value} id={`risk-tab-${riskTabs.indexOf(value)}`} type="button" role="tab" aria-controls="risk-tab-panel" aria-selected={tab === value} onClick={() => chooseTab(value)} className={`rounded-xl border px-4 py-3 text-sm ${tab === value ? "border-slateblue-600 bg-slateblue-50 font-semibold text-slateblue-700" : "border-slate-200 bg-white text-slate-600"}`}>{value}</button>)}</nav>
    <div id="risk-tab-panel" role="tabpanel" aria-labelledby={`risk-tab-${riskTabs.indexOf(tab)}`}>
      {tab === "Overview" ? <RiskAssessmentOverview data={overview} loading={loading || !ready} error={scopeError ?? readError} onTab={chooseTab} /> : tab === "Mitigation & ALARP" ? <RiskTreatmentWorkspace pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} riskOverview={scopeError ? null : overview} /> : tab === "Related Data" ? <RiskRelatedWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} riskOverview={scopeError ? null : overview} /> : tab === "Risk Assessment" ? <RiskAssessmentDetailWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} riskOverview={scopeError ? null : overview} /> : tab === "Risk Matrix" ? <RiskMatrixWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} pipelineLabel={pipeline ? `${pipeline.pipelineName} (${pipeline.pipelineCode})` : "All accessible pipelines"} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} /> : tab === "Configuration" ? <RiskConfigurationWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} riskOverview={scopeError || loading ? null : overview} /> : tab === "Risk Drivers" ? <RiskDriversWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} /> : tab === "Risk Register" ? <RiskRegisterWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} /> : tab === "Trends & Historical" ? <RiskHistoryWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} /> : <RiskReportsWorkspace key={`${pipeline?.id ?? "all"}:${methodologyId}`} pipelineId={pipeline?.id} methodologyVersionId={methodologyId || undefined} scopeReady={ready && !scopeError} scopeError={scopeError} />}
    </div>
    <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Existing corrosion assessment history — authoritative source records</summary>
      <p className="my-4 text-sm text-slate-500">These existing assessment counts and scores retain their corrosion meaning. They are separate from official Risk_ID records.</p><RiskAssessmentRealView />
    </details>
  </div>;
}
