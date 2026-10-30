"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { ArrowDown, ArrowDownToLine, ArrowUp, ChevronLeft, ChevronRight, Clock3, ExternalLink, Eye, FileText, Link2, Maximize2, MoreVertical, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { Panel } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { createDocumentVersion, createRepositoryDocument, downloadDocumentVersion, fetchDocuments, linkExistingDocument, type DocumentRepositoryItem, type DocumentVersionRecord, fetchRepositoryDocument } from "@/lib/apiClient";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

const primary = "inline-flex items-center justify-center gap-1.5 rounded-md bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-1.5 rounded-md border border-slateblue-300 bg-white px-3 py-2 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:cursor-not-allowed disabled:opacity-50";
const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-slateblue-500 focus:ring-2 focus:ring-slateblue-100";
const commonTypes = ["Alignment Sheet", "Route Drawing", "General Arrangement", "Isometric", "Specification", "Detail Drawing", "As-Built", "Calculation Report", "Manual"];
const uploadDefaults = { title: "", number: "", type: "Alignment Sheet", category: "Engineering", revision: "", issueDate: "", reviewDate: "", expiryDate: "", description: "", target: "pipeline" };
const statuses = ["Draft", "Submitted", "Under Review", "Approved", "Approved with Comments", "Rejected", "Superseded", "Archived"];
const text = (value: unknown) => value === undefined || value === null || value === "" ? "Not recorded" : String(value);
const date = (value?: string | null) => value ? value.slice(0, 10) : "Not recorded";
const revisions = (item: DocumentRepositoryItem) => [...item.versions].sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
const linkLabels = (item: DocumentRepositoryItem) => [...new Set(item.links.flatMap((link) => [link.pipeline?.pipelineCode, link.segment?.segmentId, link.asset?.assetId].filter((value): value is string => Boolean(value))))].join(", ");
type Targets = { pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[] };
type Row = { item: DocumentRepositoryItem; version: DocumentVersionRecord | undefined };

export function DrawingsDocumentsWorkspace({ pipeline, segments, assets, onDocumentsChange }: Targets & { onDocumentsChange: (items: DocumentRepositoryItem[]) => void }) {
  const { user } = useAuth();
  const canWrite = user?.role === "Admin" || user?.role === "Engineer";
  const [items, setItems] = useState<DocumentRepositoryItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [type, setType] = useState("ALL"), [linkedTo, setLinkedTo] = useState("ALL"), [status, setStatus] = useState("ALL"), [revision, setRevision] = useState("ALL"), [query, setQuery] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(""), [versionId, setVersionId] = useState("");
  const [sort, setSort] = useState<{ key: "documentNumber" | "issueDate"; direction: "asc" | "desc" }>({ key: "documentNumber", direction: "asc" });
  const [mode, setMode] = useState<"upload" | "revision" | "link" | null>(null), [linkInitialId, setLinkInitialId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentRepositoryItem | null>(null);
  const [notice, setNotice] = useState(""), [actionBusy, setActionBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; mime: string; content?: string } | null>(null), [previewLoading, setPreviewLoading] = useState(false), [previewError, setPreviewError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const historyDialog = useRef<HTMLDialogElement>(null), previewDialog = useRef<HTMLDialogElement>(null), request = useRef(0);
  const reload = useCallback(async () => {
    const generation = ++request.current;
    setLoading(true); setError("");
    if (!pipeline) { setItems([]); setLoading(false); return; }
    try {
      const first = await fetchDocuments({ pipelineId: pipeline.id, page: 1, pageSize: 100 });
      const remaining = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / 100) - 1) }, (_, index) => fetchDocuments({ pipelineId: pipeline.id, page: index + 2, pageSize: 100 })));
      const records = [...new Map([first, ...remaining].flatMap((result) => result.items).map((item) => [item.documentId, item])).values()];
      if (generation === request.current) { setItems(records); onDocumentsChange(records); }
      return records;
    } catch (reason) { if (generation === request.current) setError(reason instanceof Error ? reason.message : "Documents could not be loaded."); }
    finally { if (generation === request.current) setLoading(false); }
  }, [pipeline?.id, onDocumentsChange]);
  useEffect(() => { void reload(); return () => { request.current++; }; }, [reload]);
  const rows = items.flatMap((item): Row[] => {
    const ordered = revisions(item);
    const version = revision === "ALL" ? ordered[0] : ordered.find((candidate) => candidate.revision === revision);
    if (type !== "ALL" && item.documentType !== type) return [];
    if (revision !== "ALL" && !version) return [];
    if (status !== "ALL" && version?.approvalStatus !== status) return [];
    if (linkedTo !== "ALL") { const [kind, id] = linkedTo.split(":"); if (!item.links.some((link) => kind === "pipeline" ? link.pipeline?.id === id : kind === "segment" ? link.segment?.id === id : link.asset?.id === id)) return []; }
    if (query.trim() && ![item.title, item.documentNumber, item.documentId].some((value) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()))) return [];
    return [{ item, version }];
  }).sort((a, b) => {
    const first = sort.key === "documentNumber" ? a.item.documentNumber || a.item.documentId : a.version?.issueDate;
    const second = sort.key === "documentNumber" ? b.item.documentNumber || b.item.documentId : b.version?.issueDate;
    if (!first) return second ? 1 : 0; if (!second) return -1;
    const compare = sort.key === "documentNumber" ? first.localeCompare(second, undefined, { numeric: true }) : Date.parse(first) - Date.parse(second);
    return sort.direction === "asc" ? compare : -compare;
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, pages), pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const selectedRow = pageRows.find((row) => row.item.documentId === selectedId) ?? pageRows[0] ?? null;
  const selected = selectedRow?.item ?? null;
  const selectedVersion = selected?.versions.find((version) => version.documentVersionId === versionId) ?? selectedRow?.version;
  const selectedVersions = selected ? revisions(selected) : [];
  const pageNumbers = [...new Set([1, pages, current - 1, current, current + 1].filter((value) => value > 0 && value <= pages))].sort((a, b) => a - b);
  const choose = (row: Row) => { setSelectedId(row.item.documentId); setVersionId(row.version?.documentVersionId ?? ""); };
  function changeFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); setSelectedId(""); setVersionId(""); }
  function clearFilters() { setType("ALL"); setLinkedTo("ALL"); setStatus("ALL"); setRevision("ALL"); setQuery(""); setPage(1); setVersionId(""); }
  function toggleSort(key: "documentNumber" | "issueDate") { setSort((previous) => ({ key, direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc" })); setPage(1); }
  useEffect(() => {
    let active = true, objectUrl = "";
    setPreview(null); setPreviewError(""); setPreviewLoading(false);
    if (!selected || !selectedVersion) return;
    const mime = selectedVersion.mimeType;
    if (mime !== "application/pdf" && !["image/png", "image/jpeg", "image/gif", "image/webp", "text/csv", "text/plain"].includes(mime)) return;
    setPreviewLoading(true);
    void downloadDocumentVersion(selected.documentId, selectedVersion.documentVersionId).then(async (blob) => {
      const content = mime === "text/csv" || mime === "text/plain" ? (await blob.slice(0, 100000).text()) : undefined;
      if (!active) return;
      objectUrl = URL.createObjectURL(new Blob([blob], { type: mime })); setPreview({ url: objectUrl, mime, content });
    }).catch((reason) => { if (active) setPreviewError(reason instanceof Error ? reason.message : "Document preview could not be loaded."); }).finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selected?.documentId, selectedVersion?.documentVersionId]);
  async function download(item: DocumentRepositoryItem, version: DocumentVersionRecord) {
    setActionBusy(true); setError("");
    try { const blob = await downloadDocumentVersion(item.documentId, version.documentVersionId); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = version.fileName; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Download failed."); }
    finally { setActionBusy(false); }
  }
  async function openDocument() {
    if (!selected || !selectedVersion) return;
    const tab = window.open("", "_blank");
    if (!tab) { setError("The browser blocked the document tab. Allow pop-ups or use Download."); return; }
    tab.opener = null; setActionBusy(true); setError("");
    try { const blob = await downloadDocumentVersion(selected.documentId, selectedVersion.documentVersionId); const url = URL.createObjectURL(new Blob([blob], { type: selectedVersion.mimeType })); tab.location.href = url; window.setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (reason) { tab.close(); setError(reason instanceof Error ? reason.message : "Document could not be opened."); }
    finally { setActionBusy(false); }
  }
  function showHistory(row?: Row) { if (row) choose(row); window.requestAnimationFrame(() => historyDialog.current?.showModal()); }
  function expandPreview() { setExpanded(true); window.requestAnimationFrame(() => previewDialog.current?.showModal()); }
  async function saved(documentId: string, message: string) { setMode(null); clearFilters(); setSort({ key: "documentNumber", direction: "asc" }); setSelectedId(documentId); setNotice(message); const records = await reload(); if (records) { const ordered = [...records].sort((a, b) => (a.documentNumber || a.documentId).localeCompare(b.documentNumber || b.documentId, undefined, { numeric: true })); const index = ordered.findIndex((item) => item.documentId === documentId); if (index >= 0) setPage(Math.floor(index / pageSize) + 1); } }
  return <div className="grid min-w-0 items-start gap-3 text-xs xl:grid-cols-[minmax(0,1.9fr)_minmax(330px,1fr)]" aria-label="Drawings and documents workspace">
    <Panel className="min-w-0 !p-3">
      <div className="mb-4 flex items-start gap-3"><FileText size={32} className="shrink-0 text-slateblue-600" /><div><h2 className="text-lg font-semibold text-slate-900">Drawings &amp; Documents</h2><p className="mt-1 text-xs text-slate-500">Manage, view and link pipeline drawings, engineering documents and related files.</p></div></div>
      <div className="mb-4 flex flex-wrap gap-2"><button type="button" disabled={!pipeline || !canWrite} onClick={() => setMode("upload")} className={primary}><Plus size={16} />Upload New Document</button><button type="button" disabled={!pipeline || !canWrite} onClick={() => { setLinkInitialId(""); setMode("link"); }} className={secondary}><Link2 size={16} />Link Existing</button><button type="button" disabled={!selected || !selectedVersion || actionBusy} onClick={() => { if (selected && selectedVersion) void download(selected, selectedVersion); }} className={secondary}><ArrowDownToLine size={16} />Download</button></div>
      {notice ? <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">{notice}</p> : null}
      {error ? <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700"><span>{error}</span><button type="button" onClick={() => { void reload(); }} className="inline-flex items-center gap-1 font-semibold"><RefreshCw size={14} />Retry</button></div> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.9fr_0.9fr_1.7fr] xl:grid-cols-2 2xl:grid-cols-[1fr_1fr_0.9fr_0.9fr_1.7fr]">
        <Filter label="Document Type" value={type} onChange={(value) => changeFilter(setType, value)}><option value="ALL">All Types</option>{[...new Set([...commonTypes, ...items.map((item) => item.documentType)])].sort().map((value) => <option key={value}>{value}</option>)}</Filter>
        <Filter label="Linked To" value={linkedTo} onChange={(value) => changeFilter(setLinkedTo, value)}><option value="ALL">All Assets</option>{pipeline ? <option value={`pipeline:${pipeline.id}`}>{pipeline.pipelineCode}</option> : null}<optgroup label="Segments">{segments.map((item) => <option key={item.id} value={`segment:${item.id}`}>{item.segmentId}</option>)}</optgroup><optgroup label="Assets">{assets.map((item) => <option key={item.id} value={`asset:${item.id}`}>{item.assetId}</option>)}</optgroup></Filter>
        <Filter label="Document Status" displayLabel="Status" value={status} onChange={(value) => changeFilter(setStatus, value)}><option value="ALL">All Statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</Filter>
        <Filter label="Document Revision" displayLabel="Revision" value={revision} onChange={(value) => changeFilter(setRevision, value)}><option value="ALL">All Revisions</option>{[...new Set(items.flatMap((item) => item.versions.map((version) => version.revision).filter((value): value is string => Boolean(value))))].sort().map((value) => <option key={value}>{value}</option>)}</Filter>
        <label className="font-semibold text-slate-600 xl:col-span-2 2xl:col-span-1">Search Document (Name or Number)<span className="relative block"><Search size={15} className="pointer-events-none absolute bottom-2.5 left-3 text-slate-400" /><input aria-label="Search document name or number" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Search document name or number..." className={`${field} pl-9`} /></span></label>
      </div>
      <div className="max-w-full overflow-x-auto rounded-md border border-slate-200" role="region" aria-label="Pipeline document register" aria-busy={loading}><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr><th className="px-2.5 py-2.5 font-semibold" aria-sort={sort.key === "documentNumber" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" aria-label="Sort by Document ID" onClick={() => toggleSort("documentNumber")} className="inline-flex items-center gap-1 whitespace-nowrap">Document ID{sort.key === "documentNumber" ? sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : null}</button></th>{["Title", "Type", "Linked To", "Revision"].map((heading) => <th key={heading} className="whitespace-nowrap px-2.5 py-2.5 font-semibold">{heading}</th>)}<th className="px-2.5 py-2.5 font-semibold" aria-sort={sort.key === "issueDate" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" aria-label="Sort by Issue Date" onClick={() => toggleSort("issueDate")} className="inline-flex items-center gap-1 whitespace-nowrap">Issue Date{sort.key === "issueDate" ? sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : null}</button></th><th className="px-2.5 py-2.5 font-semibold">Status</th><th className="px-2.5 py-2.5 font-semibold">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">Loading documents...</td></tr> : !pageRows.length ? <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">{error ? "Document records are unavailable." : items.length ? <>No documents match these filters. <button type="button" onClick={clearFilters} className="font-semibold text-slateblue-700 underline">Clear filters</button></> : "No documents linked to this pipeline. Upload a document or link an existing one."}</td></tr> : pageRows.map((row) => <tr key={row.item.documentId} className={`border-t border-slate-100 ${selected?.documentId === row.item.documentId ? "bg-slateblue-50" : "hover:bg-slate-50"}`}>
        <td className="px-2.5 py-2 font-semibold text-slateblue-700"><button type="button" onClick={() => choose(row)} className="whitespace-nowrap text-left">{row.item.documentNumber || row.item.documentId}</button></td><td className="min-w-36 px-2.5 py-2"><button type="button" onClick={() => choose(row)} className="text-left">{row.item.title}</button></td><td className="px-2.5 py-2">{row.item.documentType}</td><td className="px-2.5 py-2">{text(linkLabels(row.item))}</td><td className="whitespace-nowrap px-2.5 py-2">{text(row.version?.revision)}</td><td className="whitespace-nowrap px-2.5 py-2">{date(row.version?.issueDate)}</td><td className="px-2.5 py-2"><DocumentStatus value={row.version?.approvalStatus} /></td>
        <td className="px-2.5 py-2"><div className="flex items-center gap-3 text-slateblue-700"><button type="button" aria-label={`Preview ${row.item.documentNumber || row.item.title}`} onClick={() => choose(row)}><Eye size={16} /></button><button type="button" aria-label={`Download ${row.item.documentNumber || row.item.title}`} disabled={!row.version || actionBusy} onClick={() => { if (row.version) void download(row.item, row.version); }} className="disabled:opacity-40"><ArrowDownToLine size={16} /></button><details className="relative" onToggle={(event) => { const details = event.currentTarget; if (!details.open) return; const rect = details.getBoundingClientRect(), menu = details.querySelector<HTMLDivElement>("[data-document-actions]"); if (menu) { menu.style.left = `${Math.max(8, rect.right - 170)}px`; menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 170))}px`; } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.open = false; }}><summary aria-label={`More actions for ${row.item.documentNumber || row.item.title}`} className="flex cursor-pointer list-none"><MoreVertical size={16} /></summary><div data-document-actions className="fixed z-[100] min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-panel" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}><button type="button" onClick={() => showHistory(row)} className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50">View History</button><button type="button" disabled={!canWrite} onClick={() => { choose(row); setMode("revision"); }} className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40">Upload Revision</button><button type="button" disabled={!canWrite} onClick={() => { setLinkInitialId(row.item.documentId); setMode("link"); }} className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40">Link Document</button><button type="button" onClick={() => setDeleteTarget(row.item)} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-700 hover:bg-red-50"><Trash2 size={15} className="text-red-600" />Delete Document</button></div></details></div></td>
      </tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Showing {rows.length ? (current - 1) * pageSize + 1 : 0} - {Math.min(current * pageSize, rows.length)} of {rows.length.toLocaleString()} documents</span><div className="flex flex-wrap items-center gap-2"><nav aria-label="Document pages" className="flex items-center gap-1"><button type="button" aria-label="Previous document page" disabled={current === 1 || loading} onClick={() => { setPage(current - 1); setVersionId(""); }} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronLeft size={16} /></button>{pageNumbers.map((value, index) => <span key={value} className="inline-flex items-center gap-1">{index > 0 && value - pageNumbers[index - 1] > 1 ? <span className="px-1">...</span> : null}<button type="button" aria-label={`Document page ${value}`} aria-current={current === value ? "page" : undefined} onClick={() => { setPage(value); setVersionId(""); }} className={`rounded px-2.5 py-1 ${current === value ? "bg-slateblue-600 font-semibold text-white" : "border border-slate-200 hover:bg-slate-50"}`}>{value}</button></span>)}<button type="button" aria-label="Next document page" disabled={current === pages || loading} onClick={() => { setPage(current + 1); setVersionId(""); }} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronRight size={16} /></button></nav><select aria-label="Documents per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border border-slate-300 bg-white px-2 py-1">{[10, 25, 50].map((value) => <option key={value}>{value}</option>)}</select></div></div>
    </Panel>
    <Panel className="min-w-0 !p-3 xl:sticky xl:top-3">
      <div className="mb-3 flex items-center gap-2"><FileText size={22} className="text-slateblue-600" /><h2 className="text-lg font-semibold text-slate-900">Document Preview</h2><button type="button" aria-label="Expand document preview" disabled={!preview} onClick={expandPreview} className="ml-auto text-slateblue-700 disabled:opacity-40"><Maximize2 size={17} /></button></div>
      <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50" aria-label="Selected document preview"><PreviewContent preview={preview} loading={previewLoading} error={previewError} selected={Boolean(selectedVersion)} title={selected?.title ?? "Document"} onError={() => setPreviewError("This file cannot be displayed by the browser. Use Open or Download.")} /></div>
      {selected ? <>
        <dl className="my-3 space-y-2">{[["Title", selected.title], ["Document ID", selected.documentNumber || selected.documentId], ["Type", selected.documentType], ["Linked To", linkLabels(selected)], ["Revision", selectedVersion?.revision], ["Issue Date", date(selectedVersion?.issueDate)], ["Owner", selected.owner?.name || selected.ownerId]].map(([label, value]) => <div key={label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2"><dt className="text-slate-500">{label}</dt><dd className={`break-words text-slate-900 ${label === "Title" ? "font-semibold" : ""}`}>{text(value)}</dd></div>)}<div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Status</dt><dd><DocumentStatus value={selectedVersion?.approvalStatus} /></dd></div>{selected.description ? <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Description</dt><dd className="break-words text-slate-700">{selected.description}</dd></div> : null}</dl>
        <div className="border-t border-slate-100 pt-3"><h3 className="mb-2 font-semibold text-slate-900">Revision History</h3>{selectedVersions.length ? <div className="space-y-2">{selectedVersions.slice(0, 3).map((version) => <div key={version.documentVersionId} className={`grid grid-cols-[0.55fr_0.85fr_1fr_auto] items-center gap-2 rounded text-xs ${version.documentVersionId === selectedVersion?.documentVersionId ? "bg-slateblue-50" : ""}`}><button type="button" aria-label={`Preview revision ${version.revision || version.documentVersionId}`} onClick={() => setVersionId(version.documentVersionId)} className="break-words text-left font-semibold text-slateblue-700">{text(version.revision)}</button><span className="text-slate-500">{date(version.issueDate)}</span><span className="text-slate-600">{version.approvalStatus}</span><button type="button" aria-label={`Download revision ${version.revision || version.documentVersionId}`} disabled={actionBusy} onClick={() => { void download(selected, version); }} className="text-slateblue-700 disabled:opacity-40"><ArrowDownToLine size={14} /></button></div>)}</div> : <p className="text-slate-500">No saved versions available.</p>}</div>
      </> : <div className="py-5 text-center text-slate-500">Select a document from the register.</div>}
      <div className="mt-4 grid grid-cols-3 gap-2"><button type="button" disabled={!selectedVersion || actionBusy} onClick={() => { void openDocument(); }} className={primary}><ExternalLink size={15} />Open</button><button type="button" disabled={!selected} onClick={() => showHistory()} className={`${secondary} px-2`}><Clock3 size={15} />View History</button><button type="button" disabled={!selected || !selectedVersion || actionBusy} onClick={() => { if (selected && selectedVersion) void download(selected, selectedVersion); }} className={`${secondary} px-2`}><ArrowDownToLine size={15} />Download</button></div>
    </Panel>
    <dialog ref={previewDialog} aria-label="Expanded document preview" onClose={() => setExpanded(false)} className="h-[90vh] w-[92vw] max-w-6xl rounded-xl border border-slate-200 bg-white p-4 backdrop:bg-slate-950/50"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{selected?.title ?? "Document Preview"} {selectedVersion?.revision ? `- ${selectedVersion.revision}` : ""}</h2><button type="button" aria-label="Close expanded preview" onClick={() => previewDialog.current?.close()} className="text-slateblue-700"><X size={20} /></button></div><div className="flex h-[calc(100%-3rem)] min-h-[70vh] items-center justify-center overflow-auto rounded-md border border-slate-200 bg-slate-50">{expanded ? <PreviewContent preview={preview} loading={previewLoading} error={previewError} selected={Boolean(selectedVersion)} title={selected?.title ?? "Document"} onError={() => setPreviewError("Preview unavailable. Download the saved file to view it.")} /> : null}</div></dialog>
    <dialog ref={historyDialog} aria-label="Document revision history" className="max-h-[85vh] w-[92vw] max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 backdrop:bg-slate-950/50"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Revision History</h2><p className="mt-1 text-xs text-slate-500">{selected?.documentNumber || selected?.title}</p></div><button type="button" aria-label="Close revision history" onClick={() => historyDialog.current?.close()} className="text-slateblue-700"><X size={20} /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr>{["Revision", "Issue Date", "Uploaded", "Status", "File", "Actions"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{selectedVersions.map((version) => <tr key={version.documentVersionId} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{text(version.revision)}</td><td className="px-3 py-2">{date(version.issueDate)}</td><td className="px-3 py-2">{date(version.uploadedAt)}</td><td className="px-3 py-2"><DocumentStatus value={version.approvalStatus} /></td><td className="px-3 py-2">{version.fileName}</td><td className="px-3 py-2"><div className="flex gap-2"><button type="button" aria-label={`View saved revision ${version.revision || version.documentVersionId}`} onClick={() => { setVersionId(version.documentVersionId); historyDialog.current?.close(); }} className="text-slateblue-700"><Eye size={16} /></button><button type="button" aria-label={`Download saved revision ${version.revision || version.documentVersionId}`} disabled={actionBusy} onClick={() => { if (selected) void download(selected, version); }} className="text-slateblue-700"><ArrowDownToLine size={16} /></button></div></td></tr>)}</tbody></table></div>{canWrite && selected ? <button type="button" onClick={() => { historyDialog.current?.close(); setMode("revision"); }} className={`${primary} mt-4`}><Upload size={15} />Upload Revision</button> : null}</dialog>
    {deleteTarget ? <DeleteDocumentDialog document={deleteTarget} onClose={() => setDeleteTarget(null)} /> : null}
    {mode === "upload" || mode === "revision" ? <DocumentUploadDialog key={`${mode}:${selected?.documentId ?? ""}`} mode={mode} document={mode === "revision" ? selected : null} pipeline={pipeline} segments={segments} assets={assets} onClose={() => setMode(null)} onSaved={saved} /> : null}
    {mode === "link" ? <LinkDocumentDialog pipeline={pipeline} segments={segments} assets={assets} initialId={linkInitialId} onClose={() => setMode(null)} onSaved={saved} /> : null}
  </div>;
}
function DeleteDocumentDialog({ document, onClose }: { document: DocumentRepositoryItem; onClose: () => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = modal.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={modal} aria-label="Delete Document" aria-describedby="document-delete-approval" onCancel={onClose} className="max-h-[90vh] w-[94vw] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 backdrop:bg-slate-950/50">
    <div className="mb-4 flex items-start justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Trash2 size={21} className="text-red-600" />Delete Document</h2><button type="button" aria-label="Close document deletion" onClick={onClose} className="text-slateblue-700"><X size={20} /></button></div>
    <p className="mb-4 text-sm text-slate-600">Review the selected document before deletion.</p>
    <dl className="space-y-3 text-sm"><div><dt className="text-xs font-semibold text-slate-600">Document ID</dt><dd className="mt-1 break-all text-slate-900">{document.documentId}</dd></div>{document.documentNumber ? <div><dt className="text-xs font-semibold text-slate-600">Document Number</dt><dd className="mt-1 break-words text-slate-900">{document.documentNumber}</dd></div> : null}<div><dt className="text-xs font-semibold text-slate-600">Title</dt><dd className="mt-1 break-words text-slate-900">{document.title}</dd></div></dl>
    <p id="document-delete-approval" role="alert" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">APPROVAL NEEDED: Document deletion is unavailable until the authenticated delete API, deletion permissions, protected-record checks and retention rules are approved and implemented. No document will be deleted.</p>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className={secondary}>Cancel</button><button type="button" disabled aria-describedby="document-delete-approval" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={15} />Confirm Delete</button></div>
  </dialog>;
}
function Filter({ label, displayLabel, value, onChange, children }: { label: string; displayLabel?: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="font-semibold text-slate-600">{displayLabel || label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={field}>{children}</select></label>; }
function DocumentStatus({ value }: { value?: string }) { const color = value === "Approved" || value === "Approved with Comments" ? "bg-emerald-100 text-emerald-700" : value === "Superseded" || value === "Rejected" ? "bg-red-100 text-red-700" : value === "Draft" || value === "Under Review" || value === "Submitted" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"; return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold ${color}`}>{text(value)}</span>; }
function PreviewContent({ preview, loading, error, selected, title, onError }: { preview: { url: string; mime: string; content?: string } | null; loading: boolean; error: string; selected: boolean; title: string; onError: () => void }) {
  if (loading) return <p className="p-5 text-center text-xs text-slate-500">Loading document preview...</p>;
  if (error) return <p role="status" className="p-5 text-center text-xs text-slate-500">{error}</p>;
  if (!preview) return <div className="flex flex-col items-center gap-3 p-5 text-center text-xs text-slate-500"><FileText size={38} className="text-slateblue-600" /><p>{selected ? "Preview is unavailable for this file type. Use Open or Download to view the saved file." : "Select a saved document to preview."}</p></div>;
  if (preview.mime === "application/pdf") return <iframe src={`${preview.url}#toolbar=0&navpanes=0&view=FitH`} title={`Preview of ${title}`} className="h-full min-h-[250px] w-full border-0" />;
  if (preview.mime.startsWith("image/")) return <img src={preview.url} alt={title} onError={onError} className="h-full w-full object-contain" />;
  return <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-3 text-left text-xs text-slate-700">{preview.content}</pre>;
}
const mimeByExtension: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", tif: "image/tiff", tiff: "image/tiff", eml: "message/rfc822", msg: "application/vnd.ms-outlook" };
function validateFile(file: File) { if (!mimeByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""]) return "Choose a PDF, image, Office, CSV or email file."; if (!file.size || file.size > 25 * 1024 * 1024) return "File must be between 1 byte and 25 MiB."; return ""; }
async function fileInput(file: File) {
  const message = validateFile(file); if (message) throw new Error(message);
  const mimeType = mimeByExtension[file.name.split(".").pop()!.toLowerCase()];
  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("The selected file could not be read.")); reader.readAsDataURL(file); });
  return { fileName: file.name, mimeType, fileData: data.replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`) };
}
function targetInput(value: string, pipeline: PipelineRecord | null) { const [kind, id] = value.split(":"); if (kind === "segment" && id) return { segmentId: id }; if (kind === "asset" && id) return { assetId: id }; if (pipeline) return { pipelineId: pipeline.id }; throw new Error("Select a pipeline before linking documents."); }
function TargetSelect({ pipeline, segments, assets, value, onChange }: Targets & { value: string; onChange: (value: string) => void }) { return <label className="text-xs font-semibold text-slate-600">Link To<select aria-label="Document link target" value={value} onChange={(event) => onChange(event.target.value)} className={field}>{pipeline ? <option value="pipeline">{pipeline.pipelineCode} - {pipeline.pipelineName}</option> : <option value="">No pipeline selected</option>}<optgroup label="Segments">{segments.map((segment) => <option key={segment.id} value={`segment:${segment.id}`}>{segment.segmentId}</option>)}</optgroup><optgroup label="Assets">{assets.map((asset) => <option key={asset.id} value={`asset:${asset.id}`}>{asset.assetId}{asset.name ? ` - ${asset.name}` : ""}</option>)}</optgroup></select></label>; }
function SearchableUploadTarget({ pipeline, segments, assets, value, onChange, disabled }: Targets & { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [query, setQuery] = useState(""), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const options = [
    ...(pipeline ? [{ value: "pipeline", label: `Pipeline: ${pipeline.pipelineCode} - ${pipeline.pipelineName}` }] : []),
    ...segments.map((segment) => ({ value: `segment:${segment.id}`, label: `Segment: ${segment.segmentId} - ${pipeline?.pipelineCode ?? ""}` })),
    ...assets.map((asset) => ({ value: `asset:${asset.id}`, label: `Asset: ${asset.assetId}${asset.name ? ` - ${asset.name}` : ""}` }))
  ];
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const choose = (next: string) => { onChange(next); setQuery(""); setOpen(false); setActive(0); };
  return <div className="relative text-xs font-semibold text-slate-600" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(""); } }}>
    <label htmlFor="upload-document-target">Link To *</label>
    <input id="upload-document-target" role="combobox" aria-label="Document link target" aria-autocomplete="list" aria-expanded={open} aria-controls="upload-target-options" aria-activedescendant={open && filtered[active] ? `upload-target-${active}` : undefined} autoComplete="off" disabled={disabled} value={open ? query : selected?.label ?? ""} placeholder="Search pipeline, segment or asset..." onFocus={() => { setQuery(""); setOpen(true); setActive(0); }} onClick={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(0, Math.min(filtered.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
      if (event.key === "Enter" && open) { event.preventDefault(); if (filtered[active]) choose(filtered[active].value); }
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(""); }
    }} className={field} />
    {open ? <div id="upload-target-options" role="listbox" aria-label="Pipeline and segment link options" className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">{filtered.length ? filtered.map((option, index) => <div id={`upload-target-${index}`} key={option.value} role="option" aria-selected={value === option.value} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.value)} onMouseEnter={() => setActive(index)} className={`cursor-pointer px-3 py-2 font-normal ${index === active ? "bg-slateblue-50 text-slateblue-700" : "text-slate-700"}`}>{option.label}</div>) : <p role="status" className="p-3 font-normal">No matching records in this pipeline.</p>}</div> : null}
    <p className="mt-1 font-normal text-slate-500">Records from the selected pipeline in Asset Master.</p>
  </div>;
}
function DocumentUploadDialog({ mode, document, pipeline, segments, assets, onClose, onSaved }: Targets & { mode: "upload" | "revision"; document: DocumentRepositoryItem | null; onClose: () => void; onSaved: (id: string, message: string) => Promise<void> }) {
  const modal = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ ...uploadDefaults });
  useEffect(() => { const node = modal.current; node?.showModal(); return () => node?.close(); }, []);
  const update = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  function refreshForm() {
    if (busy) return;
    setForm({ ...uploadDefaults });
    setRefreshKey((value) => value + 1);
    setFile(null);
    setError("");
    if (input.current) input.current.value = "";
  }
  function chooseFile(file: File | undefined) { setError(""); if (!file) return; const message = validateFile(file); if (message) { setError(message); setFile(null); } else setFile(file); }
  function usePdfFilename() {
    if (!file || !/\.pdf$/i.test(file.name) || busy) return;
    const stem = file.name.replace(/\.pdf$/i, "").trim();
    setForm((previous) => ({ ...previous, title: previous.title.trim() ? previous.title : stem.replace(/_/g, " ").slice(0, 255), number: previous.number.trim() ? previous.number : stem.slice(0, 255) }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (!file) { setError("Choose a document file before uploading."); return; }
    if (mode === "upload" && (!form.title.trim() || !form.type.trim() || !form.category.trim())) { setError("Enter a title, document type and category before uploading."); return; }
    if (mode === "upload" && (!commonTypes.includes(form.type) || form.category !== uploadDefaults.category)) { setError("Select a listed document type and category."); return; }
    if (mode === "upload" && !(form.target === "pipeline" && pipeline || segments.some((item) => form.target === `segment:${item.id}`) || assets.some((item) => form.target === `asset:${item.id}`))) { setError("Select a saved Pipeline, Segment or Asset from the list."); return; }
    if (mode === "revision" && !form.revision.trim()) { setError("Enter a revision label."); return; }
    setBusy(true); setError("");
    try {
      const payload = { ...await fileInput(file), revision: form.revision.trim() || undefined, issueDate: form.issueDate || undefined, reviewDueDate: form.reviewDate || undefined, expiryDate: form.expiryDate || undefined };
      if (mode === "revision") {
        if (!document) throw new Error("Select a document before uploading a revision.");
        if (!form.revision.trim()) throw new Error("Enter a revision label.");
        await createDocumentVersion(document.documentId, payload);
        await onSaved(document.documentId, "New revision uploaded as Draft.");
      } else {
        const result = await createRepositoryDocument({ ...payload, title: form.title.trim(), documentNumber: form.number.trim() || undefined, documentType: form.type.trim(), category: form.category.trim(), description: form.description.trim() || undefined, ...targetInput(form.target, pipeline) });
        await onSaved(result.item.documentId, "Document uploaded and linked successfully. Status: Draft.");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be uploaded."); }
    finally { setBusy(false); }
  }
  return <dialog ref={modal} aria-label={mode === "upload" ? "Upload New Document" : "Upload Document Revision"} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="max-h-[92vh] w-[94vw] max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 backdrop:bg-slate-950/50"><form onSubmit={submit} className="flex max-h-[92vh] flex-col">
    <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5"><div><h2 className="text-lg font-semibold text-slate-900">{mode === "upload" ? "Upload New Document" : "Upload Revision"}</h2><p className="mt-1 text-xs text-slate-500">{mode === "revision" ? document?.title : "Add a drawing or engineering document and choose where it belongs."}</p></div><button type="button" disabled={busy} aria-label="Close document upload" onClick={onClose} className="text-slateblue-700 disabled:opacity-40"><X size={20} /></button></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-5" aria-label="Document upload fields">
    {error ? <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    <div className="mb-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!busy) { if (event.dataTransfer.files.length > 1) setError("Choose one document at a time."); else chooseFile(event.dataTransfer.files[0]); } }}>
      <Upload size={28} className="mx-auto mb-2 text-slateblue-600" /><p className="mb-2 text-xs text-slate-600">Drag a file here or choose a file</p><input ref={input} type="file" aria-label="Document file" accept={Object.keys(mimeByExtension).map((value) => `.${value}`).join(",")} disabled={busy} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} className="sr-only" /><button type="button" disabled={busy} onClick={() => input.current?.click()} className={secondary}>Choose File</button><p className="mt-2 text-xs text-slate-500">PDF, images, Office, CSV and email files. Maximum 25 MiB.</p>{file ? <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-800"><FileText size={16} /><span className="break-all">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span><button type="button" disabled={busy} aria-label="Remove selected file" onClick={() => setFile(null)}><X size={15} /></button></div> : null}
    </div>
    {mode === "upload" && file && /\.pdf$/i.test(file.name) ? <div className="mb-4"><button type="button" disabled={busy} onClick={usePdfFilename} className={secondary}>Use PDF filename</button><p className="mt-1 text-xs text-slate-500">Fills empty Title and Document Number only. Both remain editable.</p></div> : null}
    <div className="grid gap-4 sm:grid-cols-2">{mode === "upload" ? <><label className="text-xs font-semibold text-slate-600">Title *<input aria-label="Document title" required maxLength={255} value={form.title} onChange={(event) => update("title", event.target.value)} className={field} /></label><label className="text-xs font-semibold text-slate-600">Document Number<input aria-label="Document number" maxLength={255} value={form.number} onChange={(event) => update("number", event.target.value)} className={field} /></label><label className="text-xs font-semibold text-slate-600">Document Type *<select aria-label="Upload document type" required value={form.type} onChange={(event) => update("type", event.target.value)} className={field}><option value="">Select document type</option>{commonTypes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Category *<select aria-label="Document category" required value={form.category} onChange={(event) => update("category", event.target.value)} className={field}><option value="">Select category</option><option value={uploadDefaults.category}>{uploadDefaults.category}</option></select></label></> : null}
      <label className="text-xs font-semibold text-slate-600">Revision{mode === "revision" ? " *" : ""}<input aria-label="Upload revision" required={mode === "revision"} maxLength={80} value={form.revision} onChange={(event) => update("revision", event.target.value)} className={field} /></label><label className="text-xs font-semibold text-slate-600">Issue Date<input aria-label="Upload issue date" type="date" value={form.issueDate} onChange={(event) => update("issueDate", event.target.value)} className={field} /></label><label className="text-xs font-semibold text-slate-600">Review Due Date<input type="date" value={form.reviewDate} onChange={(event) => update("reviewDate", event.target.value)} className={field} /></label><label className="text-xs font-semibold text-slate-600">Expiry Date<input type="date" value={form.expiryDate} onChange={(event) => update("expiryDate", event.target.value)} className={field} /></label>
      {mode === "upload" ? <><SearchableUploadTarget key={refreshKey} pipeline={pipeline} segments={segments} assets={assets} value={form.target} onChange={(value) => update("target", value)} disabled={busy} /><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} className={`${field} min-h-20`} /></label></> : null}
    </div><p className="my-4 text-xs text-slate-500">Uploads are saved as Draft for review.</p></div><div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-5"><button type="button" disabled={busy} onClick={onClose} className={secondary}>Cancel</button>{mode === "upload" ? <button type="button" disabled={busy} onClick={refreshForm} className={secondary}><RefreshCw size={15} />Refresh Form</button> : null}<button type="submit" disabled={busy || !file || !pipeline} className={primary}><Upload size={15} />{busy ? "Uploading..." : mode === "revision" ? "Upload Revision" : "Upload Document"}</button></div>
  </form></dialog>;
}
function LinkDocumentDialog({ pipeline, segments, assets, initialId, onClose, onSaved }: Targets & { initialId: string; onClose: () => void; onSaved: (id: string, message: string) => Promise<void> }) {
  const modal = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(""), [page, setPage] = useState(1), [items, setItems] = useState<DocumentRepositoryItem[]>([]), [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<DocumentRepositoryItem | null>(null), [target, setTarget] = useState("pipeline");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { const node = modal.current; node?.showModal(); return () => node?.close(); }, []);
  useEffect(() => {
    let active = true; setLoading(true);
    const timer = window.setTimeout(() => { void fetchDocuments({ q: query.trim() || undefined, page, pageSize: 20 }).then((result) => { if (active) { setItems(result.items); setTotal(result.total); setLoading(false); } }).catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Existing documents could not be loaded."); setLoading(false); } }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, page]);
  useEffect(() => {
    let active = true;
    if (initialId) void fetchRepositoryDocument(initialId).then((result) => { if (active) setSelected(result.item); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Document could not be selected."); });
    return () => { active = false; };
  }, [initialId]);
  const targetId = target === "pipeline" ? pipeline?.id : target.split(":")[1];
  const alreadyLinked = selected?.links.some((link) => target === "pipeline" ? link.pipeline?.id === targetId : target.startsWith("segment:") ? link.segment?.id === targetId : link.asset?.id === targetId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy || alreadyLinked) return;
    setBusy(true); setError("");
    try { await linkExistingDocument(selected.documentId, targetInput(target, pipeline)); await onSaved(selected.documentId, "Existing document linked successfully."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be linked."); }
    finally { setBusy(false); }
  }
  return <dialog ref={modal} aria-label="Link Existing Document" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="max-h-[90vh] w-[94vw] max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 backdrop:bg-slate-950/50"><form onSubmit={submit}>
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Link Existing Document</h2><p className="mt-1 text-xs text-slate-500">Choose a saved document and the pipeline, segment or asset to link it to.</p></div><button type="button" aria-label="Close link document" disabled={busy} onClick={onClose} className="text-slateblue-700"><X size={20} /></button></div>
    {error ? <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    <label className="text-xs font-semibold text-slate-600">Search Existing Documents<input aria-label="Search existing documents" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setError(""); }} placeholder="Document name or number..." className={field} /></label>
    <div className="my-4 max-h-72 overflow-auto rounded-md border border-slate-200" role="region" aria-label="Existing documents"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-700"><tr><th className="px-3 py-2"><span className="sr-only">Select</span></th><th className="px-3 py-2">Document ID</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Type</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Loading existing documents...</td></tr> : !items.length ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No saved documents match this search.</td></tr> : items.map((item) => <tr key={item.documentId} className={`border-t border-slate-100 ${selected?.documentId === item.documentId ? "bg-slateblue-50" : "hover:bg-slate-50"}`}><td className="px-3 py-2"><input type="radio" name="existing-document" checked={selected?.documentId === item.documentId} aria-label={`Link ${item.documentNumber || item.title}`} onChange={() => setSelected(item)} /></td><td className="px-3 py-2 font-semibold text-slateblue-700"><button type="button" onClick={() => setSelected(item)}>{item.documentNumber || item.documentId}</button></td><td className="px-3 py-2">{item.title}</td><td className="px-3 py-2">{item.documentType}</td></tr>)}</tbody></table></div>
    <div className="mb-4 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{total.toLocaleString()} available documents</span><div className="flex items-center gap-2"><button type="button" aria-label="Previous existing documents" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className={secondary}><ChevronLeft size={15} /></button><span>Page {page} of {Math.max(1, Math.ceil(total / 20))}</span><button type="button" aria-label="Next existing documents" disabled={page * 20 >= total || loading} onClick={() => setPage((value) => value + 1)} className={secondary}><ChevronRight size={15} /></button></div></div>
    {selected ? <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">Selected: <strong>{selected.documentNumber || selected.documentId}</strong> - {selected.title}</p> : null}
    <TargetSelect pipeline={pipeline} segments={segments} assets={assets} value={target} onChange={setTarget} />{alreadyLinked ? <p className="mt-2 text-xs text-slate-500">This document is already linked to the selected target.</p> : null}
    <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className={secondary}>Cancel</button><button type="submit" disabled={!selected || !pipeline || alreadyLinked || busy} className={primary}><Link2 size={15} />{busy ? "Linking..." : "Link Document"}</button></div>
  </form></dialog>;
}
