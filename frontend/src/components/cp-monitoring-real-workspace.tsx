"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/ui";
import { CpLinkedRectifierRecord, CpLinkedTestPointRecord, CpMonitoringRealData, fetchCpCalculations, fetchCpMonitoringData, fetchCpRectifiers, fetchCpTestPoints, fetchMasterSegments, fetchPipelines } from "@/lib/apiClient";
import { CpCalculationRecord, PipelineRecord } from "@/lib/types";
import { getRectifierOperationalStatus, RectifierOperationalStatus } from "@/lib/cp-rectifier-status";
import { segmentDisplayName } from "@/lib/cp-segment-display";

const tabs = [
  "Overview",
  "Test Posts",
  "Rectifiers",
  "ON/OFF Surveys",
  "CIPS & Interference",
  "Trends & Historical",
  "Compliance",
  "Engineering & Design",
  "Alerts & Events",
  "Configuration"
];

type TestPoint = CpMonitoringRealData["testPoints"][number];
type Rectifier = CpMonitoringRealData["rectifiers"][number];
type LinkedPotentialReading = NonNullable<CpLinkedTestPointRecord["readings"]>["onPotential"];
type TestPostStatusFilter = "All Status" | "Within Criteria" | "Out of Criteria" | "Unavailable";
type TestPostSideFilter = "All Sides" | "LHS" | "RHS" | "Unavailable";
type RectifierStatusFilter = "All Status" | RectifierOperationalStatus;
type RectifierAlarmFilter = "All Alarm Status" | "Normal" | "No Output" | "High Voltage" | "High Current" | "Unavailable";
type CpAlertSeverity = "Critical" | "Major" | "Minor";
type CpAlertStatus = "Open" | "Acknowledged" | "Resolved";
type CpAlertRecord = {
  id: string;
  timestamp: string | null;
  source: "Test Post" | "Rectifier" | "Interference";
  assetId: string;
  assetKind: "Test Post" | "Rectifier" | "Interference";
  eventType: string;
  severity: CpAlertSeverity;
  status: CpAlertStatus;
  assignee: string;
  location: string;
  measuredValue: string;
  criterion: string;
  details: string;
  relatedTestPointId?: string;
  relatedRectifierId?: string;
};

export function CpMonitoringRealWorkspace() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [data, setData] = useState<CpMonitoringRealData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("ON Potential (Instant)");
  const [showCriteria, setShowCriteria] = useState("Yes");
  const [activeTab, setActiveTab] = useState("Overview");
  const [linkedTestPosts, setLinkedTestPosts] = useState<CpLinkedTestPointRecord[]>([]);
  const [masterSegments, setMasterSegments] = useState<Array<{ id: string; segmentId: string }>>([]);
  const [selectedTestPostId, setSelectedTestPostId] = useState("");
  const [loadingTestPosts, setLoadingTestPosts] = useState(false);
  const [testPostsError, setTestPostsError] = useState("");
  const [testPostFilters, setTestPostFilters] = useState({
    segment: "All Segments",
    status: "All Status" as TestPostStatusFilter,
    side: "All Sides" as TestPostSideFilter,
    search: "",
    from: "",
    to: ""
  });
  const [testPostPage, setTestPostPage] = useState(1);
  const [linkedRectifiers, setLinkedRectifiers] = useState<CpLinkedRectifierRecord[]>([]);
  const [selectedRectifierId, setSelectedRectifierId] = useState("");
  const [loadingRectifiers, setLoadingRectifiers] = useState(false);
  const [rectifiersError, setRectifiersError] = useState("");
  const [rectifierFilters, setRectifierFilters] = useState({
    status: "All Status" as RectifierStatusFilter,
    alarm: "All Alarm Status" as RectifierAlarmFilter,
    search: ""
  });
  const [rectifierPage, setRectifierPage] = useState(1);
  const [cpCalculations, setCpCalculations] = useState<CpCalculationRecord[]>([]);
  const [loadingEngineering, setLoadingEngineering] = useState(false);
  const [engineeringError, setEngineeringError] = useState("");

  useEffect(() => {
    let live = true;
    fetchPipelines("")
      .then((records) => {
        if (!live) return;
        setPipelines(records);
        const requested = new URLSearchParams(window.location.search).get("pipelineId") ?? "";
        const resolved = records.some((record) => record.id === requested) ? requested : records[0]?.id ?? "";
        setPipelineId(resolved);
        if (resolved && resolved !== requested) {
          const params = new URLSearchParams(window.location.search);
          params.set("pipelineId", resolved);
          router.replace(`/cp-monitoring?${params.toString()}`);
        }
      })
      .catch((cause) => live && setError(cause instanceof Error ? cause.message : "Pipelines could not be loaded."))
      .finally(() => live && setLoadingPipelines(false));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!pipelineId) {
      setData(null);
      setSelectedId("");
      setLoading(false);
      setError("");
      return;
    }

    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    fetchCpMonitoringData(pipelineId)
      .then((result) => {
        if (!live) return;
        setData(result);
        setSelectedId(result.testPoints[0]?.id ?? "");
      })
      .catch((cause) => live && setError(cause instanceof Error ? cause.message : "CP monitoring data could not be loaded."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [pipelineId]);

  useEffect(() => {
    if (!pipelineId) {
      setMasterSegments([]);
      return;
    }

    let live = true;
    fetchMasterSegments(pipelineId)
      .then((segments) => {
        if (live) setMasterSegments(segments.map((segment) => ({ id: segment.id, segmentId: segment.segmentId })));
      })
      .catch(() => live && setMasterSegments([]));
    return () => {
      live = false;
    };
  }, [pipelineId]);

  useEffect(() => {
    if (!pipelineId) {
      return;
    }

    let live = true;
    setLoadingTestPosts(true);
    setTestPostsError("");
    fetchCpTestPoints(pipelineId)
      .then((records) => {
        if (!live) return;
        setLinkedTestPosts(records);
        setSelectedTestPostId(records[0]?.cp.id ?? "");
        setTestPostPage(1);
      })
      .catch((cause) => live && setTestPostsError(cause instanceof Error ? cause.message : "CP test posts could not be loaded."))
      .finally(() => live && setLoadingTestPosts(false));
    return () => {
      live = false;
    };
  }, [activeTab, pipelineId]);

  useEffect(() => {
    if (!pipelineId || (activeTab !== "Engineering & Design" && activeTab !== "Configuration")) {
      return;
    }

    let live = true;
    setLoadingEngineering(true);
    setEngineeringError("");
    fetchCpCalculations(pipelineId)
      .then((records) => {
        if (!live) return;
        setCpCalculations(records);
      })
      .catch((cause) => live && setEngineeringError(cause instanceof Error ? cause.message : "CP engineering calculations could not be loaded."))
      .finally(() => live && setLoadingEngineering(false));
    return () => {
      live = false;
    };
  }, [activeTab, pipelineId]);

  useEffect(() => {
    if (!pipelineId) {
      return;
    }

    let live = true;
    setLoadingRectifiers(true);
    setRectifiersError("");
    fetchCpRectifiers(pipelineId)
      .then((records) => {
        if (!live) return;
        setLinkedRectifiers(records);
        setSelectedRectifierId(records[0]?.cp.id ?? "");
        setRectifierPage(1);
      })
      .catch((cause) => live && setRectifiersError(cause instanceof Error ? cause.message : "CP rectifiers could not be loaded."))
      .finally(() => live && setLoadingRectifiers(false));
    return () => {
      live = false;
    };
  }, [activeTab, pipelineId]);

  function selectPipeline(value: string) {
    setPipelineId(value);
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("pipelineId", value);
    } else {
      params.delete("pipelineId");
    }
    router.replace(`/cp-monitoring${params.size ? `?${params.toString()}` : ""}`);
  }

  const selected = data?.testPoints.find((point) => point.id === selectedId) ?? data?.testPoints[0] ?? null;
  const selectedTrend = useMemo(
    () => data?.trend.filter((reading) => reading.testPointId === selected?.id && reading.measurementType === selected?.measurementType && reading.valueMv !== null) ?? [],
    [data, selected?.id, selected?.measurementType]
  );
  const overview = useMemo(() => (data ? buildOverview(data) : null), [data]);

  function exportOverview() {
    if (!data || !overview) return;
    const rows = [
      ["Metric", "Value", "Detail"],
      ["CP Compliance", percentOrNoData(overview.compliancePercent), overview.complianceDetail],
      ["Test Posts", String(overview.testPostCount), `${overview.testPostsOk} OK | ${overview.testPostsAttention} Attention`],
      ["Rectifiers", String(overview.rectifierCount), `${overview.rectifiersOnline} Online | ${overview.rectifiersOffline} Offline | ${overview.rectifiersUnavailable} Not Available`],
      ["Average Potential", potentialFromMv(overview.averagePotentialMv), data.criterion ? "vs. Criteria" : "Criteria not connected"],
      ["Out of Criteria", String(overview.outOfCriteria), overview.outOfCriteriaPercent === null ? "No assessed readings" : `${overview.outOfCriteriaPercent}%`],
      ["Interference Issues", String(overview.interferenceIssues), overview.interferenceIssues ? "Needs Attention" : "No active issues"]
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cp-overview-${data.pipeline.pipelineCode}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <CpHeader canExport={Boolean(data && overview)} onExport={exportOverview} />
      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {error ? <State title="Could not load real CP data" detail={error} tone="error" /> : null}
      {loading ? <State title="Loading CP monitoring data" detail="Reading the existing backend CP Monitoring API for the selected pipeline." /> : null}
      {!loading && !error && !pipelineId ? (
        <State title="No pipeline selected" detail="Select an existing pipeline to load real CP monitoring data. Screenshot values are not hardcoded." />
      ) : null}

      {!loading && data && overview && activeTab === "Overview" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard icon="SH" tone="green" label="CP Compliance" value={percentOrNoData(overview.compliancePercent)} detail={overview.complianceDetail} />
            <MetricCard icon="TP" tone="green" label="Test Posts" value={formatNumber(overview.testPostCount)} detail={`${formatNumber(overview.testPostsOk)} OK | ${formatNumber(overview.testPostsAttention)} Attention`} />
            <MetricCard icon="RC" tone="green" label="Rectifiers" value={formatNumber(overview.rectifierCount)} detail={`${formatNumber(overview.rectifiersOnline)} Online | ${formatNumber(overview.rectifiersOffline)} Offline | ${formatNumber(overview.rectifiersUnavailable)} Not Available`} />
            <MetricCard icon="V" tone="green" label="Average Potential" value={potentialFromMv(overview.averagePotentialMv)} detail={data.criterion ? "vs. Criteria" : "Criteria not connected"} />
            <MetricCard icon="!" tone="amber" label="Out of Criteria" value={formatNumber(overview.outOfCriteria)} detail={overview.outOfCriteriaPercent === null ? "No assessed readings" : `(${overview.outOfCriteriaPercent}%)`} />
            <MetricCard icon="AC" tone="teal" label="Interference Issues" value={formatNumber(overview.interferenceIssues)} detail={overview.interferenceIssues ? "Needs Attention" : "No active issues"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <Panel className="min-w-0 rounded-lg p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <SectionTitle title="Pipeline CP Profile" />
                <Legend />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline} disabled={loadingPipelines}>
                  <option value="">{loadingPipelines ? "Loading pipelines..." : "Select Pipeline"}</option>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.pipelineCode} - {pipeline.pipelineName}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="View" value={viewMode} onChange={setViewMode}>
                  <option>ON Potential (Instant)</option>
                  <option>OFF Potential</option>
                </SelectField>
                <SelectField label="Show Criteria" value={showCriteria} onChange={setShowCriteria}>
                  <option>Yes</option>
                  <option>No</option>
                </SelectField>
              </div>
              {overview.profilePoints.length ? (
                <CpProfileChart points={overview.profilePoints} criterion={showCriteria === "Yes" ? data.criterion : null} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
              ) : (
                <EmptyState title="No CP profile readings" detail={data.availability.testPoints.reason} />
              )}
            </Panel>

            <SelectedTestPointPanel selected={selected} data={data} linkedRecord={linkedTestPosts.find((record) => record.cp.code === selected?.code) ?? null} masterSegments={masterSegments} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="rounded-lg p-4">
              <SectionTitle title="Potential Distribution" />
              {overview.assessedTestPosts ? (
                <DistributionChart
                  centerValue={formatNumber(overview.testPostCount)}
                  centerLabel="Test Posts"
                  items={[
                    { label: "Within Criteria", count: overview.testPostsOk, percent: overview.compliancePercent, tone: "green" },
                    { label: "Marginal", count: overview.testPostsMarginal, percent: overview.marginalPercent, tone: "amber" },
                    { label: "Out of Criteria", count: overview.outOfCriteria, percent: overview.outOfCriteriaPercent, tone: "red" }
                  ]}
                />
              ) : (
                <EmptyState title="No assessed readings" detail="Valid assessed readings are required before compliance distribution can be calculated." />
              )}
            </Panel>

            <Panel className="rounded-lg p-4">
              <SectionTitle title="Rectifier Status" />
              {overview.rectifierCount ? (
                <DistributionChart
                  centerValue={formatNumber(overview.rectifierCount)}
                  centerLabel="Rectifiers"
                  items={[
                    { label: "Online", count: overview.rectifiersOnline, percent: overview.rectifierOnlinePercent, tone: "green" },
                    { label: "Offline", count: overview.rectifiersOffline, percent: overview.rectifierOfflinePercent, tone: "red" },
                    { label: "Not Available", count: overview.rectifiersUnavailable, percent: overview.rectifierUnavailablePercent, tone: "amber" }
                  ]}
                />
              ) : (
                <EmptyState title="No rectifiers" detail={data.availability.rectifiers.reason} />
              )}
            </Panel>

            <Panel className="rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle title="CP Current Output" />
                <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">Last 7 Days</span>
              </div>
              {overview.currentSeries.length >= 2 ? (
                <MiniLineChart points={overview.currentSeries} unit="A" />
              ) : (
                <EmptyState title="Historical current unavailable" detail="The active overview API returns latest rectifier output only, not a 7-day current time series." />
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <BlockedTable title="Recent CP Alarms" columns={["Time", "Asset / ID", "Description", "Severity"]} reason="CP operational alert/event records are not exposed by the current IMG-01 backend API." />
            <RectifierAttentionTable rectifiers={overview.rectifiersRequiringAttention} />
            <BlockedTable title="Upcoming CP Activities" columns={["Date", "Type", "Asset / ID", "Status"]} reason="Inspection and activity scheduling is not connected to CP Monitoring yet." />
          </div>

          <div id="cp-selected-trend" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <Panel className="min-w-0 rounded-lg p-4">
              <SectionTitle title="Selected Test Post Trend" />
              {selectedTrend.length ? (
                <MiniLineChart points={selectedTrend.map((reading) => ({ label: new Date(reading.readingAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: reading.valueMv ?? 0 }))} unit="mV" />
              ) : (
                <EmptyState title="No selected trend" detail="The backend has no historical readings for the selected test post and measurement type." />
              )}
            </Panel>
            <Panel className="rounded-lg p-4">
              <SectionTitle title="IMG-01 Data Source" />
              <div className="mt-4 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                <p>API: GET /api/cp-monitoring/:pipelineId</p>
                <p>Compliance excludes unassessed points unless backend summary already provides a verified aggregate.</p>
                <p>No screenshot/demo values are used.</p>
              </div>
            </Panel>
          </div>
        </>
      ) : null}

      {!loading && data && activeTab === "Test Posts" ? (
        <TestPostsTab
          filters={testPostFilters}
          loading={loadingTestPosts}
          onFiltersChange={(next) => {
            setTestPostFilters(next);
            setTestPostPage(1);
          }}
          onPageChange={setTestPostPage}
          onSelect={setSelectedTestPostId}
          page={testPostPage}
          pipelineId={pipelineId}
          pipelines={pipelines}
          masterSegments={masterSegments}
          records={linkedTestPosts}
          selectedId={selectedTestPostId}
          selectPipeline={selectPipeline}
          testPostsError={testPostsError}
        />
      ) : null}

      {!loading && data && activeTab === "Rectifiers" ? (
        <RectifiersTab
          aggregateRectifiers={data.rectifiers}
          filters={rectifierFilters}
          loading={loadingRectifiers}
          onFiltersChange={(next) => {
            setRectifierFilters(next);
            setRectifierPage(1);
          }}
          onPageChange={setRectifierPage}
          onSelect={setSelectedRectifierId}
          page={rectifierPage}
          pipelineId={pipelineId}
          pipelines={pipelines}
          masterSegments={masterSegments}
          records={linkedRectifiers}
          rectifiersError={rectifiersError}
          selectedId={selectedRectifierId}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "ON/OFF Surveys" ? (
        <OnOffSurveysTab
          data={data}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "CIPS & Interference" ? (
        <CipsInterferenceTab
          data={data}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "Trends & Historical" ? (
        <TrendsHistoricalTab
          data={data}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "Compliance" ? (
        <ComplianceTab
          data={data}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "Engineering & Design" ? (
        <EngineeringDesignTab
          calculations={cpCalculations}
          data={data}
          engineeringError={engineeringError}
          loading={loadingEngineering}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "Alerts & Events" ? (
        <AlertsEventsTab
          data={data}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}

      {!loading && data && activeTab === "Configuration" ? (
        <ConfigurationTab
          calculations={cpCalculations}
          data={data}
          loading={loadingEngineering}
          pipelineId={pipelineId}
          pipelines={pipelines}
          selectPipeline={selectPipeline}
        />
      ) : null}
    </div>
  );
}

function TestPostsTab({
  filters,
  loading,
  onFiltersChange,
  onPageChange,
  onSelect,
  page,
  pipelineId,
  pipelines,
  masterSegments,
  records,
  selectedId,
  selectPipeline,
  testPostsError
}: {
  filters: { segment: string; status: TestPostStatusFilter; side: TestPostSideFilter; search: string; from: string; to: string };
  loading: boolean;
  onFiltersChange: (filters: { segment: string; status: TestPostStatusFilter; side: TestPostSideFilter; search: string; from: string; to: string }) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  page: number;
  pipelineId: string;
  pipelines: PipelineRecord[];
  masterSegments: Array<{ id: string; segmentId: string }>;
  records: CpLinkedTestPointRecord[];
  selectedId: string;
  selectPipeline: (value: string) => void;
  testPostsError: string;
}) {
const pageSize = 6;
  const selected = records.find((record) => record.cp.id === selectedId) ?? records[0] ?? null;
  const segments = masterSegments.filter((segment) => records.some((record) => record.asset?.segmentId === segment.id));
  const filtered = records.filter((record) => matchesTestPostFilters(record, filters));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRecords = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const summary = buildTestPostSummary(records);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function resetFilters() {
    onFiltersChange({ segment: "All Segments", status: "All Status", side: "All Sides", search: "", from: "", to: "" });
  }

  return (
    <div className="space-y-4">
      {testPostsError ? <State title="Could not load Test Posts" detail={testPostsError} tone="error" /> : null}
      {loading ? <State title="Loading Test Posts" detail="Reading Asset Master-linked CP test posts from the backend." /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="TP" tone="green" label="Total Test Posts" value={formatNumber(records.length)} detail={`${formatNumber(summary.active)} Active | ${formatNumber(summary.inactive)} Inactive`} />
        <MetricCard icon="OK" tone="green" label="Within Criteria" value={formatNumber(summary.within)} detail={summary.active ? `${roundPercent(summary.within, summary.active)}% of active` : "No active assessed posts"} />
        <MetricCard icon="!" tone="amber" label="Out of Criteria" value={formatNumber(summary.out)} detail={summary.active ? `${roundPercent(summary.out, summary.active)}% of active` : "No active assessed posts"} />
        <MetricCard icon="IN" tone="teal" label="Due for Inspection" value="Unavailable" detail="Inspection scheduling not connected" />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.8fr_0.8fr_1fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            <option value="">Select Pipeline</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>
            ))}
          </SelectField>
          <SelectField label="Segment" value={filters.segment} onChange={(value) => updateFilter("segment", value)}>
            <option>All Segments</option>
            {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.segmentId}</option>)}
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => updateFilter("status", value as TestPostStatusFilter)}>
            <option>All Status</option>
            <option>Within Criteria</option>
            <option>Out of Criteria</option>
            <option>Unavailable</option>
          </SelectField>
          <SelectField label="Side" value={filters.side} onChange={(value) => updateFilter("side", value as TestPostSideFilter)}>
            <option>All Sides</option>
            <option>LHS</option>
            <option>RHS</option>
            <option>Unavailable</option>
          </SelectField>
          <label className="text-xs font-semibold text-slateblue-900 dark:text-slate-200">
            Date Range (Last Reading)
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </div>
          </label>
          <button className="mt-5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slateblue-700 shadow-sm" onClick={resetFilters} type="button">Reset</button>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm" onClick={() => onPageChange(1)} type="button">Apply Filters</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="rounded-lg p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold text-slateblue-950 dark:text-white">Test Posts ({formatNumber(filtered.length)})</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-80" placeholder="Search by Test Post ID or location..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
              <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slateblue-700 disabled:opacity-60" disabled title="Reading import workflow is not connected in IMG-02." type="button">Import Readings</button>
              <button className="rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled title="New physical Test Posts must be created through Asset Master first." type="button">Add Test Post</button>
            </div>
          </div>
          {pageRecords.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                    <tr>
                      <th className="w-10 px-4 py-3"><span className="sr-only">Selected</span></th>
                      <th className="px-3 py-3">Test Post ID</th>
                      <th className="px-3 py-3">KP (km)</th>
                      <th className="px-3 py-3">Segment</th>
                      <th className="px-3 py-3">Side</th>
                      <th className="px-3 py-3">ON Potential (V)</th>
                      <th className="px-3 py-3">OFF Potential (V)</th>
                      <th className="px-3 py-3">Last Reading</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Next Inspection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRecords.map((record) => {
                      const status = getLinkedTestPostStatus(record);
                      const selectedRow = record.cp.id === selectedId;
                      return (
                        <tr key={record.cp.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 dark:hover:bg-slate-800 ${selectedRow ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => onSelect(record.cp.id)}>
                          <td className="px-4 py-3"><input aria-label={`Select ${record.asset?.assetId ?? record.cp.code}`} checked={selectedRow} readOnly type="checkbox" /></td>
                          <td className="px-3 py-3 font-semibold text-slateblue-700">{record.asset?.assetId ?? record.cp.code}</td>
                          <td className="px-3 py-3">{record.asset?.kp ?? record.cp.kp ?? "No data"}</td>
                          <td className="px-3 py-3">{segmentDisplayName(record.asset?.segmentId, masterSegments)}</td>
                          <td className="px-3 py-3">{record.asset?.side ?? "Unavailable"}</td>
                          <td className="px-3 py-3 font-mono">{potentialFromReading(record.readings?.onPotential)}</td>
                          <td className="px-3 py-3 font-mono">{potentialFromReading(record.readings?.offPotential)}</td>
                          <td className="px-3 py-3">{formatDate(record.readings?.lastReadingAt)}</td>
                          <td className="px-3 py-3"><StatusPill value={status} /></td>
                          <td className="px-3 py-3">Unavailable</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {formatNumber((safePage - 1) * pageSize + 1)} to {formatNumber(Math.min(safePage * pageSize, filtered.length))} of {formatNumber(filtered.length)} test posts</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} type="button">Prev</button>
                  <span className="rounded-md bg-slateblue-600 px-3 py-1 font-semibold text-white">{safePage}</span>
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5">
              <EmptyState title="No Test Posts found" detail="No Asset Master-linked CP Test Posts match the current filters." />
            </div>
          )}
        </Panel>

        <LinkedTestPostDetails record={selected} masterSegments={masterSegments} pipeline={pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null} />
      </div>
    </div>
  );
}

function LinkedTestPostDetails({ record, masterSegments, pipeline }: { record: CpLinkedTestPointRecord | null; masterSegments: Array<{ id: string; segmentId: string }>; pipeline: PipelineRecord | null }) {
  if (!record) {
    return <Panel className="rounded-lg p-4"><EmptyState title="No Test Post selected" detail="Select a Test Post row to view details." /></Panel>;
  }

  const status = getLinkedTestPostStatus(record);
  const coordinates = record.asset?.coordinates ?? (record.asset?.latitude !== undefined && record.asset?.longitude !== undefined ? `${record.asset.latitude}, ${record.asset.longitude}` : "Unavailable");

  return (
    <Panel className="rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-slateblue-950 dark:text-white">{record.asset?.assetId ?? record.cp.code}</p>
          <p className="text-xs text-slate-500">{record.asset?.kp ?? record.cp.kp ?? "KP unavailable"}</p>
        </div>
        <StatusPill value={status} />
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-bold text-slateblue-950 dark:text-white">Location & Pipeline</h3>
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <DetailRow label="Pipeline" value={pipeline ? `${pipeline.pipelineName} (${pipeline.pipelineCode})` : record.cp.pipelineId} />
          <DetailRow label="Segment" value={segmentDisplayName(record.asset?.segmentId, masterSegments)} />
          <DetailRow label="KP (km)" value={record.asset?.kp ?? record.cp.kp ?? "Unavailable"} />
          <DetailRow label="Side" value={record.asset?.side ?? "Unavailable"} />
          <DetailRow label="Coordinates" value={coordinates} />
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-bold text-slateblue-950 dark:text-white">Latest Reading</h3>
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <DetailRow label="ON Potential" value={potentialFromReading(record.readings?.onPotential)} />
          <DetailRow label="OFF Potential" value={potentialFromReading(record.readings?.offPotential)} />
          <DetailRow label="Last Reading Date" value={formatDate(record.readings?.lastReadingAt)} />
          <DetailRow label="Status" value={status} />
          <DetailRow label="Next Inspection" value="Unavailable - scheduling not connected" />
          <DetailRow label="Comments" value={record.cp.notes ?? "No comments"} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ActionButton disabled label="View Trend" />
        <ActionButton disabled label="Raise Action" />
        <ActionButton disabled label="More" />
      </div>
    </Panel>
  );
}

function RectifiersTab({
  aggregateRectifiers,
  filters,
  loading,
  onFiltersChange,
  onPageChange,
  onSelect,
  page,
  pipelineId,
  pipelines,
  masterSegments,
  records,
  rectifiersError,
  selectedId,
  selectPipeline
}: {
  aggregateRectifiers: Rectifier[];
  filters: { status: RectifierStatusFilter; alarm: RectifierAlarmFilter; search: string };
  loading: boolean;
  onFiltersChange: (filters: { status: RectifierStatusFilter; alarm: RectifierAlarmFilter; search: string }) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  page: number;
  pipelineId: string;
  pipelines: PipelineRecord[];
  masterSegments: Array<{ id: string; segmentId: string }>;
  records: CpLinkedRectifierRecord[];
  rectifiersError: string;
  selectedId: string;
  selectPipeline: (value: string) => void;
}) {
const pageSize = 6;
  const merged = records.map((record) => ({ record, reading: findRectifierReading(record, aggregateRectifiers) }));
  const selected = merged.find((item) => item.record.cp.id === selectedId) ?? merged[0] ?? null;
  const filtered = merged.filter((item) => matchesRectifierFilters(item.record, item.reading, filters));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRecords = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const summary = buildRectifierSummary(merged);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-4">
      {rectifiersError ? <State title="Could not load Rectifiers" detail={rectifiersError} tone="error" /> : null}
      {loading ? <State title="Loading Rectifiers" detail="Reading Asset Master-linked rectifiers and CP operational status." /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="RC" tone="green" label="Total Rectifiers" value={formatNumber(records.length)} detail="Across selected pipeline" />
        <MetricCard icon="OK" tone="green" label="Online" value={formatNumber(summary.online)} detail={summary.total ? `${roundPercent(summary.online, summary.total)}%` : "No rectifiers"} />
        <MetricCard icon="OFF" tone="amber" label="Offline" value={formatNumber(summary.offline)} detail={summary.total ? `${roundPercent(summary.offline, summary.total)}%` : "No rectifiers"} />
        <MetricCard icon="!" tone="amber" label="Warning" value={formatNumber(summary.warning)} detail={summary.total ? `${roundPercent(summary.warning, summary.total)}%` : "No rectifiers"} />
        <MetricCard icon="A" tone="green" label="Average Current Output" value={summary.averageCurrentA === null ? "Unavailable" : `${summary.averageCurrentA.toFixed(1)} A`} detail="Across units with readings" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <Panel className="rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Rectifier Output Current Trend" />
            <span className="text-xs font-semibold text-slateblue-700">Latest readings</span>
          </div>
          {summary.currentPoints.length >= 2 ? <MiniLineChart points={summary.currentPoints} unit="A" /> : <EmptyState title="Current trend unavailable" detail="The linked rectifier API has no historical current series; latest readings are shown in the register." />}
        </Panel>
        <Panel className="rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Rectifier Output Voltage Trend" />
            <span className="text-xs font-semibold text-slateblue-700">Latest readings</span>
          </div>
          {summary.voltagePoints.length >= 2 ? <MiniLineChart points={summary.voltagePoints} unit="V" /> : <EmptyState title="Voltage trend unavailable" detail="The linked rectifier API has no historical voltage series; latest readings are shown in the register." />}
        </Panel>
        <Panel className="rounded-lg p-4">
          <SectionTitle title="Rectifier Health" />
          {summary.total ? (
            <DistributionChart
              centerValue={formatNumber(summary.total)}
              centerLabel="Total"
              items={[
                { label: "Online", count: summary.online, percent: roundPercent(summary.online, summary.total), tone: "green" },
                { label: "Warning", count: summary.warning, percent: roundPercent(summary.warning, summary.total), tone: "amber" },
                { label: "Offline", count: summary.offline, percent: roundPercent(summary.offline, summary.total), tone: "red" },
                { label: "Not Available", count: summary.unavailable, percent: roundPercent(summary.unavailable, summary.total), tone: "amber" }
              ]}
            />
          ) : (
            <EmptyState title="No rectifiers" detail="No Asset Master-linked rectifiers are available for this pipeline." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="rounded-lg p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold text-slateblue-950 dark:text-white">Rectifier Register ({formatNumber(filtered.length)})</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-64" placeholder="Search rectifiers..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
              <SelectBare value={filters.status} onChange={(value) => updateFilter("status", value as RectifierStatusFilter)}>
                <option>All Status</option>
                <option>Online</option>
                <option>Offline</option>
                <option>Warning</option>
                <option>Not Available</option>
              </SelectBare>
              <SelectBare value={pipelineId} onChange={selectPipeline}>
                {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode}</option>)}
              </SelectBare>
              <SelectBare value={filters.alarm} onChange={(value) => updateFilter("alarm", value as RectifierAlarmFilter)}>
                <option>All Alarm Status</option>
                <option>Normal</option>
                <option>No Output</option>
                <option>High Voltage</option>
                <option>High Current</option>
                <option>Unavailable</option>
              </SelectBare>
            </div>
          </div>

          {pageRecords.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-left text-sm">
                  <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                    <tr>
                      <th className="w-10 px-4 py-3"><span className="sr-only">Selected</span></th>
                      <th className="px-3 py-3">Rectifier ID</th>
                      <th className="px-3 py-3">Location (KP)</th>
                      <th className="px-3 py-3">Segment</th>
                      <th className="px-3 py-3">Pipeline</th>
                      <th className="px-3 py-3">Output Voltage (V)</th>
                      <th className="px-3 py-3">Output Current (A)</th>
                      <th className="px-3 py-3">Operational Status</th>
                      <th className="px-3 py-3">Last Maintenance</th>
                      <th className="px-3 py-3">Alarm Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRecords.map(({ record, reading }) => {
                      const selectedRow = record.cp.id === selectedId;
                      return (
                        <tr key={record.cp.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 dark:hover:bg-slate-800 ${selectedRow ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => onSelect(record.cp.id)}>
                          <td className="px-4 py-3"><input aria-label={`Select ${record.asset?.assetId ?? record.cp.rectifierCode}`} checked={selectedRow} readOnly type="checkbox" /></td>
                          <td className="px-3 py-3 font-semibold text-slateblue-700">{record.asset?.assetId ?? record.cp.rectifierCode}</td>
                          <td className="px-3 py-3">{record.asset?.kp ?? record.cp.kp ?? record.asset?.coordinates ?? record.cp.location ?? "Unavailable"}</td>
                          <td className="px-3 py-3">{segmentDisplayName(record.asset?.segmentId, masterSegments)}</td>
                          <td className="px-3 py-3">{pipelineLabel(pipelines, record.cp.pipelineId)}</td>
                          <td className="px-3 py-3 font-mono">{numberUnit(reading?.outputVoltageV, "V")}</td>
                          <td className="px-3 py-3 font-mono">{numberUnit(reading?.outputCurrentA, "A")}</td>
                          <td className="px-3 py-3"><StatusPill value={getRectifierStatus(record, reading)} /></td>
                          <td className="px-3 py-3">Unavailable</td>
                          <td className="px-3 py-3"><StatusPill value={getRectifierAlarmStatus(record, reading)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>Show {pageSize} of {formatNumber(filtered.length)} rectifiers</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)} type="button">Prev</button>
                  <span className="rounded-md bg-slateblue-600 px-3 py-1 font-semibold text-white">{safePage}</span>
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5">
              <EmptyState title="No Rectifiers found" detail="No Asset Master-linked rectifiers match the current filters." />
            </div>
          )}
        </Panel>

        <LinkedRectifierDetails item={selected} pipeline={selected ? pipelines.find((pipeline) => pipeline.id === selected.record.cp.pipelineId) ?? null : null} masterSegments={masterSegments} />
      </div>
    </div>
  );
}

function LinkedRectifierDetails({ item, pipeline, masterSegments }: { item: { record: CpLinkedRectifierRecord; reading?: Rectifier } | null; pipeline: PipelineRecord | null; masterSegments: Array<{ id: string; segmentId: string }> }) {
  if (!item) {
    return <Panel className="rounded-lg p-4"><EmptyState title="No Rectifier selected" detail="Select a rectifier row to view details." /></Panel>;
  }

  const { record, reading } = item;

  return (
    <Panel className="rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-slateblue-950 dark:text-white">{record.asset?.assetId ?? record.cp.rectifierCode}</p>
          <p className="text-xs text-slate-500">{record.asset?.kp ?? record.cp.kp ?? "Location unavailable"}</p>
        </div>
        <StatusPill value={getRectifierStatus(record, reading)} />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1 border-b border-slate-200 pb-2 text-center text-xs text-slateblue-700 dark:border-slate-700">
        <span className="font-bold">Details</span>
        <span>Performance</span>
        <span>Alarms</span>
        <span>Maintenance</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
        <DetailRow label="Rectifier ID" value={record.asset?.assetId ?? record.cp.rectifierCode} />
        <DetailRow label="Location" value={record.asset?.kp ?? record.cp.kp ?? record.asset?.coordinates ?? record.cp.location ?? "Unavailable"} />
        <DetailRow label="Segment" value={segmentDisplayName(record.asset?.segmentId, masterSegments)} />
        <DetailRow label="Pipeline" value={pipeline ? pipeline.pipelineName : record.cp.pipelineId} />
        <DetailRow label="Output Voltage" value={numberUnit(reading?.outputVoltageV, "V")} />
        <DetailRow label="Output Current" value={numberUnit(reading?.outputCurrentA, "A")} />
        <DetailRow label="Operational Status" value={getRectifierStatus(record, reading)} />
        <DetailRow label="Rectifier Status" value={displayEnum(record.cp.status)} />
        <DetailRow label="Last Maintenance" value="Unavailable" />
        <DetailRow label="Next Maintenance" value="Unavailable" />
        <DetailRow label="Alarm Status" value={getRectifierAlarmStatus(record, reading)} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <ActionButton disabled label="View Asset" />
        <ActionButton disabled label="Maintenance" />
        <ActionButton disabled label="Documents" />
        <ActionButton disabled label="Raise Action" />
      </div>
    </Panel>
  );
}

function OnOffSurveysTab({ data, pipelineId, pipelines, selectPipeline }: { data: CpMonitoringRealData; pipelineId: string; pipelines: PipelineRecord[]; selectPipeline: (value: string) => void }) {
  const [filters, setFilters] = useState({ surveyType: "All Types", status: "All Statuses", from: "", to: "", contractor: "All Contractors" });
  const [page, setPage] = useState(1);
  const [selectedSurveyId, setSelectedSurveyId] = useState(data.surveys[0]?.id ?? "");
const pageSize = 6;
  const filteredSurveys = data.surveys.filter((survey) => matchesSurveyFilters(survey, filters));
  const pageCount = Math.max(1, Math.ceil(filteredSurveys.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageSurveys = filteredSurveys.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedSurvey = data.surveys.find((survey) => survey.id === selectedSurveyId) ?? data.surveys[0] ?? null;
  const surveySummary = buildSurveySummary(data);
  const onOffPoints = data.testPoints
    .filter((point) => point.eOnMv !== null || point.eOffMv !== null)
    .map((point, index) => ({
      id: point.id,
      kp: point.kp || point.location || String(index + 1),
      on: point.eOnMv,
      off: point.eOffMv
    }));

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  function clearFilters() {
    setFilters({ surveyType: "All Types", status: "All Statuses", from: "", to: "", contractor: "All Contractors" });
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="OK" tone="green" label="Surveys Completed" value={formatNumber(surveySummary.completed)} detail="From CpMonitoringSurvey records" />
        <MetricCard icon="CAL" tone="teal" label="Scheduled Surveys" value="Unavailable" detail="Survey schedule source not connected" />
        <MetricCard icon="V" tone="green" label="Average OFF Potential" value={potentialFromMv(surveySummary.averageOffMv)} detail={data.criterion ? `vs. ${potentialFromMv(data.criterion.valueMv)} criterion` : "Criteria not connected"} />
        <MetricCard icon="!" tone="amber" label="Non-Compliant Points" value={formatNumber(surveySummary.nonCompliant)} detail={surveySummary.assessed ? `${roundPercent(surveySummary.nonCompliant, surveySummary.assessed)}% of assessed` : "No assessed points"} />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_0.6fr_0.6fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Survey Type" value={filters.surveyType} onChange={(value) => updateFilter("surveyType", value)}>
            <option>All Types</option>
            <option>ON/OFF</option>
          </SelectField>
          <label className="text-xs font-semibold text-slateblue-900 dark:text-slate-200">
            Period
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </div>
          </label>
          <SelectField label="Contractor" value={filters.contractor} onChange={(value) => updateFilter("contractor", value)}>
            <option>All Contractors</option>
            <option disabled>Unavailable</option>
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option>All Statuses</option>
            <option>Draft</option>
            <option>Completed</option>
            <option>Approved</option>
            <option>Cancelled</option>
          </SelectField>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setPage(1)} type="button">Search</button>
          <button className="mt-5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slateblue-700" onClick={clearFilters} type="button">Clear</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">Survey Campaigns ({formatNumber(filteredSurveys.length)})</h2>
          </div>
          {pageSurveys.length ? (
            <>
              <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                    <tr>
                      <th className="w-10 px-4 py-3"><span className="sr-only">Selected</span></th>
                      <th className="px-3 py-3">Survey ID</th>
                      <th className="px-3 py-3">Pipeline</th>
                      <th className="px-3 py-3">Segment</th>
                      <th className="px-3 py-3">Survey Date</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Points Covered</th>
                      <th className="px-3 py-3">Compliance</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSurveys.map((survey) => {
                      const selected = survey.id === selectedSurveyId;
                      return (
                        <tr key={survey.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 dark:hover:bg-slate-800 ${selected ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => setSelectedSurveyId(survey.id)}>
                          <td className="px-4 py-3"><input aria-label={`Select ${survey.id}`} checked={selected} readOnly type="checkbox" /></td>
                          <td className="px-3 py-3 font-semibold text-slateblue-700">{survey.surveyName || survey.id}</td>
                          <td className="px-3 py-3">{data.pipeline.pipelineName}</td>
                          <td className="px-3 py-3">Unavailable</td>
                          <td className="px-3 py-3">{formatDate(survey.surveyDate)}</td>
                          <td className="px-3 py-3">ON/OFF</td>
                          <td className="px-3 py-3">Unavailable</td>
                          <td className="px-3 py-3">{percentOrNoData(data.summary.protectionCoveragePercent)}</td>
                          <td className="px-3 py-3"><StatusPill value={survey.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {formatNumber((safePage - 1) * pageSize + 1)} to {formatNumber(Math.min(safePage * pageSize, filteredSurveys.length))} of {formatNumber(filteredSurveys.length)} surveys</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} type="button">Prev</button>
                  <span className="rounded-md bg-slateblue-600 px-3 py-1 font-semibold text-white">{safePage}</span>
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5"><EmptyState title="No ON/OFF surveys" detail={data.availability.surveys.reason} /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="CP Profile - ON vs OFF Potential" />
            <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slateblue-700">{selectedSurvey?.surveyName || selectedSurvey?.id || "No Survey"}</span>
          </div>
          {onOffPoints.length ? <OnOffProfileChart points={onOffPoints} criterion={data.criterion?.valueMv ?? null} /> : <EmptyState title="No ON/OFF readings" detail="No ON/OFF potential readings are available from CpReadingHistory for this pipeline." />}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <BlockedTable title="Survey Schedule (Next 6 Months)" columns={["Planned Date", "Pipeline", "Segment", "Type", "Contractor", "Status"]} reason="Survey scheduling and contractor assignment are not exposed by the current CP Monitoring API." />
        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Selected Survey Summary" />
            <StatusPill value={selectedSurvey?.status ?? "Unavailable"} />
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <DetailRow label="Survey ID" value={selectedSurvey?.surveyName || selectedSurvey?.id || "Unavailable"} />
            <DetailRow label="Pipeline" value={data.pipeline.pipelineName} />
            <DetailRow label="Segment" value="Unavailable" />
            <DetailRow label="Survey Date" value={formatDate(selectedSurvey?.surveyDate)} />
            <DetailRow label="Survey Type" value="ON/OFF" />
            <DetailRow label="Contractor" value="Unavailable" />
            <DetailRow label="Points Covered" value="Unavailable" />
            <DetailRow label="Compliant Points" value={formatNumber(data.summary.protectedCount)} />
            <DetailRow label="Non-Compliant Points" value={formatNumber(data.summary.underProtectedCount)} />
            <DetailRow label="Average OFF Potential" value={potentialFromMv(surveySummary.averageOffMv)} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <ActionButton disabled label="View Results" />
            <ActionButton disabled label="Approve" />
            <ActionButton disabled label="Import Survey" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TrendsHistoricalTab({ data, pipelineId, pipelines, selectPipeline }: { data: CpMonitoringRealData; pipelineId: string; pipelines: PipelineRecord[]; selectPipeline: (value: string) => void }) {
  const [filters, setFilters] = useState({ segment: "All Segments", asset: "All Assets", metric: "Pipe-to-Soil Potential (V)", aggregation: "Monthly", from: "", to: "" });
  const [selectedPointId, setSelectedPointId] = useState(data.testPoints[0]?.id ?? "");
  const selectedPoint = data.testPoints.find((point) => point.id === selectedPointId) ?? data.testPoints[0] ?? null;
  const filteredTrend = data.trend.filter((reading) => matchesTrendFilters(reading, filters, selectedPointId));
  const trendSummary = buildTrendSummary(data, filteredTrend);
  const monthlyRows = buildMonthlyTrendRows(data, filteredTrend);
  const selectedHistory = data.trend.filter((reading) => selectedPoint && reading.testPointId === selectedPoint.id).slice(-6).reverse();
  const rectifierBars = data.rectifiers
    .filter((rectifier) => typeof rectifier.outputCurrentA === "number")
    .map((rectifier) => ({ label: rectifier.rectifierCode, value: rectifier.outputCurrentA ?? 0 }));
  const complianceBars = monthlyRows.map((row) => ({ label: row.month, value: row.compliancePercent ?? 0 }));

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
  }

  function resetFilters() {
    setFilters({ segment: "All Segments", asset: "All Assets", metric: "Pipe-to-Soil Potential (V)", aggregation: "Monthly", from: "", to: "" });
  }

  return (
    <div className="space-y-4">
      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.1fr_1.3fr_1fr_0.6fr_0.5fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Segment" value={filters.segment} onChange={(value) => updateFilter("segment", value)}>
            <option>All Segments</option>
            <option disabled>Unavailable</option>
          </SelectField>
          <SelectField label="Asset" value={filters.asset} onChange={(value) => updateFilter("asset", value)}>
            <option>All Assets</option>
            {data.testPoints.map((point) => <option key={point.id}>{point.code}</option>)}
          </SelectField>
          <SelectField label="Metric" value={filters.metric} onChange={(value) => updateFilter("metric", value)}>
            <option>Pipe-to-Soil Potential (V)</option>
            <option>ON Potential (V)</option>
            <option>OFF Potential (V)</option>
          </SelectField>
          <label className="text-xs font-semibold text-slateblue-900 dark:text-slate-200">
            Date Range
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
              <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
            </div>
          </label>
          <SelectField label="Aggregation" value={filters.aggregation} onChange={(value) => updateFilter("aggregation", value)}>
            <option>Monthly</option>
            <option>Daily</option>
          </SelectField>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white" type="button">Apply</button>
          <button className="mt-5 text-sm font-semibold text-slateblue-700" onClick={resetFilters} type="button">Reset</button>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="%" tone="green" label="12-Month Compliance Trend" value={percentOrNoData(trendSummary.compliancePercent)} detail="Based on assessed historical readings" />
        <MetricCard icon="V" tone="green" label="Average Potential Trend" value={potentialFromMv(trendSummary.averagePotentialMv)} detail={`${formatNumber(filteredTrend.length)} historical readings`} />
        <MetricCard icon="RC" tone="green" label="Rectifier Availability" value={percentOrNoData(trendSummary.rectifierAvailabilityPercent)} detail="From latest rectifier states" />
        <MetricCard icon="!" tone="amber" label="Repeated Out-of-Criteria Locations" value={formatNumber(trendSummary.repeatedOutOfCriteria)} detail="Locations with multiple non-compliant readings" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <Panel className="rounded-lg p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle title="Pipe-to-Soil Potential Trend" />
            <SelectBare value={selectedPointId} onChange={setSelectedPointId}>
              {data.testPoints.length ? data.testPoints.map((point) => <option key={point.id} value={point.id}>{point.code}</option>) : <option value="">No Assets</option>}
            </SelectBare>
          </div>
          {filteredTrend.length ? <HistoricalPotentialChart readings={filteredTrend} criterion={data.criterion?.valueMv ?? null} /> : <EmptyState title="No historical trend readings" detail="No matching CpReadingHistory records are available for the selected filters." />}
        </Panel>

        <div className="space-y-4">
          <Panel className="rounded-lg p-4">
            <SectionTitle title="Rectifier Current (Historical)" />
            {rectifierBars.length ? <MiniBarChart points={rectifierBars} unit="A" /> : <EmptyState title="No rectifier current history" detail="The current API exposes latest rectifier output, not historical rectifier readings." />}
          </Panel>
          <Panel className="rounded-lg p-4">
            <SectionTitle title="CP Compliance Trend" />
            {complianceBars.length ? <MiniBarChart points={complianceBars} unit="%" /> : <EmptyState title="No compliance trend" detail="Historical compliance requires assessed CP readings." />}
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">Monthly Comparison by Pipeline Segment</h2>
            <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!monthlyRows.length} type="button">Export</button>
          </div>
          {monthlyRows.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Test Posts</th><th className="px-4 py-3">Avg Potential (V)</th><th className="px-4 py-3">Compliance (%)</th><th className="px-4 py-3">Rectifier Availability (%)</th><th className="px-4 py-3">Out-of-Criteria</th></tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={row.month} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">{row.month}</td>
                      <td className="px-4 py-3">{formatNumber(row.testPosts)}</td>
                      <td className="px-4 py-3">{row.averagePotentialMv === null ? "Unavailable" : (row.averagePotentialMv / 1000).toFixed(2)}</td>
                      <td className="px-4 py-3">{row.compliancePercent === null ? "Unavailable" : row.compliancePercent}</td>
                      <td className="px-4 py-3">{trendSummary.rectifierAvailabilityPercent ?? "Unavailable"}</td>
                      <td className="px-4 py-3">{formatNumber(row.outOfCriteria)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><EmptyState title="No monthly comparison" detail="No historical readings are available for monthly comparison." /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Selected Point History" />
            <button className="text-xl leading-none text-slateblue-700" disabled type="button">x</button>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <DetailRow label="Test Post" value={selectedPoint?.code ?? "Unavailable"} />
            <DetailRow label="Asset Type" value="Test Post" />
            <DetailRow label="Pipeline" value={data.pipeline.pipelineName} />
            <DetailRow label="Segment" value="Unavailable" />
            <DetailRow label="Coordinates" value="Unavailable" />
            <DetailRow label="Status" value={selectedPoint?.protectionStatus ?? "Unavailable"} />
          </div>
          {selectedHistory.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Potential (V)</th><th className="px-3 py-2">Criteria (V)</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {selectedHistory.map((reading) => (
                    <tr key={reading.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{formatDate(reading.readingAt)}</td>
                      <td className="px-3 py-2">{potentialReadingValue(reading)}</td>
                      <td className="px-3 py-2">{data.criterion ? potentialFromMv(data.criterion.valueMv) : "Unavailable"}</td>
                      <td className="px-3 py-2"><StatusPill value={reading.protectionStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4"><EmptyState title="No selected point history" detail="No readings are available for the selected test post." compact /></div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ComplianceTab({ data, pipelineId, pipelines, selectPipeline }: { data: CpMonitoringRealData; pipelineId: string; pipelines: PipelineRecord[]; selectPipeline: (value: string) => void }) {
  const [filters, setFilters] = useState({ region: "All Regions", status: "All Statuses", period: "Current Assessment" });
  const [selectedId, setSelectedId] = useState("");
  const hasApprovedCriteria = Boolean(data.approvedCriteria?.length);
  const cases = hasApprovedCriteria ? buildComplianceCases(data) : [];
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0] ?? null;
  const summary = buildComplianceSummary(data, cases, hasApprovedCriteria);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
  }

  const filteredCases = cases.filter((item) => filters.status === "All Statuses" || item.actionStatus === filters.status || item.severity === filters.status);

  return (
    <div className="space-y-4">
      {!hasApprovedCriteria ? <State title="Approved criteria unavailable" detail={data.availability.approvedCriteria?.reason ?? "Approved CP criteria are not connected. Compliance calculations are blocked."} tone="error" /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="SH" tone="green" label="Overall Compliance" value={percentOrNoData(summary.compliancePercent)} detail="Approved criteria only" />
        <MetricCard icon="TP" tone="green" label="Segments Within Criteria" value={formatNumber(summary.within)} detail={`${percentOrNoData(summary.compliancePercent)} of assessed readings`} />
        <MetricCard icon="!" tone="amber" label="Out-of-Criteria Points" value={formatNumber(summary.out)} detail={summary.assessed ? `${roundPercent(summary.out, summary.assessed)}%` : "No assessed readings"} />
        <MetricCard icon="OD" tone="amber" label="Overdue Actions" value="Unavailable" detail="Action register not connected" />
        <MetricCard icon="AR" tone="teal" label="Audit Readiness" value={hasApprovedCriteria ? "Partial" : "Blocked"} detail={hasApprovedCriteria ? "Approved criteria connected" : "Criteria approval missing"} />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_0.8fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Region" value={filters.region} onChange={(value) => updateFilter("region", value)}>
            <option>All Regions</option>
            <option disabled>Unavailable</option>
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option>All Statuses</option>
            <option>High</option>
            <option>Medium</option>
            <option>Open</option>
            <option>Overdue</option>
          </SelectField>
          <SelectField label="Assessment Period" value={filters.period} onChange={(value) => updateFilter("period", value)}>
            <option>Current Assessment</option>
            <option>Last 30 Days</option>
          </SelectField>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={!hasApprovedCriteria} type="button">Generate Compliance Report</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Panel className="rounded-lg p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle title="Compliance by Pipeline Segment" />
            <Legend />
          </div>
          {hasApprovedCriteria && summary.assessed ? <ComplianceStrip cases={cases} total={Math.max(data.testPoints.length, 1)} /> : <EmptyState title="Compliance map unavailable" detail="Approved criteria and assessed readings are required." />}
        </Panel>

        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-base font-bold text-slateblue-950 dark:text-white">Standards & Criteria Summary</h2>
            <button className="text-xs font-semibold text-slateblue-700" disabled type="button">Manage Standards</button>
          </div>
          {data.approvedCriteria?.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-3 py-2">Standard / Criterion</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Criteria</th><th className="px-3 py-2">Compliance</th></tr>
                </thead>
                <tbody>
                  {data.approvedCriteria.map((criterion) => (
                    <tr key={`${criterion.criteriaVersionId}-${criterion.measurementType}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold">{criterion.standardReference || criterion.criteriaSetId}</td>
                      <td className="px-3 py-2">{criterion.criteriaSetName}</td>
                      <td className="px-3 py-2">{criterion.protectionThresholdMv === null ? "Unavailable" : potentialFromMv(criterion.protectionThresholdMv)}</td>
                      <td className="px-3 py-2">{percentOrNoData(summary.compliancePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4"><EmptyState title="No approved criteria" detail="Approved criteria are required for IMG-07 compliance." compact /></div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">Non-Compliant Test Points ({formatNumber(filteredCases.length)})</h2>
            <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!filteredCases.length} type="button">Export</button>
          </div>
          {filteredCases.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-4 py-3">Test Point ID</th><th className="px-4 py-3">Pipeline / Segment</th><th className="px-4 py-3">KP</th><th className="px-4 py-3">Measured Potential</th><th className="px-4 py-3">Criterion</th><th className="px-4 py-3">Delta</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Action Status</th></tr>
                </thead>
                <tbody>
                  {filteredCases.map((item) => (
                    <tr key={item.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 ${selected?.id === item.id ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => setSelectedId(item.id)}>
                      <td className="px-4 py-3 font-semibold text-slateblue-700">{item.code}</td>
                      <td className="px-4 py-3">{data.pipeline.pipelineName} / Unavailable</td>
                      <td className="px-4 py-3">{item.kp}</td>
                      <td className="px-4 py-3">{potentialFromMv(item.valueMv)}</td>
                      <td className="px-4 py-3">{potentialFromMv(item.criterionMv)}</td>
                      <td className="px-4 py-3">{potentialFromMv(item.deltaMv)}</td>
                      <td className="px-4 py-3"><StatusPill value={item.severity} /></td>
                      <td className="px-4 py-3"><StatusPill value={item.actionStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><EmptyState title="No non-compliant cases" detail={hasApprovedCriteria ? "No assessed readings are out of approved criteria." : "Compliance cases are blocked until approved criteria are available."} /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Selected Compliance Case" />
            <button className="text-xs font-semibold text-slateblue-700" disabled type="button">View All Cases</button>
          </div>
          {selected ? (
            <>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xl font-bold text-slateblue-950 dark:text-white">{selected.code}</p>
                <StatusPill value={selected.actionStatus} />
              </div>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <DetailRow label="Pipeline / Segment" value={`${data.pipeline.pipelineName} / Unavailable`} />
                <DetailRow label="KP (km)" value={selected.kp} />
                <DetailRow label="Measured Potential" value={potentialFromMv(selected.valueMv)} />
                <DetailRow label="Criterion" value={potentialFromMv(selected.criterionMv)} />
                <DetailRow label="Delta" value={potentialFromMv(selected.deltaMv)} />
                <DetailRow label="Severity" value={selected.severity} />
                <DetailRow label="Cause" value="Unavailable - cause workflow not connected" />
                <DetailRow label="Owner" value="Unavailable" />
                <DetailRow label="Due Date" value="Unavailable" />
              </div>
              <div className="mt-4 rounded-md bg-slateblue-50 p-3 text-xs leading-5 text-slateblue-900 dark:bg-slate-950 dark:text-slate-200">Comments unavailable. Compliance remediation/action register is not connected.</div>
            </>
          ) : (
            <EmptyState title="No compliance case selected" detail="Select a non-compliant test point to view details." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function EngineeringDesignTab({
  calculations,
  data,
  engineeringError,
  loading,
  pipelineId,
  pipelines,
  selectPipeline
}: {
  calculations: CpCalculationRecord[];
  data: CpMonitoringRealData;
  engineeringError: string;
  loading: boolean;
  pipelineId: string;
  pipelines: PipelineRecord[];
  selectPipeline: (value: string) => void;
}) {
  const [filters, setFilters] = useState({ asset: "All Assets", systemType: "All Types", status: "All Statuses" });
  const [selectedId, setSelectedId] = useState(calculations[0]?.id ?? "");
  const filtered = calculations.filter((record) => matchesEngineeringFilters(record, filters, Boolean(data.approvedCriteria.length)));
  const selected = filtered.find((record) => record.id === selectedId) ?? filtered[0] ?? null;
  const summary = buildEngineeringSummary(data, calculations);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-4">
      {engineeringError ? <State title="Could not load Engineering data" detail={engineeringError} tone="error" /> : null}
      {loading ? <State title="Loading Engineering data" detail="Reading saved CP calculation/design records." /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="GE" tone="green" label="Active CP Systems" value={formatNumber(summary.activeSystems)} detail={`${formatNumber(summary.iccp)} ICCP | ${formatNumber(summary.sacp)} SACP`} />
        <MetricCard icon="DP" tone="green" label="Design Packages" value={formatNumber(calculations.length)} detail={`${formatNumber(summary.approvedCriteria)} approved criteria definitions`} />
        <MetricCard icon="A" tone="green" label="Current Demand" value="Unavailable" detail="Design demand source not connected" />
        <MetricCard icon="AB" tone="teal" label="Anode Beds" value="Unavailable" detail="Anode bed design model not connected" />
        <MetricCard icon="REV" tone="amber" label="Design Reviews Due" value="Unavailable" detail="Review schedule not connected" />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Asset / Section" value={filters.asset} onChange={(value) => updateFilter("asset", value)}>
            <option>All Assets</option>
            <option disabled>Unavailable</option>
          </SelectField>
          <SelectField label="CP System Type" value={filters.systemType} onChange={(value) => updateFilter("systemType", value)}>
            <option>All Types</option>
            <option>ICCP</option>
            <option>SACP</option>
          </SelectField>
          <SelectField label="Design Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option>All Statuses</option>
            <option>Approved</option>
            <option>Draft</option>
            <option>In Review</option>
          </SelectField>
          <button className="mt-5 text-sm font-semibold text-slateblue-700" onClick={() => setFilters({ asset: "All Assets", systemType: "All Types", status: "All Statuses" })} type="button">Clear Filters</button>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled type="button">New Design</button>
          <button className="mt-5 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slateblue-700 disabled:opacity-60" disabled type="button">Upload Basis</button>
          <button className="mt-5 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slateblue-700 disabled:opacity-60" disabled type="button">Review Design</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.85fr)]">
        <Panel className="rounded-lg p-0">
          <div className="px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">Design Register ({formatNumber(filtered.length)})</h2>
          </div>
          {filtered.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-4 py-3">Design ID</th><th className="px-4 py-3">Pipeline</th><th className="px-4 py-3">Section / Location</th><th className="px-4 py-3">CP System Type</th><th className="px-4 py-3">Design Basis</th><th className="px-4 py-3">Current Demand</th><th className="px-4 py-3">Rectifiers / Anodes</th><th className="px-4 py-3">Approval Status</th></tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 ${selected?.id === record.id ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => setSelectedId(record.id)}>
                      <td className="px-4 py-3 font-semibold text-slateblue-700">{record.id}</td>
                      <td className="px-4 py-3">{data.pipeline.pipelineCode}</td>
                      <td className="px-4 py-3">Unavailable</td>
                      <td className="px-4 py-3"><StatusPill value={record.calculationType} /></td>
                      <td className="px-4 py-3">{data.approvedCriteria[0]?.standardReference || data.approvedCriteria[0]?.criteriaSetName || "Unavailable"}</td>
                      <td className="px-4 py-3">Unavailable</td>
                      <td className="px-4 py-3">Unavailable</td>
                      <td className="px-4 py-3"><StatusPill value={data.approvedCriteria.length ? "Approved" : "Draft"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><EmptyState title="No design records" detail="No saved CP calculations/design records are available for this pipeline." /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title={`Selected Design: ${selected?.id ?? "Unavailable"}`} />
            <StatusPill value={data.approvedCriteria.length ? "Approved" : "Unavailable"} />
          </div>
          {selected ? (
            <>
              <div className="mt-4 grid grid-cols-4 gap-1 border-b border-slate-200 pb-2 text-center text-xs text-slateblue-700 dark:border-slate-700">
                <span className="font-bold">Overview</span><span>Schematic</span><span>Documents</span><span>Review</span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <DetailRow label="Design ID" value={selected.id} />
                  <DetailRow label="Pipeline" value={data.pipeline.pipelineCode} />
                  <DetailRow label="CP System Type" value={selected.calculationType} />
                  <DetailRow label="Design Basis" value={data.approvedCriteria[0]?.standardReference || "Unavailable"} />
                  <DetailRow label="Criteria Set" value={data.approvedCriteria[0]?.criteriaSetName || "Unavailable"} />
                  <DetailRow label="Criteria Version" value={data.approvedCriteria[0]?.version || "Unavailable"} />
                  <DetailRow label="Design Date" value={formatDate(selected.createdAt)} />
                  <DetailRow label="Designed By" value={selected.createdByName ?? "Unavailable"} />
                  <DetailRow label="Approval Status" value={data.approvedCriteria.length ? "Approved Criteria Available" : "Unavailable"} />
                </div>
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">CP System One-Line Schematic</p>
                  <p className="mt-2">Schematic/design configuration model is not connected.</p>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <DetailRow label="Key Input" value={JSON.stringify(selected.input).slice(0, 160)} />
                <DetailRow label="Key Result" value={JSON.stringify(selected.result).slice(0, 160)} />
              </div>
            </>
          ) : (
            <EmptyState title="No design selected" detail="Select a saved CP calculation/design record." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="rounded-lg p-4">
          <SectionTitle title="Engineering Calculators & Design Tools" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {["Current Demand Calculator", "Anode Bed Sizing", "Coating Breakdown Analysis", "Design Report Generator"].map((item) => (
              <div key={item} className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold text-slateblue-950 dark:text-white">{item}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Available in CP calculation/design workflows where configured.</p>
                <button className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slateblue-700" disabled type="button">Open Tool</button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="rounded-lg p-4">
          <SectionTitle title="Quick Links" />
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-semibold text-slateblue-700">Design Standards</p>
            <p className="text-xs text-slate-500">{data.approvedCriteria.map((criterion) => criterion.standardReference || criterion.criteriaSetName).filter(Boolean).join(", ") || "Unavailable"}</p>
            <p className="font-semibold text-slateblue-700">Typical Drawings</p>
            <p className="text-xs text-slate-500">Document linkage unavailable.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AlertsEventsTab({ data, pipelineId, pipelines, selectPipeline }: { data: CpMonitoringRealData; pipelineId: string; pipelines: PipelineRecord[]; selectPipeline: (value: string) => void }) {
  const [filters, setFilters] = useState({ severity: "All Severities", status: "All Statuses", alertType: "All Alert Types", dateRange: "Last 30 Days" });
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
const pageSize = 6;
  const alerts = buildCpAlerts(data);
  const filtered = alerts.filter((alert) => matchesAlertFilters(alert, filters));
  const selected = filtered.find((alert) => alert.id === selectedId) ?? filtered[0] ?? null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageAlerts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const summary = buildAlertSummary(alerts);
  const timeline = selected ? buildAlertTimeline(data, selected) : [];

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  function resetFilters() {
    setFilters({ severity: "All Severities", status: "All Statuses", alertType: "All Alert Types", dateRange: "Last 30 Days" });
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <State title="Alert workflow unavailable" detail="No persisted CP alert/event API is configured. This tab derives operational alerts from existing CP readings, rectifier states, and interference records." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="AL" tone="amber" label="Active CP Alerts" value={formatNumber(summary.active)} detail={`${formatNumber(summary.lastSevenDays)} in last 7 days`} />
        <MetricCard icon="!" tone="amber" label="Critical Alerts" value={formatNumber(summary.critical)} detail="Derived from connected CP data" />
        <MetricCard icon="OK" tone="green" label="Acknowledged Today" value="Unavailable" detail="Acknowledgement workflow not connected" />
        <MetricCard icon="RE" tone="teal" label="Recurring Issues" value={formatNumber(summary.recurring)} detail="Assets with repeated derived alerts" />
        <MetricCard icon="ST" tone="amber" label="Stale Readings" value={formatNumber(summary.stale)} detail="> 7 days" />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.1fr_0.8fr_0.8fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Severity" value={filters.severity} onChange={(value) => updateFilter("severity", value)}>
            <option>All Severities</option>
            <option>Critical</option>
            <option>Major</option>
            <option>Minor</option>
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option>All Statuses</option>
            <option>Open</option>
            <option>Acknowledged</option>
            <option>Resolved</option>
          </SelectField>
          <SelectField label="Alert Type" value={filters.alertType} onChange={(value) => updateFilter("alertType", value)}>
            <option>All Alert Types</option>
            <option>Potential Out of Criteria</option>
            <option>Rectifier Offline</option>
            <option>Output Current Low</option>
            <option>Interference Detected</option>
            <option>Stale Reading</option>
          </SelectField>
          <SelectField label="Date Range" value={filters.dateRange} onChange={(value) => updateFilter("dateRange", value)}>
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>All Dates</option>
          </SelectField>
          <button className="mt-5 text-sm font-semibold text-slateblue-700" onClick={resetFilters} type="button">Clear Filters</button>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white" type="button">Apply Filters</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_300px_minmax(360px,0.75fr)]">
        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">CP Alerts & Events ({formatNumber(filtered.length)})</h2>
            <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!filtered.length} type="button">Export</button>
          </div>
          {pageAlerts.length ? (
            <>
              <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                    <tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Test Post / Rectifier</th><th className="px-4 py-3">Event Type</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assignee</th></tr>
                  </thead>
                  <tbody>
                    {pageAlerts.map((alert) => (
                      <tr key={alert.id} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 ${selected?.id === alert.id ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => setSelectedId(alert.id)}>
                        <td className="px-4 py-3">{formatDateTime(alert.timestamp)}</td>
                        <td className="px-4 py-3">{alert.source}</td>
                        <td className="px-4 py-3 font-semibold text-slateblue-700">{alert.assetId}</td>
                        <td className="px-4 py-3">{alert.eventType}</td>
                        <td className="px-4 py-3"><StatusPill value={alert.severity} /></td>
                        <td className="px-4 py-3"><StatusPill value={alert.status} /></td>
                        <td className="px-4 py-3">{alert.assignee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {formatNumber((safePage - 1) * pageSize + 1)}-{formatNumber((safePage - 1) * pageSize + pageAlerts.length)} of {formatNumber(filtered.length)} alerts</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} type="button">Prev</button>
                  <span className="rounded-md bg-slateblue-600 px-3 py-1 font-semibold text-white">{safePage}</span>
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5"><EmptyState title="No alerts found" detail="No connected CP records match the selected alert filters." /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <SectionTitle title={`Event Timeline - ${selected?.assetId ?? "Unavailable"}`} />
          {timeline.length ? (
            <div className="mt-4 space-y-4">
              {timeline.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="border-l-2 border-slateblue-200 pl-4 dark:border-slate-700">
                  <p className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</p>
                  <p className="font-semibold text-slateblue-950 dark:text-white">{event.title}</p>
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{event.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No event history" detail="Historical readings/events are unavailable for the selected alert." />
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Selected Alert Details" />
            <button className="text-xl leading-none text-slateblue-700" disabled type="button">x</button>
          </div>
          {selected ? (
            <>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slateblue-950 dark:text-white">{selected.eventType}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(selected.timestamp)}</p>
                </div>
                <StatusPill value={selected.severity} />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{selected.details}</p>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <DetailRow label="Source" value={selected.source} />
                <DetailRow label="Related Asset" value={`${selected.assetId} (${selected.assetKind})`} />
                <DetailRow label="Pipeline" value={data.pipeline.pipelineName} />
                <DetailRow label="Location" value={selected.location} />
                <DetailRow label="Measured Value" value={selected.measuredValue} />
                <DetailRow label="Criterion" value={selected.criterion} />
                <DetailRow label="Status" value={selected.status} />
                <DetailRow label="Assignee" value={selected.assignee} />
              </div>
              <div className="mt-4 space-y-2">
                <ActionButton disabled label="Acknowledge" />
                <ActionButton disabled label="Create Work Order" />
                <ActionButton disabled label="Create Investigation" />
              </div>
              <p className="mt-3 text-xs text-slate-500">Alert persistence, assignment, comments, work orders, and investigations require a dedicated backend workflow.</p>
            </>
          ) : (
            <EmptyState title="No alert selected" detail="Select an alert row to view operational details." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function ConfigurationTab({
  calculations,
  data,
  loading,
  pipelineId,
  pipelines,
  selectPipeline
}: {
  calculations: CpCalculationRecord[];
  data: CpMonitoringRealData;
  loading: boolean;
  pipelineId: string;
  pipelines: PipelineRecord[];
  selectPipeline: (value: string) => void;
}) {
  const summary = buildConfigurationSummary(data, calculations);
  const criteriaRows = data.approvedCriteria;
  const thresholdRows = data.approvedCriteria.filter((criterion) => criterion.protectionThresholdMv !== null || criterion.marginalThresholdMv !== null || criterion.overProtectionThresholdMv !== null);
  const linkedSources = buildLinkedDataSources(data);
  const moduleSettings = buildModuleSettings(data);

  return (
    <div className="space-y-4">
      {loading ? <State title="Loading configuration data" detail="Reading existing CP criteria and engineering calculation records." /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="CS" tone="green" label="Active Criteria Sets" value={formatNumber(summary.criteriaSets)} detail={`${formatNumber(summary.criteriaVersions)} approved versions`} />
        <MetricCard icon="TR" tone="green" label="Threshold Rules" value={formatNumber(thresholdRows.length)} detail={`${formatNumber(summary.activeThresholds)} active | inactive unavailable`} />
        <MetricCard icon="RG" tone="teal" label="Route Groups" value="Unavailable" detail="Route grouping config not connected" />
        <MetricCard icon="UV" tone="teal" label="User Views" value="Unavailable" detail="Saved CP views not connected" />
        <MetricCard icon="WF" tone="amber" label="Configured Workflows" value="Unavailable" detail="Workflow config not connected" />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_0.8fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Criteria Status" value="Approved" onChange={() => undefined} disabled>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Configuration Scope" value="Pipeline" onChange={() => undefined} disabled>
            <option>Pipeline</option>
          </SelectField>
          <SelectField label="Source" value="Existing APIs" onChange={() => undefined} disabled>
            <option>Existing APIs</option>
          </SelectField>
          <button className="mt-5 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slateblue-700 disabled:opacity-60" disabled type="button">Edit Settings</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="CP Criteria & Standards" action="Add Criteria Set" />
          {criteriaRows.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Standard / Reference</th><th className="px-3 py-2">Version</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {criteriaRows.map((criterion) => (
                    <tr key={`${criterion.criteriaVersionId}-${criterion.measurementType}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold">{criterion.criteriaSetName}</td>
                      <td className="px-3 py-2">{criterion.standardReference || "Unavailable"}</td>
                      <td className="px-3 py-2">{criterion.version}</td>
                      <td className="px-3 py-2"><StatusPill value="Active" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4"><EmptyState title="No approved criteria" detail={data.availability.approvedCriteria.reason} compact /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="Potential Thresholds" action="Add Threshold Rule" />
          {thresholdRows.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">ON/OFF Potential</th><th className="px-3 py-2">Marginal</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {thresholdRows.map((criterion) => (
                    <tr key={`${criterion.criteriaVersionId}-${criterion.measurementType}-threshold`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold">{criterion.criteriaSetName}</td>
                      <td className="px-3 py-2">{potentialFromMv(criterion.protectionThresholdMv)}</td>
                      <td className="px-3 py-2">{potentialFromMv(criterion.marginalThresholdMv)}</td>
                      <td className="px-3 py-2"><StatusPill value="Active" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4"><EmptyState title="No threshold rules" detail="Approved criteria are connected, but no threshold values are available." compact /></div>
          )}
        </Panel>

        <BlockedTable title="Rectifier Categories" columns={["Category", "Description", "Typical Range", "Status"]} reason="Rectifier category configuration is not exposed by the current backend." />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <BlockedTable title="Test-Post Classes" columns={["Class", "Description", "Default Criteria Set", "Status"]} reason="Test-post class configuration is not exposed by the current backend." />
        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="Survey Templates" action="Manage Templates" />
          {data.surveys.length ? (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                  <tr><th className="px-3 py-2">Template Name</th><th className="px-3 py-2">Survey Type</th><th className="px-3 py-2">Last Used</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {data.surveys.slice(0, 4).map((survey) => (
                    <tr key={survey.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-semibold">{survey.surveyName || survey.id}</td>
                      <td className="px-3 py-2">ON/OFF</td>
                      <td className="px-3 py-2">{formatDate(survey.surveyDate)}</td>
                      <td className="px-3 py-2"><StatusPill value={survey.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4"><EmptyState title="No survey template source" detail="Dedicated survey templates are not connected; existing survey records are unavailable." compact /></div>
          )}
        </Panel>
        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="Alert Rules" action="Configure Alerts" />
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                <tr><th className="px-3 py-2">Rule Name</th><th className="px-3 py-2">Trigger Condition</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {buildDerivedAlertRules(data).map((rule) => (
                  <tr key={rule.name} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-semibold">{rule.name}</td>
                    <td className="px-3 py-2">{rule.condition}</td>
                    <td className="px-3 py-2"><StatusPill value={rule.severity} /></td>
                    <td className="px-3 py-2"><StatusPill value={rule.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="Linked Data Sources" action="Open Integration Hub" />
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                <tr><th className="px-3 py-2">Source Name</th><th className="px-3 py-2">Source Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Description</th></tr>
              </thead>
              <tbody>
                {linkedSources.map((source) => (
                  <tr key={source.name} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-semibold">{source.name}</td>
                    <td className="px-3 py-2">{source.type}</td>
                    <td className="px-3 py-2"><StatusPill value={source.status} /></td>
                    <td className="px-3 py-2">{source.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <BlockedTable title="Permissions & Access" columns={["Role / Group", "Access Level", "Description", "Users"]} reason="CP-specific permissions and access groups are not exposed by the current backend." />

        <Panel className="rounded-lg p-0">
          <ConfigPanelHeader title="Module Settings" action="Edit Settings" />
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slateblue-50 text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                <tr><th className="px-3 py-2">Setting</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Description</th></tr>
              </thead>
              <tbody>
                {moduleSettings.map((setting) => (
                  <tr key={setting.name} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-semibold">{setting.name}</td>
                    <td className="px-3 py-2">{setting.value}</td>
                    <td className="px-3 py-2">{setting.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CipsInterferenceTab({ data, pipelineId, pipelines, selectPipeline }: { data: CpMonitoringRealData; pipelineId: string; pipelines: PipelineRecord[]; selectPipeline: (value: string) => void }) {
  const [filters, setFilters] = useState({ segment: "All Segments", dateRange: "Last 12 Months", interferenceType: "All Types" });
  const [selectedId, setSelectedId] = useState(data.strayCurrent[0]?.testPointId ?? "");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const findings = data.strayCurrent.filter((item) => matchesInterferenceFilters(item, filters));
  const selected = findings.find((item) => item.testPointId === selectedId) ?? findings[0] ?? null;
  const pageCount = Math.max(1, Math.ceil(findings.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageFindings = findings.slice((safePage - 1) * pageSize, safePage * pageSize);
  const summary = buildInterferenceSummary(data);
  const chartPoints = buildCipsChartPoints(data);

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  function resetFilters() {
    setFilters({ segment: "All Segments", dateRange: "Last 12 Months", interferenceType: "All Types" });
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon="CP" tone="teal" label="CIPS Runs" value={formatNumber(data.surveys.length)} detail={`${formatNumber(summary.completedSurveys)} Completed | schedule unavailable`} />
        <MetricCard icon="AC" tone="amber" label="AC Interference Points" value={formatNumber(summary.interferencePoints)} detail={`${formatNumber(summary.high)} High | ${formatNumber(summary.medium)} Medium | ${formatNumber(summary.low)} Low`} />
        <MetricCard icon="DC" tone="teal" label="DC Interference Issues" value="Unavailable" detail="DC shift source not connected" />
        <MetricCard icon="!" tone="amber" label="Defects / Hotspots" value={formatNumber(summary.hotspots)} detail="From connected interference readings" />
        <MetricCard icon="OK" tone="green" label="Mitigated Locations" value="Unavailable" detail="Mitigation workflow not connected" />
      </div>

      <Panel className="rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.6fr]">
          <SelectField label="Pipeline" value={pipelineId} onChange={selectPipeline}>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}
          </SelectField>
          <SelectField label="Segment" value={filters.segment} onChange={(value) => updateFilter("segment", value)}>
            <option>All Segments</option>
            <option disabled>Unavailable</option>
          </SelectField>
          <SelectField label="Survey Date" value={filters.dateRange} onChange={(value) => updateFilter("dateRange", value)}>
            <option>Last 12 Months</option>
            <option>Last 30 Days</option>
            <option>All Dates</option>
          </SelectField>
          <SelectField label="Interference Type" value={filters.interferenceType} onChange={(value) => updateFilter("interferenceType", value)}>
            <option>All Types</option>
            <option>AC Interference</option>
            <option>DC Interference</option>
          </SelectField>
          <button className="mt-5 rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setPage(1)} type="button">Apply Filters</button>
          <button className="mt-5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slateblue-700" onClick={resetFilters} type="button">Reset</button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Panel className="rounded-lg p-4">
          <SectionTitle title="CIPS Longitudinal CP Gradient & Interference" />
          {chartPoints.length ? <CipsGradientChart points={chartPoints} /> : <EmptyState title="No CIPS/interference chart data" detail="No potential or stray-current readings are available from CpReadingHistory for this pipeline." />}
        </Panel>
        <Panel className="rounded-lg p-4">
          <SectionTitle title="Interference Hotspots Map" />
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slateblue-950 p-4 text-white dark:border-slate-700">
            {findings.length ? (
              <div className="relative h-52">
                <div className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/70" />
                {findings.slice(0, 10).map((item, index) => (
                  <button key={item.testPointId} className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white ${severityForInterference(item) === "High" ? "bg-red-500" : severityForInterference(item) === "Medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ left: `${8 + index * (84 / Math.max(1, Math.min(findings.length, 10) - 1))}%` }} title={`${item.code}: ${numberUnit(item.strayCurrentMa, "mA")}`} type="button" onClick={() => setSelectedId(item.testPointId)} />
                ))}
                <div className="absolute bottom-0 right-0 rounded-md bg-slate-900/80 p-3 text-xs leading-5">
                  <p>Pipeline Route</p>
                  <p>Red: High</p>
                  <p>Amber: Medium</p>
                  <p>Green: Low</p>
                </div>
              </div>
            ) : (
              <EmptyState title="No hotspots" detail={data.availability.strayCurrent.reason} />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Panel className="rounded-lg p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold text-slateblue-950 dark:text-white">Interference Findings</h2>
            <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!findings.length} type="button">View Hotspots</button>
          </div>
          {pageFindings.length ? (
            <>
              <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slateblue-50 text-xs text-slateblue-950 dark:bg-slate-950 dark:text-slate-200">
                    <tr>
                      <th className="w-10 px-4 py-3"><span className="sr-only">Selected</span></th>
                      <th className="px-3 py-3">Point ID</th>
                      <th className="px-3 py-3">KP</th>
                      <th className="px-3 py-3">Interference Type</th>
                      <th className="px-3 py-3">AC Voltage (V)</th>
                      <th className="px-3 py-3">DC Shift (V)</th>
                      <th className="px-3 py-3">Severity</th>
                      <th className="px-3 py-3">Mitigation Status</th>
                      <th className="px-3 py-3">Date Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageFindings.map((item) => {
                      const selected = item.testPointId === selectedId;
                      return (
                        <tr key={item.testPointId} className={`cursor-pointer border-t border-slate-100 hover:bg-slateblue-50/70 dark:border-slate-800 dark:hover:bg-slate-800 ${selected ? "bg-slateblue-50 dark:bg-slate-800" : ""}`} onClick={() => setSelectedId(item.testPointId)}>
                          <td className="px-4 py-3"><input aria-label={`Select ${item.code}`} checked={selected} readOnly type="checkbox" /></td>
                          <td className="px-3 py-3 font-semibold text-slateblue-700">{item.code}</td>
                          <td className="px-3 py-3">{item.location || "Unavailable"}</td>
                          <td className="px-3 py-3">AC Interference</td>
                          <td className="px-3 py-3">{numberUnit(item.strayCurrentMa, "mA")}</td>
                          <td className="px-3 py-3">Unavailable</td>
                          <td className="px-3 py-3"><StatusPill value={severityForInterference(item)} /></td>
                          <td className="px-3 py-3"><StatusPill value="Open" /></td>
                          <td className="px-3 py-3">{formatDate(item.readingAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <span>Showing {formatNumber((safePage - 1) * pageSize + 1)} to {formatNumber(Math.min(safePage * pageSize, findings.length))} of {formatNumber(findings.length)} findings</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} type="button">Prev</button>
                  <span className="rounded-md bg-slateblue-600 px-3 py-1 font-semibold text-white">{safePage}</span>
                  <button className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5"><EmptyState title="No interference findings" detail={data.availability.strayCurrent.reason} /></div>
          )}
        </Panel>

        <Panel className="rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Selected Hotspot Details" />
            <button className="text-xl leading-none text-slateblue-700" disabled type="button">x</button>
          </div>
          {selected ? (
            <>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <DetailRow label="Point ID" value={selected.code} />
                <DetailRow label="Kilometre Point (KP)" value={selected.location || "Unavailable"} />
                <DetailRow label="Interference Type" value="AC Interference" />
                <DetailRow label="AC Voltage (RMS)" value={numberUnit(selected.strayCurrentMa, "mA")} />
                <DetailRow label="DC Shift" value="Unavailable" />
                <DetailRow label="Severity" value={severityForInterference(selected)} />
                <DetailRow label="Mitigation Status" value="Open" />
                <DetailRow label="Date Detected" value={formatDate(selected.readingAt)} />
                <DetailRow label="Location" value={selected.location || "Unavailable"} />
              </div>
              <div className="mt-4 rounded-md border border-slate-200 bg-slateblue-50 p-3 text-xs leading-5 text-slateblue-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <p className="font-bold">Assessment & Recommendations</p>
                <p className="mt-2">Assessment text is unavailable because no dedicated interference assessment record/API is connected.</p>
              </div>
              <div className="mt-4 grid gap-2">
                <ActionButton disabled label="Raise Mitigation Action" />
                <ActionButton disabled label="Create Assessment Report" />
              </div>
            </>
          ) : (
            <EmptyState title="No hotspot selected" detail="Select an interference finding to view details." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function CpHeader({ canExport, onExport }: { canExport: boolean; onExport: () => void }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slateblue-600 text-xl font-bold text-white">CP</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Cathodic Protection (CP)</h1>
          <p className="mt-1 text-sm text-slateblue-700 dark:text-slate-300">Monitor CP system performance, potentials, rectifiers and test posts. Ensure compliance and effectiveness.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slateblue-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={!canExport} onClick={onExport} type="button">Export</button>
        <button className="rounded-md bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60" disabled title="Add CP Asset requires the controlled Asset Master link workflow." type="button">Add CP Asset</button>
      </div>
    </div>
  );
}

function TabBar({ activeTab, onChange }: { activeTab: string; onChange: (tab: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slateblue-50/60 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-w-max">
        {tabs.map((tab) => (
          <button key={tab} className={`border-r border-slate-200 px-5 py-3 text-sm font-semibold last:border-r-0 dark:border-slate-700 ${tab === activeTab ? "border-t-2 border-t-slateblue-600 bg-white text-slateblue-700 dark:bg-slate-950" : "text-slateblue-800 hover:bg-white/70 dark:text-slate-300 disabled:opacity-60"}`} disabled={tab !== "Overview" && tab !== "Test Posts" && tab !== "Rectifiers" && tab !== "ON/OFF Surveys" && tab !== "CIPS & Interference" && tab !== "Trends & Historical" && tab !== "Compliance" && tab !== "Engineering & Design" && tab !== "Alerts & Events" && tab !== "Configuration"} onClick={() => onChange(tab)} type="button">
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children, disabled = false }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="text-xs font-semibold text-slateblue-900 dark:text-slate-200">
      {label}
      <select className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function SelectBare({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  );
}

function MetricCard({ icon, tone, label, value, detail }: { icon: string; tone: "green" | "amber" | "teal"; label: string; value: string; detail: string }) {
  const tones = {
    green: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
    teal: "bg-teal-600 text-white"
  };

  return (
    <article className="flex min-h-[96px] items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold text-slateblue-950 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-slateblue-700 dark:text-slate-300">{label}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </article>
  );
}

function SelectedTestPointPanel({ selected, data, linkedRecord, masterSegments }: { selected: TestPoint | null; data: CpMonitoringRealData; linkedRecord: CpLinkedTestPointRecord | null; masterSegments: Array<{ id: string; segmentId: string }> }) {
  function scrollToTrend() {
    document.getElementById("cp-selected-trend")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Panel className="rounded-lg p-0">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slateblue-950 dark:text-white">Selected Test Post Details</h2>
        <button className="text-xl leading-none text-slateblue-700" type="button" aria-label="Clear selected test post" disabled>x</button>
      </div>
      {selected ? (
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-slateblue-950 dark:text-white">{selected.code}</p>
              <p className="text-xs text-slate-500">{selected.location || selected.kp || "Location not recorded"}</p>
            </div>
            <StatusPill value={selected.protectionStatus || "Unknown"} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ActionButton disabled={!selected} label="View Trend" onClick={scrollToTrend} />
            <ActionButton disabled label="View Asset" />
            <ActionButton disabled label="Edit" />
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <DetailRow label="Test Post ID" value={selected.code} />
            <DetailRow label="Pipeline" value={`${data.pipeline.pipelineCode} - ${data.pipeline.pipelineName}`} />
            <DetailRow label="Segment" value={segmentDisplayName(linkedRecord?.asset?.segmentId, masterSegments)} />
            <DetailRow label="KP Location" value={linkedRecord?.asset?.kp ?? selected.kp ?? "Not Available"} />
            <DetailRow label="Side" value={linkedRecord?.asset?.side ?? "Not Available"} />
            <DetailRow label="Structure Type" value="Test Post" />
            <DetailRow label="ON Potential" value={potentialFromMv(selected.eOnMv)} />
            <DetailRow label="OFF Potential" value={potentialFromMv(selected.eOffMv)} />
            <DetailRow label="Criteria" value={data.criterion ? `${data.criterion.valueMv} mV` : "Not connected"} />
            <DetailRow label="Status" value={displayEnum(selected.protectionStatus)} />
            <DetailRow label="Last Reading" value={selected.readingAt ? new Date(selected.readingAt).toLocaleString() : "Not Available"} />
            <DetailRow label="Interference" value={displayEnum(selected.interferenceStatus)} />
            <DetailRow label="Linked Asset" value={linkedRecord?.asset?.assetId ?? "Not Available"} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ActionButton disabled label="View on Map" />
            <ActionButton disabled label="Raise Action" />
            <ActionButton disabled label="Documents" />
          </div>
        </div>
      ) : (
        <div className="p-4">
          <EmptyState title="No test post selected" detail={data.availability.testPoints.reason} />
        </div>
      )}
    </Panel>
  );
}

function DistributionChart({ centerValue, centerLabel, items }: { centerValue: string; centerLabel: string; items: Array<{ label: string; count: number; percent: number | null; tone: "green" | "amber" | "red" }> }) {
  const total = Math.max(1, items.reduce((sum, item) => sum + item.count, 0));
  let offset = 0;
  const colors = { green: "#16a34a", amber: "#f59e0b", red: "#ef4444" };

  return (
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="42" fill="none" stroke="#e5edf7" strokeWidth="18" />
          {items.map((item) => {
            const length = (item.count / total) * 264;
            const strokeDasharray = `${length} ${264 - length}`;
            const strokeDashoffset = -offset;
            offset += length;
            return <circle key={item.label} cx="60" cy="60" r="42" fill="none" stroke={colors[item.tone]} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="butt" strokeWidth="18" />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-xl text-slateblue-950 dark:text-white">{centerValue}</strong>
          <span className="text-xs text-slateblue-700 dark:text-slate-300">{centerLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slateblue-800 dark:text-slate-200">
              <span className={`h-3 w-3 shrink-0 rounded-sm ${item.tone === "green" ? "bg-emerald-500" : item.tone === "amber" ? "bg-amber-500" : "bg-red-500"}`} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-medium text-slateblue-700 dark:text-slate-300">
              {formatNumber(item.count)} {item.percent === null ? "" : `(${item.percent}%)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceStrip({ cases, total }: { cases: Array<{ id: string; severity: "High" | "Medium"; actionStatus: string }>; total: number }) {
  const slots = Array.from({ length: Math.max(total, cases.length, 12) });
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slateblue-700">
        <span>KP (km)</span>
        <span>Compliance</span>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {slots.map((_, index) => {
          const item = cases[index];
          const color = item ? item.severity === "High" ? "bg-red-500" : "bg-amber-500" : "bg-emerald-500";
          return <div key={index} className={`h-7 rounded-sm ${color}`} title={item ? item.id : "Within Criteria"} />;
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slateblue-700">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Within Criteria</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-500" />Out of Criteria</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-slate-300" />Not Assessed</span>
      </div>
    </div>
  );
}

function CpProfileChart({ points, criterion, selectedId, onSelect }: { points: Array<{ id: string; label: string; value: number; band: "within" | "marginal" | "out" }>; criterion: CpMonitoringRealData["criterion"]; selectedId: string; onSelect: (id: string) => void }) {
  const width = 860;
  const height = 230;
  const left = 56;
  const right = 24;
  const top = 18;
  const bottom = 42;
  const values = [...points.map((point) => point.value), ...(criterion ? [criterion.valueMv] : [])];
  const min = Math.min(...values, -1500) - 100;
  const max = Math.max(...values, 0) + 100;
  const x = (index: number) => (points.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / (points.length - 1)));
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / Math.max(1, max - min));
  const pointColor = { within: "fill-emerald-500", marginal: "fill-amber-500", out: "fill-red-500" };

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
      <svg className="h-auto w-full min-w-[620px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pipeline CP profile">
        {[0, 1, 2, 3, 4].map((tick) => {
          const yy = top + tick * ((height - top - bottom) / 4);
          return <line key={tick} x1={left} x2={width - right} y1={yy} y2={yy} className="stroke-slate-200 dark:stroke-slate-800" />;
        })}
        {criterion ? (
          <g>
            <line x1={left} x2={width - right} y1={y(criterion.valueMv)} y2={y(criterion.valueMv)} className="stroke-red-500" strokeDasharray="5 5" strokeWidth="2" />
            <text x={width - right - 4} y={y(criterion.valueMv) - 6} textAnchor="end" className="fill-slateblue-700 text-[10px]">
              Criterion ({potentialFromMv(criterion.valueMv)})
            </text>
          </g>
        ) : null}
        <polyline points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")} fill="none" className="stroke-slateblue-300" strokeWidth="2" />
        {points.map((point, index) => (
          <g key={point.id} className="cursor-pointer" onClick={() => onSelect(point.id)}>
            <circle cx={x(index)} cy={y(point.value)} r={selectedId === point.id ? 7 : 5} className={`${pointColor[point.band]} stroke-white dark:stroke-slate-950`} strokeWidth="2">
              <title>{`${point.label}: ${potentialFromMv(point.value)}`}</title>
            </circle>
          </g>
        ))}
        <text x={left} y={height - 10} className="fill-slateblue-700 text-[11px]">Kilometre Point (KP)</text>
        <text x="12" y={top + 70} className="fill-slateblue-700 text-[11px]" transform={`rotate(-90 12 ${top + 70})`}>Potential (mV)</text>
      </svg>
    </div>
  );
}

function OnOffProfileChart({ points, criterion }: { points: Array<{ id: string; kp: string; on: number | null; off: number | null }>; criterion: number | null }) {
  const width = 680;
  const height = 250;
  const left = 54;
  const right = 22;
  const top = 20;
  const bottom = 44;
  const values = [
    ...points.flatMap((point) => [point.on, point.off]).filter((value): value is number => value !== null),
    ...(criterion === null ? [] : [criterion])
  ];
  const min = Math.min(...values, -1600) - 100;
  const max = Math.max(...values, -200) + 100;
  const x = (index: number) => (points.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / Math.max(1, points.length - 1)));
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / Math.max(1, max - min));
  const onPath = points.map((point, index) => point.on === null ? "" : `${x(index)},${y(point.on)}`).filter(Boolean).join(" ");
  const offPath = points.map((point, index) => point.off === null ? "" : `${x(index)},${y(point.off)}`).filter(Boolean).join(" ");

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-2 flex flex-wrap justify-center gap-4 text-xs text-slateblue-700 dark:text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded bg-slateblue-600" />ON Potential</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded bg-emerald-500" />OFF Potential</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t border-dashed border-red-500" />Criterion</span>
      </div>
      <svg className="h-auto w-full min-w-[520px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ON versus OFF potential profile">
        {[0, 1, 2, 3, 4].map((tick) => {
          const yy = top + tick * ((height - top - bottom) / 4);
          return <line key={tick} x1={left} x2={width - right} y1={yy} y2={yy} className="stroke-slate-200 dark:stroke-slate-800" />;
        })}
        {criterion !== null ? <line x1={left} x2={width - right} y1={y(criterion)} y2={y(criterion)} className="stroke-red-500" strokeDasharray="5 5" strokeWidth="2" /> : null}
        <polyline points={onPath} fill="none" className="stroke-slateblue-600" strokeWidth="3" />
        <polyline points={offPath} fill="none" className="stroke-emerald-500" strokeWidth="3" />
        {points.map((point, index) => (
          <g key={point.id}>
            {point.on !== null ? <circle cx={x(index)} cy={y(point.on)} r="3.5" className="fill-slateblue-600" /> : null}
            {point.off !== null ? <circle cx={x(index)} cy={y(point.off)} r="3.5" className="fill-emerald-500" /> : null}
            <text x={x(index)} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[10px]">{point.kp}</text>
          </g>
        ))}
        <text x="8" y={top + 80} className="fill-slateblue-700 text-[11px]" transform={`rotate(-90 8 ${top + 80})`}>Potential (mV vs CSE)</text>
      </svg>
    </div>
  );
}

function CipsGradientChart({ points }: { points: Array<{ id: string; label: string; potential: number | null; stray: number | null; hotspot: boolean }> }) {
  const width = 760;
  const height = 250;
  const left = 56;
  const right = 38;
  const top = 20;
  const bottom = 44;
  const potentials = points.map((point) => point.potential).filter((value): value is number => value !== null);
  const strays = points.map((point) => point.stray).filter((value): value is number => value !== null);
  const minPotential = Math.min(...potentials, -1600) - 100;
  const maxPotential = Math.max(...potentials, 0) + 100;
  const maxStray = Math.max(...strays, 1);
  const x = (index: number) => (points.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / Math.max(1, points.length - 1)));
  const yPotential = (value: number) => top + (maxPotential - value) * ((height - top - bottom) / Math.max(1, maxPotential - minPotential));
  const yStray = (value: number) => top + (maxStray - value) * ((height - top - bottom) / Math.max(1, maxStray));
  const potentialPath = points.map((point, index) => point.potential === null ? "" : `${x(index)},${yPotential(point.potential)}`).filter(Boolean).join(" ");
  const strayPath = points.map((point, index) => point.stray === null ? "" : `${x(index)},${yStray(point.stray)}`).filter(Boolean).join(" ");

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slateblue-700 dark:text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded bg-emerald-500" />Pipe-to-Soil Potential</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t border-dashed border-slateblue-600" />Interference Signal</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" />Interference Point</span>
      </div>
      <svg className="h-auto w-full min-w-[580px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="CIPS gradient and interference">
        {[0, 1, 2, 3, 4].map((tick) => {
          const yy = top + tick * ((height - top - bottom) / 4);
          return <line key={tick} x1={left} x2={width - right} y1={yy} y2={yy} className="stroke-slate-200 dark:stroke-slate-800" />;
        })}
        <polyline points={potentialPath} fill="none" className="stroke-emerald-500" strokeWidth="3" />
        <polyline points={strayPath} fill="none" className="stroke-slateblue-600" strokeDasharray="5 5" strokeWidth="2" />
        {points.map((point, index) => (
          <g key={point.id}>
            {point.hotspot ? <circle cx={x(index)} cy={point.potential === null ? yStray(point.stray ?? 0) : yPotential(point.potential)} r="5" className="fill-red-500 stroke-white" strokeWidth="2" /> : null}
            <text x={x(index)} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[10px]">{point.label}</text>
          </g>
        ))}
        <text x="10" y={top + 80} className="fill-slateblue-700 text-[11px]" transform={`rotate(-90 10 ${top + 80})`}>Potential / Signal</text>
      </svg>
    </div>
  );
}

function HistoricalPotentialChart({ readings, criterion }: { readings: CpMonitoringRealData["trend"]; criterion: number | null }) {
  const width = 760;
  const height = 290;
  const left = 58;
  const right = 24;
  const top = 22;
  const bottom = 54;
  const values = [...readings.map((reading) => reading.valueMv).filter((value): value is number => value !== null), ...(criterion === null ? [] : [criterion])];
  const min = Math.min(...values, -1600) - 100;
  const max = Math.max(...values, -200) + 100;
  const x = (index: number) => (readings.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / Math.max(1, readings.length - 1)));
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / Math.max(1, max - min));
  const path = readings.map((reading, index) => reading.valueMv === null ? "" : `${x(index)},${y(reading.valueMv)}`).filter(Boolean).join(" ");

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
      <svg className="h-auto w-full min-w-[580px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historical CP potential trend">
        {[0, 1, 2, 3, 4].map((tick) => {
          const yy = top + tick * ((height - top - bottom) / 4);
          return <line key={tick} x1={left} x2={width - right} y1={yy} y2={yy} className="stroke-slate-200 dark:stroke-slate-800" />;
        })}
        {criterion !== null ? <line x1={left} x2={width - right} y1={y(criterion)} y2={y(criterion)} className="stroke-red-500" strokeDasharray="5 5" strokeWidth="2" /> : null}
        <polyline points={path} fill="none" className="stroke-slateblue-600" strokeWidth="3" />
        {readings.map((reading, index) => reading.valueMv === null ? null : (
          <g key={reading.id}>
            <circle cx={x(index)} cy={y(reading.valueMv)} r="4" className={reading.protectionStatus === "Protected" ? "fill-emerald-500" : "fill-amber-500"} />
            <text x={x(index)} y={height - 18} textAnchor="middle" className="fill-slate-500 text-[10px]">{new Date(reading.readingAt).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</text>
          </g>
        ))}
        <text x="10" y={top + 92} className="fill-slateblue-700 text-[11px]" transform={`rotate(-90 10 ${top + 92})`}>Potential (mV)</text>
      </svg>
    </div>
  );
}

function MiniBarChart({ points, unit }: { points: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="mt-4 h-36 space-y-2 overflow-y-auto">
      {points.slice(0, 12).map((point) => (
        <div key={point.label} className="grid grid-cols-[72px_minmax(0,1fr)_54px] items-center gap-2 text-xs">
          <span className="truncate text-slate-600 dark:text-slate-300">{point.label}</span>
          <div className="h-4 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded bg-slateblue-600" style={{ width: `${Math.max(4, (point.value / max) * 100)}%` }} />
          </div>
          <span className="text-right font-semibold text-slateblue-800 dark:text-slate-200">{point.value.toFixed(unit === "%" ? 0 : 1)} {unit}</span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ points, unit }: { points: Array<{ label: string; value: number }>; unit: string }) {
  const width = 380;
  const height = 160;
  const values = points.map((point) => point.value);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const x = (index: number) => 36 + index * ((width - 54) / Math.max(1, points.length - 1));
  const y = (value: number) => 16 + (max - value) * ((height - 44) / Math.max(1, max - min));
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[300px]" role="img" aria-label="CP current output">
        <polyline points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")} fill="none" className="stroke-slateblue-600" strokeWidth="3" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r="3.5" className="fill-slateblue-600" />
            <text x={x(index)} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[10px]">{point.label}</text>
          </g>
        ))}
        <text x="6" y="18" className="fill-slateblue-700 text-[10px]">{unit}</text>
      </svg>
    </div>
  );
}

function BlockedTable({ title, columns, reason }: { title: string; columns: string[]; reason: string }) {
  return (
    <Panel className="rounded-lg p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold text-slateblue-950 dark:text-white">{title}</h2>
        <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled type="button">View All</button>
      </div>
      <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[440px] text-left text-xs">
          <thead className="bg-slateblue-50 text-slateblue-900 dark:bg-slate-950 dark:text-slate-200">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-2 font-semibold">{column}</th>)}</tr>
          </thead>
        </table>
      </div>
      <div className="p-4">
        <EmptyState title="Blocked" detail={reason} compact />
      </div>
    </Panel>
  );
}

function RectifierAttentionTable({ rectifiers }: { rectifiers: Rectifier[] }) {
  return (
    <Panel className="rounded-lg p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold text-slateblue-950 dark:text-white">Rectifiers Requiring Attention</h2>
        <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!rectifiers.length} type="button">View All</button>
      </div>
      {rectifiers.length ? (
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[460px] text-left text-xs">
            <thead className="bg-slateblue-50 text-slateblue-900 dark:bg-slate-950 dark:text-slate-200">
              <tr><th className="px-4 py-2">Rectifier ID</th><th className="px-4 py-2">Location</th><th className="px-4 py-2">Issue</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody>
              {rectifiers.map((rectifier) => (
                <tr key={rectifier.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-semibold text-slateblue-700">{rectifier.rectifierCode}</td>
                  <td className="px-4 py-2">{rectifier.kp || rectifier.location || "No data"}</td>
                  <td className="px-4 py-2">{displayEnum(getRectifierStatusFromTelemetry(rectifier))}</td>
                  <td className="px-4 py-2"><StatusPill value={getRectifierStatusFromTelemetry(rectifier)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <EmptyState title="No attention records" detail="Only real rectifier records with non-online status appear here." compact />
        </div>
      )}
    </Panel>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[115px_minmax(0,1fr)] border-b border-slate-200 text-xs last:border-b-0 dark:border-slate-700">
      <span className="bg-slateblue-50 px-3 py-2 font-medium text-slateblue-700 dark:bg-slate-950 dark:text-slate-300">{label}</span>
      <span className="min-w-0 px-3 py-2 text-slateblue-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function ActionButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <button className="min-h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slateblue-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950" disabled={disabled} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function ConfigPanelHeader({ title, action }: { title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h2 className="text-base font-bold text-slateblue-950 dark:text-white">{title}</h2>
      <button className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled type="button">{action}</button>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slateblue-700 dark:text-slate-300">
      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Within Criteria</span>
      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" />Marginal</span>
      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" />Out of Criteria</span>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-base font-bold text-slateblue-950 dark:text-white">{title}</h2>;
}

function State({ title, detail, tone = "normal" }: { title: string; detail: string; tone?: "normal" | "error" }) {
  return (
    <div className={`rounded-lg border p-5 ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-80">{detail}</p>
    </div>
  );
}

function EmptyState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-dashed border-slate-300 text-center dark:border-slate-700 ${compact ? "p-3" : "p-6"}`}>
      <p className="font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string | null }) {
  const safe = displayEnum(value);
  const normalized = safe.toLowerCase();
  const positive = normalized.includes("protected") || normalized.includes("active") || normalized.includes("normal");
  const critical = normalized.includes("critical") || normalized.includes("fault") || normalized.includes("offline") || normalized.includes("under");
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${positive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : critical ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{safe}</span>;
}

function buildOverview(data: CpMonitoringRealData) {
  const testPostCount = data.testPoints.length;
  const assessed = data.testPoints.filter((point) => point.protectionStatus && point.protectionStatus !== "Unknown");
  const within = data.testPoints.filter((point) => point.protectionStatus === "Protected").length;
  const out = data.testPoints.filter((point) => point.protectionStatus && point.protectionStatus !== "Protected" && point.protectionStatus !== "Unknown").length;
  const marginal = Math.max(0, assessed.length - within - out);
  const rectifierStatuses = data.rectifiers.map(getRectifierStatusFromTelemetry);
  const rectifiersOnline = rectifierStatuses.filter((status) => status === "Online").length;
  const rectifiersOffline = rectifierStatuses.filter((status) => status === "Offline").length;
  const rectifiersWarning = rectifierStatuses.filter((status) => status === "Warning").length;
  const rectifiersUnavailable = rectifierStatuses.filter((status) => status === "Not Available").length;
  const validPotential = data.testPoints.map((point) => point.valueMv).filter((value): value is number => value !== null);
  const interferenceIssues = data.strayCurrent.filter((item) => item.interferenceStatus && item.interferenceStatus !== "Normal").length;

  return {
    testPostCount,
    testPostsOk: within,
    testPostsAttention: out + marginal,
    testPostsMarginal: marginal,
    assessedTestPosts: assessed.length,
    compliancePercent: assessed.length ? roundPercent(within, assessed.length) : data.summary.protectionCoveragePercent,
    complianceDetail: assessed.length ? "Within Criteria" : "No valid assessed readings",
    marginalPercent: assessed.length ? roundPercent(marginal, assessed.length) : null,
    outOfCriteria: out,
    outOfCriteriaPercent: assessed.length ? roundPercent(out, assessed.length) : null,
    rectifierCount: data.rectifiers.length,
    rectifiersOnline,
    rectifiersOffline,
    rectifiersWarning,
    rectifiersUnavailable,
    rectifierOnlinePercent: data.rectifiers.length ? roundPercent(rectifiersOnline, data.rectifiers.length) : null,
    rectifierOfflinePercent: data.rectifiers.length ? roundPercent(rectifiersOffline, data.rectifiers.length) : null,
    rectifierUnavailablePercent: data.rectifiers.length ? roundPercent(rectifiersUnavailable, data.rectifiers.length) : null,
    averagePotentialMv: validPotential.length ? Math.round(validPotential.reduce((sum, value) => sum + value, 0) / validPotential.length) : null,
    interferenceIssues,
    profilePoints: data.testPoints
      .filter((point) => point.valueMv !== null)
      .map((point) => ({
        id: point.id,
        label: point.code,
        value: point.valueMv as number,
        band: point.protectionStatus === "Protected" ? ("within" as const) : point.protectionStatus ? ("out" as const) : ("marginal" as const)
      })),
    rectifiersRequiringAttention: data.rectifiers.filter((rectifier) => getRectifierStatusFromTelemetry(rectifier) !== "Online"),
    currentSeries: [] as Array<{ label: string; value: number }>
  };
}

function buildTestPostSummary(records: CpLinkedTestPointRecord[]) {
  return records.reduce(
    (summary, record) => {
      if (record.cp.assetStatus === "Active") summary.active += 1;
      if (record.cp.assetStatus === "Inactive") summary.inactive += 1;
      const status = getLinkedTestPostStatus(record);
      if (status === "Within Criteria") summary.within += 1;
      if (status === "Out of Criteria") summary.out += 1;
      return summary;
    },
    { active: 0, inactive: 0, within: 0, out: 0 }
  );
}

function matchesTestPostFilters(record: CpLinkedTestPointRecord, filters: { segment: string; status: TestPostStatusFilter; side: TestPostSideFilter; search: string; from: string; to: string }) {
  if (filters.segment !== "All Segments" && record.asset?.segmentId !== filters.segment) {
    return false;
  }

  const side = record.asset?.side ?? "Unavailable";
  if (filters.side !== "All Sides" && side !== filters.side) {
    return false;
  }

  const status = getLinkedTestPostStatus(record);
  if (filters.status !== "All Status" && status !== filters.status) {
    return false;
  }

  const lastReadingAt = record.readings?.lastReadingAt ? new Date(record.readings.lastReadingAt) : null;
  if (filters.from && (!lastReadingAt || lastReadingAt < new Date(`${filters.from}T00:00:00`))) {
    return false;
  }
  if (filters.to && (!lastReadingAt || lastReadingAt > new Date(`${filters.to}T23:59:59`))) {
    return false;
  }

  const needle = filters.search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    record.asset?.assetId,
    record.cp.code,
    record.cp.name,
    record.cp.location,
    record.asset?.kp,
    record.cp.kp,
    record.asset?.segmentId,
    record.asset?.coordinates
  ].filter(Boolean).join(" ").toLowerCase();

  return haystack.includes(needle);
}

function buildRectifierSummary(items: Array<{ record: CpLinkedRectifierRecord; reading?: Rectifier }>) {
  const online = items.filter((item) => getRectifierStatus(item.record, item.reading) === "Online").length;
  const offline = items.filter((item) => getRectifierStatus(item.record, item.reading) === "Offline").length;
  const warning = items.filter((item) => getRectifierStatus(item.record, item.reading) === "Warning").length;
  const unavailable = items.filter((item) => getRectifierStatus(item.record, item.reading) === "Not Available").length;
  const currentValues = items.map((item) => item.reading?.outputCurrentA).filter((value): value is number => typeof value === "number");
  const averageCurrentA = currentValues.length ? currentValues.reduce((sum, value) => sum + value, 0) / currentValues.length : null;

  return {
    total: items.length,
    online,
    offline,
    warning,
    unavailable,
    averageCurrentA,
    currentPoints: items
      .filter((item) => typeof item.reading?.outputCurrentA === "number")
      .map((item) => ({ label: item.record.asset?.assetId ?? item.record.cp.rectifierCode, value: item.reading?.outputCurrentA ?? 0 })),
    voltagePoints: items
      .filter((item) => typeof item.reading?.outputVoltageV === "number")
      .map((item) => ({ label: item.record.asset?.assetId ?? item.record.cp.rectifierCode, value: item.reading?.outputVoltageV ?? 0 }))
  };
}

function buildSurveySummary(data: CpMonitoringRealData) {
  const completed = data.surveys.filter((survey) => ["Completed", "Approved"].includes(survey.status)).length;
  const offValues = data.testPoints.map((point) => point.eOffMv).filter((value): value is number => value !== null);
  const averageOffMv = offValues.length ? Math.round(offValues.reduce((sum, value) => sum + value, 0) / offValues.length) : null;
  const assessed = data.testPoints.filter((point) => point.protectionStatus && point.protectionStatus !== "Unknown").length;
  const nonCompliant = data.testPoints.filter((point) => point.protectionStatus === "UnderProtected" || point.protectionStatus === "Critical").length;

  return { completed, averageOffMv, assessed, nonCompliant };
}

function matchesSurveyFilters(survey: CpMonitoringRealData["surveys"][number], filters: { surveyType: string; status: string; from: string; to: string; contractor: string }) {
  if (filters.status !== "All Statuses" && survey.status !== filters.status) {
    return false;
  }

  if (filters.surveyType !== "All Types" && filters.surveyType !== "ON/OFF") {
    return false;
  }

  if (filters.contractor !== "All Contractors") {
    return false;
  }

  const date = new Date(survey.surveyDate);
  if (filters.from && date < new Date(`${filters.from}T00:00:00`)) {
    return false;
  }
  if (filters.to && date > new Date(`${filters.to}T23:59:59`)) {
    return false;
  }

  return true;
}

function buildInterferenceSummary(data: CpMonitoringRealData) {
  const completedSurveys = data.surveys.filter((survey) => ["Completed", "Approved"].includes(survey.status)).length;
  const high = data.strayCurrent.filter((item) => severityForInterference(item) === "High").length;
  const medium = data.strayCurrent.filter((item) => severityForInterference(item) === "Medium").length;
  const low = data.strayCurrent.filter((item) => severityForInterference(item) === "Low").length;

  return {
    completedSurveys,
    interferencePoints: data.strayCurrent.length,
    high,
    medium,
    low,
    hotspots: high + medium
  };
}

function buildCipsChartPoints(data: CpMonitoringRealData) {
  const strayByTestPoint = new Map(data.strayCurrent.map((item) => [item.testPointId, item]));
  return data.testPoints
    .filter((point) => point.valueMv !== null || point.eOffMv !== null || strayByTestPoint.has(point.id))
    .map((point, index) => {
      const stray = strayByTestPoint.get(point.id);
      return {
        id: point.id,
        label: point.kp || point.location || String(index + 1),
        potential: point.eOffMv ?? point.valueMv,
        stray: stray?.strayCurrentMa ?? null,
        hotspot: Boolean(stray)
      };
    });
}

function matchesInterferenceFilters(item: CpMonitoringRealData["strayCurrent"][number], filters: { segment: string; dateRange: string; interferenceType: string }) {
  if (filters.segment !== "All Segments") {
    return false;
  }

  if (filters.interferenceType === "DC Interference") {
    return false;
  }

  if (filters.dateRange === "All Dates") {
    return true;
  }

  if (!item.readingAt) {
    return false;
  }
  const readingAt = new Date(item.readingAt).getTime();
  const days = filters.dateRange === "Last 30 Days" ? 30 : 365;
  return readingAt >= Date.now() - days * 86400000;
}

function matchesTrendFilters(reading: CpMonitoringRealData["trend"][number], filters: { segment: string; asset: string; metric: string; aggregation: string; from: string; to: string }, selectedPointId: string) {
  if (filters.segment !== "All Segments") {
    return false;
  }

  if (filters.asset !== "All Assets" && reading.testPointId !== selectedPointId) {
    return false;
  }

  if (filters.metric === "ON Potential (V)" && reading.measurementType !== "ON_POTENTIAL") {
    return false;
  }
  if (filters.metric === "OFF Potential (V)" && reading.measurementType !== "INSTANT_OFF_POTENTIAL") {
    return false;
  }

  const readingAt = new Date(reading.readingAt);
  if (filters.from && readingAt < new Date(`${filters.from}T00:00:00`)) {
    return false;
  }
  if (filters.to && readingAt > new Date(`${filters.to}T23:59:59`)) {
    return false;
  }

  return reading.valueMv !== null;
}

function buildTrendSummary(data: CpMonitoringRealData, readings: CpMonitoringRealData["trend"]) {
  const assessed = readings.filter((reading) => reading.protectionStatus && reading.protectionStatus !== "Unknown");
  const compliant = assessed.filter((reading) => reading.protectionStatus === "Protected").length;
  const potentials = readings.map((reading) => reading.valueMv).filter((value): value is number => value !== null);
  const outByPoint = new Map<string, number>();
  readings.forEach((reading) => {
    if (reading.protectionStatus === "UnderProtected" || reading.protectionStatus === "Critical") {
      outByPoint.set(reading.testPointId, (outByPoint.get(reading.testPointId) ?? 0) + 1);
    }
  });
  const online = data.rectifiers.filter((rectifier) => getRectifierStatusFromTelemetry(rectifier) === "Online").length;

  return {
    compliancePercent: assessed.length ? roundPercent(compliant, assessed.length) : null,
    averagePotentialMv: potentials.length ? Math.round(potentials.reduce((sum, value) => sum + value, 0) / potentials.length) : null,
    rectifierAvailabilityPercent: data.rectifiers.length ? roundPercent(online, data.rectifiers.length) : null,
    repeatedOutOfCriteria: Array.from(outByPoint.values()).filter((count) => count > 1).length
  };
}

function buildComplianceCases(data: CpMonitoringRealData) {
  const approvedCriterion = data.approvedCriteria.find((criterion) => criterion.protectionThresholdMv !== null);
  if (!approvedCriterion || approvedCriterion.protectionThresholdMv === null) {
    return [];
  }
  const thresholdMv = approvedCriterion.protectionThresholdMv;

  return data.testPoints.flatMap((point) => {
    const valueMv = point.eOffMv ?? point.valueMv;
    if (valueMv === null || point.protectionStatus === "Unknown" || !point.readingId) {
      return [];
    }

    if (valueMv <= thresholdMv) {
      return [];
    }

    const deltaMv = Math.round(valueMv - thresholdMv);
    return [{
      id: point.id,
      code: point.code,
      kp: point.kp || point.location || "Unavailable",
      valueMv,
      criterionMv: thresholdMv,
      deltaMv,
      severity: Math.abs(deltaMv) >= 200 ? "High" as const : "Medium" as const,
      actionStatus: "Open"
    }];
  });
}

function buildComplianceSummary(data: CpMonitoringRealData, cases: ReturnType<typeof buildComplianceCases>, hasApprovedCriteria: boolean) {
  if (!hasApprovedCriteria) {
    return { assessed: 0, within: 0, out: 0, compliancePercent: null as number | null };
  }

  const assessed = data.testPoints.filter((point) => point.readingId && point.protectionStatus && point.protectionStatus !== "Unknown" && (point.eOffMv !== null || point.valueMv !== null)).length;
  const out = cases.length;
  const within = Math.max(0, assessed - out);

  return {
    assessed,
    within,
    out,
    compliancePercent: assessed ? roundPercent(within, assessed) : null
  };
}

function matchesEngineeringFilters(record: CpCalculationRecord, filters: { asset: string; systemType: string; status: string }, hasApprovedCriteria: boolean) {
  if (filters.asset !== "All Assets") {
    return false;
  }

  if (filters.systemType !== "All Types" && record.calculationType !== filters.systemType) {
    return false;
  }

  if (filters.status === "Approved") {
    return hasApprovedCriteria;
  }

  if (filters.status === "Draft") {
    return !hasApprovedCriteria;
  }

  if (filters.status === "In Review") {
    return false;
  }

  return true;
}

function buildEngineeringSummary(data: CpMonitoringRealData, calculations: CpCalculationRecord[]) {
  const iccp = calculations.filter((record) => record.calculationType === "ICCP").length;
  const sacp = calculations.filter((record) => record.calculationType === "SACP").length;
  const rectifierBackedSystems = data.rectifiers.filter((rectifier) => getRectifierStatusFromTelemetry(rectifier) === "Online").length;

  return {
    activeSystems: calculations.length || rectifierBackedSystems,
    iccp,
    sacp,
    approvedCriteria: data.approvedCriteria.length
  };
}

function buildConfigurationSummary(data: CpMonitoringRealData, calculations: CpCalculationRecord[]) {
  return {
    criteriaSets: new Set(data.approvedCriteria.map((criterion) => criterion.criteriaSetId)).size,
    criteriaVersions: new Set(data.approvedCriteria.map((criterion) => criterion.criteriaVersionId)).size,
    activeThresholds: data.approvedCriteria.filter((criterion) => criterion.protectionThresholdMv !== null || criterion.marginalThresholdMv !== null || criterion.overProtectionThresholdMv !== null).length,
    calculations: calculations.length
  };
}

function buildLinkedDataSources(data: CpMonitoringRealData) {
  return [
    { name: "Pipeline / Asset Master", type: "Asset Master", status: data.availability.testPoints.available || data.availability.rectifiers.available ? "Connected" : "Unavailable", description: "Physical CP test posts and rectifiers" },
    { name: "CP Reading History", type: "Time Series", status: data.trend.length ? "Connected" : "Unavailable", description: "Historical CP potentials and readings" },
    { name: "CP Rectifier Readings", type: "Time Series", status: data.rectifiers.some((rectifier) => rectifier.readingAt) ? "Connected" : "Unavailable", description: "Rectifier operational readings" },
    { name: "CP Criteria", type: "Engineering", status: data.approvedCriteria.length ? "Connected" : "Unavailable", description: data.availability.approvedCriteria.reason },
    { name: "Stray Current / Interference", type: "Monitoring", status: data.availability.strayCurrent.available ? "Connected" : "Unavailable", description: data.availability.strayCurrent.reason }
  ];
}

function buildModuleSettings(data: CpMonitoringRealData) {
  const defaultCriterion = data.approvedCriteria[0];
  return [
    { name: "Default Criteria Set", value: defaultCriterion?.criteriaSetName ?? "Unavailable", description: "Approved criteria used for CP compliance where available" },
    { name: "Default Criteria Version", value: defaultCriterion?.version ?? "Unavailable", description: "Approved criteria version currently returned by the backend" },
    { name: "Default Units", value: defaultCriterion?.unit ?? "mV", description: "Potential measurement units exposed by criteria/readings" },
    { name: "Reference Electrode", value: defaultCriterion?.referenceElectrode ?? data.criterion?.referenceElectrode ?? "Unavailable", description: "Reference electrode from criteria/rule data" },
    { name: "Auto Evaluate Surveys", value: data.criterion || data.approvedCriteria.length ? "Available" : "Unavailable", description: "Evaluation requires connected criteria and readings" },
    { name: "Workflow Enforcement", value: "Unavailable", description: "Approval/workflow backend is not connected" },
    { name: "Data Retention", value: "Unavailable", description: "Retention policy is not exposed by the current backend" }
  ];
}

function buildDerivedAlertRules(data: CpMonitoringRealData) {
  return [
    { name: "Potential Out of Criteria", condition: data.approvedCriteria.length ? "Potential above approved threshold" : "Blocked until approved criteria are available", severity: "Critical", status: data.approvedCriteria.length ? "Derived" : "Blocked" },
    { name: "Rectifier Offline", condition: "Rectifier state is not active/online/normal", severity: "Critical", status: data.rectifiers.length ? "Derived" : "Unavailable" },
    { name: "Stale Reading", condition: "Latest CP reading older than 7 days", severity: "Major", status: data.testPoints.length || data.rectifiers.length ? "Derived" : "Unavailable" },
    { name: "Interference Detected", condition: "Connected stray-current/interference reading above review threshold", severity: "Major", status: data.strayCurrent.length ? "Derived" : "Unavailable" }
  ];
}

function buildCpAlerts(data: CpMonitoringRealData): CpAlertRecord[] {
  const thresholdMv = data.approvedCriteria.find((criterion) => criterion.protectionThresholdMv !== null)?.protectionThresholdMv ?? data.criterion?.valueMv ?? null;
  const alerts: CpAlertRecord[] = [];

  data.testPoints.forEach((point) => {
    const readingAt = point.eOffAt ?? point.readingAt ?? point.eOnAt;
    const measuredMv = point.eOffMv ?? point.valueMv ?? point.eOnMv;
    const isOutOfCriteria = point.protectionStatus === "UnderProtected" || point.protectionStatus === "Critical";
    if (isOutOfCriteria && measuredMv !== null) {
      const deltaMv = thresholdMv === null ? null : measuredMv - thresholdMv;
      alerts.push({
        id: `tp-${point.id}-${point.readingId ?? readingAt ?? "latest"}`,
        timestamp: readingAt,
        source: "Test Post",
        assetId: point.code,
        assetKind: "Test Post",
        eventType: "Potential Out of Criteria",
        severity: point.protectionStatus === "Critical" || (typeof deltaMv === "number" && Math.abs(deltaMv) >= 200) ? "Critical" : "Major",
        status: "Open",
        assignee: "Unassigned",
        location: point.kp || point.location || "Unavailable",
        measuredValue: potentialFromMv(measuredMv),
        criterion: thresholdMv === null ? "Approved criterion unavailable" : potentialFromMv(thresholdMv),
        details: `${point.code} has a CP potential outside the connected approved criteria. Missing, stale, invalid, and unknown readings are not treated as compliant.`,
        relatedTestPointId: point.id
      });
    }

    if (readingAt && isOlderThanDays(readingAt, 7)) {
      alerts.push({
        id: `stale-${point.id}-${readingAt}`,
        timestamp: readingAt,
        source: "Test Post",
        assetId: point.code,
        assetKind: "Test Post",
        eventType: "Stale Reading",
        severity: "Major",
        status: "Open",
        assignee: "Unassigned",
        location: point.kp || point.location || "Unavailable",
        measuredValue: measuredMv === null ? "Unavailable" : potentialFromMv(measuredMv),
        criterion: "Fresh reading required",
        details: `${point.code} has no recent CP reading within the freshness threshold used by the Alerts view.`,
        relatedTestPointId: point.id
      });
    }
  });

  data.rectifiers.forEach((rectifier) => {
    const operationalStatus = getRectifierStatusFromTelemetry(rectifier);
    const online = operationalStatus === "Online";
    if (!online) {
      const outputLow = typeof rectifier.outputCurrentA === "number" && rectifier.outputCurrentA <= 0;
      alerts.push({
        id: `rectifier-${rectifier.id}-${rectifier.readingAt ?? "latest"}`,
        timestamp: rectifier.readingAt,
        source: "Rectifier",
        assetId: rectifier.rectifierCode,
        assetKind: "Rectifier",
        eventType: outputLow ? "Output Current Low" : operationalStatus === "Offline" ? "Rectifier Offline" : "Rectifier Operational Status Unavailable",
        severity: outputLow ? "Critical" : "Major",
        status: "Open",
        assignee: "Unassigned",
        location: rectifier.kp || rectifier.location || "Unavailable",
        measuredValue: numberUnit(rectifier.outputCurrentA, "A"),
        criterion: "Valid operational telemetry required",
        details: `${rectifier.rectifierCode} has master status ${rectifier.assetStatus}, but no valid operational telemetry is available.`,
        relatedRectifierId: rectifier.id
      });
    }

    if (rectifier.readingAt && isOlderThanDays(rectifier.readingAt, 7)) {
      alerts.push({
        id: `rectifier-stale-${rectifier.id}-${rectifier.readingAt}`,
        timestamp: rectifier.readingAt,
        source: "Rectifier",
        assetId: rectifier.rectifierCode,
        assetKind: "Rectifier",
        eventType: "Stale Reading",
        severity: "Major",
        status: "Open",
        assignee: "Unassigned",
        location: rectifier.kp || rectifier.location || "Unavailable",
        measuredValue: numberUnit(rectifier.outputCurrentA, "A"),
        criterion: "Fresh operational reading required",
        details: `${rectifier.rectifierCode} has no recent rectifier operational reading within the freshness threshold used by the Alerts view.`,
        relatedRectifierId: rectifier.id
      });
    }
  });

  data.strayCurrent.forEach((item) => {
    const severity = severityForInterference(item);
    if (severity === "Low") {
      return;
    }

    alerts.push({
      id: `interference-${item.testPointId}-${item.readingAt ?? "latest"}`,
      timestamp: item.readingAt,
      source: "Interference",
      assetId: item.code,
      assetKind: "Interference",
      eventType: "Interference Detected",
      severity: severity === "High" ? "Critical" : "Minor",
      status: "Open",
      assignee: "Unassigned",
      location: item.location || "Unavailable",
      measuredValue: typeof item.strayCurrentMa === "number" ? `${item.strayCurrentMa.toFixed(1)} mA` : "Unavailable",
      criterion: "Interference threshold from connected readings",
      details: `${item.code} has connected stray-current/interference readings that require review.`,
      relatedTestPointId: item.testPointId
    });
  });

  return alerts.sort((left, right) => dateRank(right.timestamp) - dateRank(left.timestamp));
}

function matchesAlertFilters(alert: CpAlertRecord, filters: { severity: string; status: string; alertType: string; dateRange: string }) {
  if (filters.severity !== "All Severities" && alert.severity !== filters.severity) {
    return false;
  }
  if (filters.status !== "All Statuses" && alert.status !== filters.status) {
    return false;
  }
  if (filters.alertType !== "All Alert Types" && alert.eventType !== filters.alertType) {
    return false;
  }
  if (filters.dateRange === "All Dates") {
    return true;
  }
  if (!alert.timestamp) {
    return false;
  }
  const days = filters.dateRange === "Last 7 Days" ? 7 : 30;
  return new Date(alert.timestamp).getTime() >= Date.now() - days * 86400000;
}

function buildAlertSummary(alerts: CpAlertRecord[]) {
  const lastSevenDays = alerts.filter((alert) => alert.timestamp && !isOlderThanDays(alert.timestamp, 7)).length;
  const stale = alerts.filter((alert) => alert.eventType === "Stale Reading").length;
  const byAsset = new Map<string, number>();
  alerts.forEach((alert) => byAsset.set(alert.assetId, (byAsset.get(alert.assetId) ?? 0) + 1));

  return {
    active: alerts.filter((alert) => alert.status === "Open").length,
    critical: alerts.filter((alert) => alert.severity === "Critical").length,
    lastSevenDays,
    recurring: Array.from(byAsset.values()).filter((count) => count > 1).length,
    stale
  };
}

function buildAlertTimeline(data: CpMonitoringRealData, selected: CpAlertRecord) {
  const events = [
    {
      timestamp: selected.timestamp,
      title: selected.eventType,
      detail: selected.details
    }
  ];

  if (selected.relatedTestPointId) {
    data.trend
      .filter((reading) => reading.testPointId === selected.relatedTestPointId)
      .slice(-5)
      .reverse()
      .forEach((reading) => {
        events.push({
          timestamp: reading.readingAt,
          title: reading.protectionStatus || "Routine Reading",
          detail: `Measured ${potentialReadingValue(reading)} (${displayEnum(reading.measurementType)}).`
        });
      });
  }

  if (selected.relatedRectifierId) {
    const rectifier = data.rectifiers.find((item) => item.id === selected.relatedRectifierId);
    if (rectifier) {
      events.push({
        timestamp: rectifier.readingAt,
        title: rectifier.readingStatus || rectifier.assetStatus || "Rectifier Reading",
        detail: `Output ${numberUnit(rectifier.outputCurrentA, "A")} at ${numberUnit(rectifier.outputVoltageV, "V")}.`
      });
    }
  }

  return events
    .filter((event) => Boolean(event.timestamp))
    .sort((left, right) => dateRank(right.timestamp) - dateRank(left.timestamp));
}

function isOlderThanDays(value: string, days: number) {
  return new Date(value).getTime() < Date.now() - days * 86400000;
}

function dateRank(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function buildMonthlyTrendRows(data: CpMonitoringRealData, readings: CpMonitoringRealData["trend"]) {
  const grouped = new Map<string, CpMonitoringRealData["trend"]>();
  readings.forEach((reading) => {
    const key = new Date(reading.readingAt).toLocaleDateString(undefined, { month: "short", year: "numeric" });
    grouped.set(key, [...(grouped.get(key) ?? []), reading]);
  });

  return Array.from(grouped.entries()).map(([month, rows]) => {
    const assessed = rows.filter((reading) => reading.protectionStatus && reading.protectionStatus !== "Unknown");
    const compliant = assessed.filter((reading) => reading.protectionStatus === "Protected").length;
    const potentials = rows.map((reading) => reading.valueMv).filter((value): value is number => value !== null);
    const outOfCriteria = rows.filter((reading) => reading.protectionStatus === "UnderProtected" || reading.protectionStatus === "Critical").length;

    return {
      month,
      testPosts: new Set(rows.map((reading) => reading.testPointId)).size || data.testPoints.length,
      averagePotentialMv: potentials.length ? Math.round(potentials.reduce((sum, value) => sum + value, 0) / potentials.length) : null,
      compliancePercent: assessed.length ? roundPercent(compliant, assessed.length) : null,
      outOfCriteria
    };
  });
}

function potentialReadingValue(reading: CpMonitoringRealData["trend"][number]) {
  if (typeof reading.valueV === "number") return `${reading.valueV.toFixed(2)} V`;
  if (typeof reading.valueMv === "number") return `${(reading.valueMv / 1000).toFixed(2)} V`;
  return "Unavailable";
}

function severityForInterference(item: CpMonitoringRealData["strayCurrent"][number]): "High" | "Medium" | "Low" {
  const value = Math.abs(item.strayCurrentMa ?? 0);
  if (item.interferenceStatus === "Critical" || value >= 15) return "High";
  if (item.interferenceStatus === "Suspected" || value >= 5) return "Medium";
  return "Low";
}

function matchesRectifierFilters(record: CpLinkedRectifierRecord, reading: Rectifier | undefined, filters: { status: RectifierStatusFilter; alarm: RectifierAlarmFilter; search: string }) {
  const status = getRectifierStatus(record, reading);
  if (filters.status !== "All Status" && status !== filters.status) {
    return false;
  }

  const alarm = getRectifierAlarmStatus(record, reading);
  if (filters.alarm !== "All Alarm Status" && alarm !== filters.alarm) {
    return false;
  }

  const needle = filters.search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    record.asset?.assetId,
    record.cp.rectifierCode,
    record.cp.name,
    record.cp.location,
    record.cp.kp,
    record.asset?.kp,
    record.asset?.coordinates,
    record.asset?.segmentId,
    record.cp.status,
    reading?.readingStatus
  ].filter(Boolean).join(" ").toLowerCase();

  return haystack.includes(needle);
}

function findRectifierReading(record: CpLinkedRectifierRecord, readings: Rectifier[]) {
  return readings.find((reading) => reading.id === record.cp.id || reading.rectifierCode === record.cp.rectifierCode || reading.rectifierCode === record.asset?.assetId);
}

function getRectifierStatus(record: CpLinkedRectifierRecord, reading?: Rectifier): RectifierOperationalStatus {
  return getRectifierOperationalStatus(reading?.readingStatus, reading?.readingAt);
}

function getRectifierAlarmStatus(record: CpLinkedRectifierRecord, reading?: Rectifier): RectifierAlarmFilter {
  const status = `${reading?.readingStatus ?? ""} ${record.cp.status ?? ""}`.toLowerCase();
  if (typeof reading?.outputCurrentA === "number" && reading.outputCurrentA <= 0) return "No Output";
  if (status.includes("high current")) return "High Current";
  if (status.includes("high voltage")) return "High Voltage";
  if (status.includes("offline") || status.includes("fault")) return "No Output";
  if (reading?.readingAt && (status.includes("active") || status.includes("online") || status.includes("normal"))) return "Normal";
  return "Unavailable";
}

function pipelineLabel(pipelines: PipelineRecord[], pipelineId: string) {
  const pipeline = pipelines.find((item) => item.id === pipelineId);
  return pipeline ? pipeline.pipelineName : pipelineId;
}

function numberUnit(value: number | null | undefined, unit: string) {
  return typeof value === "number" ? `${value.toFixed(1)} ${unit}` : "Unavailable";
}

function getLinkedTestPostStatus(record: CpLinkedTestPointRecord): "Within Criteria" | "Out of Criteria" | "Unavailable" {
  const onValue = readingToVolts(record.readings?.onPotential);
  const offValue = readingToVolts(record.readings?.offPotential);
  const assessedValue = offValue ?? onValue;

  if (assessedValue === null) {
    return "Unavailable";
  }

  return assessedValue <= -0.85 ? "Within Criteria" : "Out of Criteria";
}

function readingToVolts(reading: LinkedPotentialReading) {
  if (!reading) return null;
  if (typeof reading.valueV === "number") return reading.valueV;
  if (typeof reading.valueMv === "number") return reading.valueMv / 1000;
  return null;
}

function potentialFromReading(reading: LinkedPotentialReading) {
  const volts = readingToVolts(reading);
  return volts === null ? "Unavailable" : `${volts.toFixed(2)} V`;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Unavailable";
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unavailable";
}

function getRectifierStatusFromTelemetry(rectifier: Rectifier): RectifierOperationalStatus {
  return getRectifierOperationalStatus(rectifier.readingStatus, rectifier.readingAt);
}

function roundPercent(count: number, total: number) {
  return Number(((count / Math.max(1, total)) * 100).toFixed(1));
}

function percentOrNoData(value: number | null) {
  return value === null ? "No data" : `${value}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function potentialFromMv(value: number | null) {
  return value === null ? "No data" : `${(value / 1000).toFixed(2)} V`;
}

function displayEnum(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "No data";
}
