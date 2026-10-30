"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PipelineSelector } from "@/components/pipeline-selector";
import { Panel } from "@/components/ui";
import { fetchAssessments, fetchPipelineById } from "@/lib/apiClient";
import { PipelineRecord, StoredAssessment } from "@/lib/types";

type SummaryCardProps = {
  label: string;
  accentClass: string;
  description: string;
  value: string | number;
};

function SummaryCard({ label, accentClass, description, value }: SummaryCardProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white ${accentClass}`}
      >
        {label}
      </span>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div
      className={`flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 ${className}`}
    >
      <p className="max-w-sm">{message}</p>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function getAssessmentDate(assessment: StoredAssessment) {
  return assessment.inspectionDate?.trim() || assessment.createdAt;
}

function getAssessmentSortTime(assessment: StoredAssessment) {
  const time = new Date(getAssessmentDate(assessment)).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatAssessmentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function hasStoredRiskScore(assessment: StoredAssessment) {
  return typeof assessment.riskScore === "number" && Number.isFinite(assessment.riskScore);
}

export function RiskAssessmentRealView() {
  const router = useRouter();
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  useEffect(() => {
    const requestedPipelineId = new URLSearchParams(window.location.search).get("pipelineId");
    if (!requestedPipelineId) return;
    let isCurrent = true;
    void fetchPipelineById(requestedPipelineId)
      .then((pipeline) => { if (isCurrent) setSelectedPipeline(pipeline); })
      .catch(() => { if (isCurrent) setAssessmentError("The pipeline requested in the URL could not be loaded."); });
    return () => { isCurrent = false; };
  }, []);

  function selectPipeline(pipeline: PipelineRecord | null) {
    setSelectedPipeline(pipeline);
    const params = new URLSearchParams(window.location.search);
    if (pipeline) params.set("pipelineId", pipeline.id); else params.delete("pipelineId");
    router.replace(`/risk-assessment${params.size ? `?${params.toString()}` : ""}`);
  }

  useEffect(() => {
    if (!selectedPipeline) {
      setAssessments([]);
      setAssessmentError(null);
      setIsLoadingAssessments(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingAssessments(true);
    setAssessmentError(null);

    void fetchAssessments()
      .then((records) => {
        if (isCurrent) {
          setAssessments(records.filter((assessment) => assessment.pipelineId === selectedPipeline.id));
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAssessments([]);
          setAssessmentError("Assessment history could not be loaded.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingAssessments(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedPipeline]);

  const orderedAssessments = [...assessments].sort(
    (left, right) => getAssessmentSortTime(right) - getAssessmentSortTime(left)
  );
  const twelveMonthCutoff = new Date();
  twelveMonthCutoff.setMonth(twelveMonthCutoff.getMonth() - 12);
  const twelveMonthAssessments = orderedAssessments
    .filter((assessment) => hasStoredRiskScore(assessment) && getAssessmentSortTime(assessment) >= twelveMonthCutoff.getTime())
    .reverse();
  const latestAssessmentWithScore = orderedAssessments.find(hasStoredRiskScore);
  const highRiskCount = assessments.filter((assessment) => assessment.riskLevel === "High").length;
  const mediumRiskCount = assessments.filter((assessment) => assessment.riskLevel === "Medium").length;
  const lowRiskCount = assessments.filter((assessment) => assessment.riskLevel === "Low").length;
  const hasSelectedPipeline = Boolean(selectedPipeline);
  const hasAssessmentData = assessments.length > 0;
  const isSummaryLoading = hasSelectedPipeline && isLoadingAssessments;
  const unavailableSummaryValue = isSummaryLoading
    ? "Loading..."
    : assessmentError
      ? "Unavailable"
      : hasSelectedPipeline
        ? hasAssessmentData
          ? "Not available"
          : "No data"
        : "Select a pipeline";
  const getAssessmentCountValue = (count: number) => {
    if (isSummaryLoading) {
      return "Loading...";
    }

    if (assessmentError) {
      return "Unavailable";
    }

    return hasSelectedPipeline ? count : "Select a pipeline";
  };

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 pb-4">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slateblue-600">Pipeline Integrity</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Risk Assessment</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>ISO 31000 risk management view</span>
            <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
            <span>Segment-level calculations are not connected yet</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-400 shadow-sm disabled:cursor-not-allowed"
            disabled
            type="button"
          >
            Export PDF
          </button>
          <button
            className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white opacity-50 disabled:cursor-not-allowed"
            disabled
            type="button"
          >
            Re-score All Segments
          </button>
        </div>
      </header>

      <Panel className="p-5 sm:p-6">
        <SectionHeading
          description="Load a saved pipeline to review its persisted assessment-level risk history."
          title="Pipeline Selection"
        />
        <div className="mt-5">
          <PipelineSelector
            mode="select-only"
            onClear={() => selectPipeline(null)}
            onSelect={(pipeline) => selectPipeline(pipeline)}
            selectedPipeline={selectedPipeline}
          />
        </div>
      </Panel>

      {assessmentError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium leading-6 text-red-800">
          {assessmentError}
        </div>
      ) : null}

      <section aria-label="Risk assessment summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          accentClass="bg-gradient-to-r from-slateblue-500 to-slateblue-700"
          description={
            latestAssessmentWithScore
              ? `Latest stored assessment score from ${formatAssessmentDate(getAssessmentDate(latestAssessmentWithScore))}.`
              : "No stored assessment score is available for this pipeline."
          }
          label="Pipeline Risk Score"
          value={latestAssessmentWithScore ? latestAssessmentWithScore.riskScore : unavailableSummaryValue}
        />
        <SummaryCard
          accentClass="bg-gradient-to-r from-rose-500 to-red-700"
          description="The current assessment taxonomy does not support Very High risk."
          label="Very High Risk Segments"
          value="Not supported"
        />
        <SummaryCard
          accentClass="bg-gradient-to-r from-red-400 to-orange-600"
          description={hasSelectedPipeline ? "Stored assessments with a High risk level." : "Select a pipeline to load assessment counts."}
          label="High Risk Assessments"
          value={getAssessmentCountValue(highRiskCount)}
        />
        <SummaryCard
          accentClass="bg-gradient-to-r from-amber-400 to-orange-500"
          description={hasSelectedPipeline ? "Stored assessments with a Medium risk level." : "Select a pipeline to load assessment counts."}
          label="Medium Risk Assessments"
          value={getAssessmentCountValue(mediumRiskCount)}
        />
        <SummaryCard
          accentClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
          description={
            hasSelectedPipeline
              ? "Low count uses the supported taxonomy; Very Low is not available."
              : "Select a pipeline to load assessment counts."
          }
          label="Low Risk Assessments"
          value={getAssessmentCountValue(lowRiskCount)}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_1fr]">
        <Panel className="p-5 sm:p-6">
          <SectionHeading
            description="Probability and consequence placement will appear after approved scoring is available."
            title="5×5 Risk Matrix - ISO 31000"
          />
          <EmptyState className="mt-4 min-h-[240px]" message="Risk calculation data not available yet" />
        </Panel>
        <Panel className="p-5 sm:p-6">
          <SectionHeading
            description="KP-based risk visualization requires a canonical pipeline segment model."
            title="Segment Risk Map"
          />
          <EmptyState className="mt-4 min-h-[240px]" message="Requires segment-level risk backend" />
        </Panel>
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="p-5 sm:p-6">
          <SectionHeading
            description="A segment register will list approved PoF, CoF, and risk results once the backend is available."
            title="Segment Risk Register - ISO 31000 Scoring"
          />
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-6 dark:border-slate-700 dark:bg-slate-950 sm:px-6">
          <EmptyState message="Requires segment-level risk backend" />
        </div>
      </Panel>

      <section className="grid gap-6 2xl:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <SectionHeading
            description="Consequence-of-failure factors will be shown when an approved factor model is connected."
            title="CoF Factor Breakdown"
          />
          <EmptyState className="mt-5" message="Risk calculation data not available yet" />
        </Panel>
        <Panel className="p-5 sm:p-6">
          <SectionHeading
            description="This view will explain the approved calculation inputs and result traceability."
            title="Risk Calculation Engine"
          />
          <EmptyState className="mt-5" message="Risk calculation data not available yet" />
        </Panel>
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="p-5 sm:p-6">
          <SectionHeading
            description="Actions will be sourced from an approved mitigation register, not inferred from assessment results."
            title="Mitigation Action Register"
          />
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-6 dark:border-slate-700 dark:bg-slate-950 sm:px-6">
          <EmptyState message="Requires mitigation action backend" />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHeading
          description="Persisted assessment scores from the last 12 months, using inspection date when available and creation date otherwise."
          title="12-Month Risk Score Trend"
        />
        {!selectedPipeline ? (
          <EmptyState className="mt-4 min-h-[220px]" message="Select a pipeline to view assessment history" />
        ) : isLoadingAssessments ? (
          <EmptyState className="mt-4 min-h-[220px]" message="Loading stored assessment history..." />
        ) : assessmentError ? (
          <EmptyState className="mt-4 min-h-[220px]" message="Assessment history could not be loaded." />
        ) : twelveMonthAssessments.length === 0 ? (
          <EmptyState className="mt-4 min-h-[220px]" message="No scored assessments are available within the last 12 months." />
        ) : (
          <RealRiskTrend assessments={twelveMonthAssessments} />
        )}
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHeading
          description="All stored assessment records, ordered by inspection date when available, otherwise creation date."
          title="Pipeline Risk Score History"
        />
        {!selectedPipeline ? (
          <EmptyState className="mt-4 min-h-[180px]" message="Select a pipeline to view assessment history" />
        ) : isLoadingAssessments ? (
          <EmptyState className="mt-4 min-h-[180px]" message="Loading stored assessment history..." />
        ) : assessmentError ? (
          <EmptyState className="mt-4 min-h-[180px]" message="Assessment history could not be loaded." />
        ) : orderedAssessments.length === 0 ? (
          <EmptyState className="mt-4 min-h-[180px]" message="No stored assessments are available for the selected pipeline." />
        ) : (
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Risk Score</th>
                    <th className="px-4 py-3 font-medium">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderedAssessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td className="px-4 py-4 text-slate-600">
                        <p>{formatAssessmentDate(getAssessmentDate(assessment))}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {assessment.inspectionDate?.trim() ? "Inspection date" : "Created date"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {hasStoredRiskScore(assessment) ? assessment.riskScore : "Not available"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{assessment.riskLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function RealRiskTrend({ assessments }: { assessments: StoredAssessment[] }) {
  const width=900,height=260,left=48,right=24,top=22,bottom=46;
  const values=assessments.map((assessment)=>assessment.riskScore);
  const min=Math.max(0,Math.min(...values)-5),max=Math.min(100,Math.max(...values)+5);
  const x=(index:number)=>assessments.length===1?(left+width-right)/2:left+index*((width-left-right)/(assessments.length-1));
  const y=(value:number)=>top+(max-value)*((height-top-bottom)/Math.max(1,max-min));
  return <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[680px]" role="img" aria-label="Real 12-month pipeline risk score trend"><polygon points={`${left},${height-bottom} ${assessments.map((assessment,index)=>`${x(index)},${y(assessment.riskScore)}`).join(" ")} ${width-right},${height-bottom}`} className="fill-cyan-500/10"/><polyline points={assessments.map((assessment,index)=>`${x(index)},${y(assessment.riskScore)}`).join(" ")} fill="none" className="stroke-cyan-600 dark:stroke-cyan-300" strokeWidth="3"/>{assessments.map((assessment,index)=><g key={assessment.id}><circle cx={x(index)} cy={y(assessment.riskScore)} r="5" className="fill-cyan-600 stroke-white dark:fill-cyan-300 dark:stroke-slate-900" strokeWidth="3"><title>{`${formatAssessmentDate(getAssessmentDate(assessment))}: ${assessment.riskScore} (${assessment.type})`}</title></circle><text x={x(index)} y={height-18} textAnchor="middle" className="fill-slate-500 text-[10px]">{new Date(getAssessmentDate(assessment)).toLocaleDateString("en-US",{month:"short",year:"2-digit"})}</text></g>)}</svg><div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500"><span>{assessments.length} persisted assessment{assessments.length===1?"":"s"}</span><span>Actual inspection/creation timestamps</span><span>External and internal assessments retain their stored scores</span></div></div>;
}
