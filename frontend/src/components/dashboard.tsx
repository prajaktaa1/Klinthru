"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchAssessments, isUnauthorizedError } from "@/lib/apiClient";
import { Panel, StatCard } from "@/components/ui";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import { clearDemoFallbackData, loadAssessments, replaceAssessmentsCache } from "@/lib/storage";
import { StoredAssessment } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function DashboardView() {
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadAssessmentData() {
      clearDemoFallbackData();

      try {
        const backendAssessments = await fetchAssessments();

        if (!isMounted) {
          return;
        }

        setAssessments(backendAssessments);
        replaceAssessmentsCache(backendAssessments);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        const fallback = loadAssessments();
        setAssessments(fallback);
      }
    }

    void loadAssessmentData();

    return () => {
      isMounted = false;
    };
  }, []);

  const highRisk = assessments.filter((item) => item.riskLevel === "High").length;
  const mediumRisk = assessments.filter((item) => item.riskLevel === "Medium").length;
  const lowRisk = assessments.filter((item) => item.riskLevel === "Low").length;

  const chartData = [
    { label: "High", value: highRisk, color: "bg-red-500" },
    { label: "Medium", value: mediumRisk, color: "bg-amber-500" },
    { label: "Low", value: lowRisk, color: "bg-emerald-500" }
  ];

  const total = Math.max(assessments.length, 1);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 lg:min-h-[calc(100vh-6rem)]">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Total Assessments" value={assessments.length} tone="blue" />
        <StatCard label="High Risk" value={highRisk} tone="red" />
        <StatCard label="Medium Risk" value={mediumRisk} tone="amber" />
        <StatCard label="Low Risk" value={lowRisk} tone="green" />
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[1.85fr_1fr] lg:items-stretch">
        <Panel className="flex h-full min-h-[420px] flex-col lg:min-h-[540px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Recent Assessments</h3>
              <p className="mt-1 text-sm text-slate-500">Latest corrosion screening runs.</p>
            </div>
            <Link
              href="/external-corrosion-assessment"
              className="rounded-full bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              New Assessment
            </Link>
          </div>

          {assessments.length > 0 ? (
            <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pipeline</th>
                    <th className="px-4 py-3 font-medium">Assessment</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {assessments.slice(0, 6).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-medium text-slate-900">{item.pipelineName}</td>
                      <td className="px-4 py-4 text-slate-600">{item.type}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(item.riskLevel)}`}
                        >
                          {item.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 flex flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              No assessments created yet.
            </div>
          )}
        </Panel>

        <Panel className="flex h-full min-h-[420px] flex-col lg:min-h-[540px]">
          <h3 className="text-xl font-semibold text-slate-900">Risk Distribution</h3>
          <p className="mt-1 text-sm text-slate-500">
            Current counts by risk level.
          </p>

          <div className="mt-8 flex flex-1 flex-col justify-center space-y-5">
            {chartData.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${item.color}`}
                    style={{ width: `${(item.value / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
