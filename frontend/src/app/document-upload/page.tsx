"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Panel, StatCard } from "@/components/ui";
import { DocumentUploadDialog } from "@/components/drawings-documents-workspace";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";
import {
  createDocumentVersion,
  createRepositoryDocument,
  fetchDocumentRepositoryOverview,
  createLetterHeadPrint,
  downloadDocumentVersion,
  fetchDocumentTargets,
  fetchDocuments,
  fetchDocumentVersions,
  fetchRepositoryDocument,
  deleteLetterHead,
  fetchLetterHead,
  linkExistingDocument,
  DocumentRepositoryItem,
  DocumentRepositoryOverview,
  DocumentTargets,
  DocumentVersionRecord,
  LetterHeadRecord,
  saveLetterHead
} from "@/lib/apiClient";

type UploadStatus = "Uploaded" | "Pending" | "Review" | "Failed";

type UploadRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  status: UploadStatus;
  fileData?: string;
  error?: string;
};

const MAX_FILES_PER_UPLOAD = 25;
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const STORAGE_KEY = "klinthru-document-upload-history";
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "message/rfc822",
  "application/vnd.ms-outlook"
]);
const allowedExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "tif",
  "tiff",
  "eml",
  "msg"
]);
const letterHeadMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const letterHeadExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatDateTime(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function formatDate(date?: string | null) {
  if (!date) return "No Data";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "No Data" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}

function getFileLabel(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type) {
    return file.type;
  }

  return extension ? `.${extension}` : "Unknown";
}

function isAllowedFileType(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return allowedMimeTypes.has(mimeType) || allowedExtensions.has(extension);
}

function isAllowedLetterHeadType(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return letterHeadMimeTypes.has(mimeType) || letterHeadExtensions.has(extension);
}

function isPrintableDocument(record: UploadRecord) {
  return record.fileType === "application/pdf" || record.fileType.startsWith("image/");
}

function getStoredUploadHistory(): UploadRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as UploadRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dataUriToBlob(dataUri: string) {
  const [metadata, base64] = dataUri.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

function readFileAsDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function RepositoryWorkspace({ isAuthenticated, role }: { isAuthenticated: boolean; role?: string }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"all" | "register">("all");
  const [items, setItems] = useState<DocumentRepositoryItem[]>([]);
  const [targets, setTargets] = useState<DocumentTargets>({ pipelines: [], segments: [], assets: [] });
  const [selected, setSelected] = useState<DocumentRepositoryItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [query, setQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [validityFilter, setValidityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState(() => searchParams.get("pipelineId") ?? "");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [revisionFilter, setRevisionFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [issueDateFrom, setIssueDateFrom] = useState("");
  const [issueDateTo, setIssueDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [category, setCategory] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [revision, setRevision] = useState("");
  const [description, setDescription] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [pipelineId, setPipelineId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<DocumentRepositoryOverview | null>(null);
  const [preview, setPreview] = useState<{ url: string; mimeType: string } | null>(null);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [linkCandidateId, setLinkCandidateId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [reviewDueDate, setReviewDueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const canWrite = role === "Admin" || role === "Engineer";
  const pageSize = 6;
  const uploadPipeline = pipelineFilter ? targets.pipelines.find((target) => target.id === pipelineFilter) ?? null : null;
  const uploadPipelineRecord = uploadPipeline as PipelineRecord | null;
  const uploadSegments = targets.segments as AssetMasterSegmentRecord[];
  const uploadAssets = targets.assets as AssetMasterAssetRecord[];

  useEffect(() => {
    const requestedPipelineId = searchParams.get("pipelineId");
    if (requestedPipelineId && requestedPipelineId !== pipelineFilter) {
      setPipelineFilter(requestedPipelineId);
      setPage(1);
    }
  }, [searchParams, pipelineFilter]);

  async function reload() {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchDocuments({ q: query, documentType: typeFilter, category: categoryFilter, pipelineId: pipelineFilter, segmentId: segmentFilter, assetId: assetFilter, approvalStatus: approvalFilter, validityStatus: validityFilter, revision: revisionFilter, owner: ownerFilter, issueDateFrom, issueDateTo, page, pageSize });
      setItems(result.items);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Documents could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, [isAuthenticated, query, typeFilter, categoryFilter, pipelineFilter, segmentFilter, assetFilter, approvalFilter, validityFilter, revisionFilter, ownerFilter, issueDateFrom, issueDateTo, page]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDocumentTargets().then(setTargets).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Authorized targets could not be loaded."));
    fetchDocumentRepositoryOverview().then(setOverview).catch(() => setOverview(null));
  }, [isAuthenticated]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function openDetails(item: DocumentRepositoryItem) {
    setSelected(item);
    setError("");
    try {
      const exact = (await fetchRepositoryDocument(item.documentId)).item;
      setSelected(exact);
      setVersions((await fetchDocumentVersions(item.documentId)).items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Document details could not be loaded.");
      setVersions(item.versions);
    }
  }

  async function sendFile(file: File) {
    if (file.size > 25 * 1024 * 1024) throw new Error("File must be 25 MiB or smaller.");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const fallbackMime: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", tif: "image/tiff", tiff: "image/tiff", eml: "message/rfc822", msg: "application/vnd.ms-outlook" };
    const mimeType = file.type || fallbackMime[extension] || "application/octet-stream";
    const rawData = await readFileAsDataUri(file);
    const fileData = rawData.replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`);
    return { fileName: file.name, mimeType, fileData };
  }

  async function createDocument() {
    if (!uploadFile || !title.trim() || !documentType.trim() || !category.trim()) {
      setError("Select a file and enter Title, Document Type, and Category.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createRepositoryDocument({
        ...(await sendFile(uploadFile)), title, documentType, category, documentNumber, revision, description, isGlobal, issueDate: issueDate || undefined, reviewDueDate: reviewDueDate || undefined, expiryDate: expiryDate || undefined,
        pipelineId: pipelineId || undefined, segmentId: segmentId || undefined, assetId: assetId || undefined
      });
      setShowCreate(false);
      setTitle(""); setDocumentType(""); setCategory(""); setDocumentNumber(""); setRevision(""); setDescription(""); setIssueDate(""); setReviewDueDate(""); setExpiryDate(""); setUploadFile(null); setPipelineId(""); setSegmentId(""); setAssetId(""); setIsGlobal(false);
      setNotice("Document saved. Approval Status: Draft. Validity Status: No Data.");
      await reload();
      setOverview(await fetchDocumentRepositoryOverview());
    } catch (saveError) {
      const duplicateId = (saveError as { fields?: Record<string, string> }).fields?.existingDocumentId;
      const apiError = saveError as Error & { status?: number };
      if (apiError.status === 409 && duplicateId) {
        setNotice(`Duplicate detected. Existing Document_ID: ${duplicateId}`);
        setSelected({ documentId: duplicateId, documentFamilyId: "", documentNumber: null, title: "Existing document", documentType: "", category: "", description: null, isGlobal: false, ownerId: "", updatedAt: "", versions: [], links: [] });
      } else setError(saveError instanceof Error ? saveError.message : "Document could not be saved.");
    } finally { setBusy(false); }
  }

  async function addRevision() {
    if (!selected || !revisionFile || !revision.trim()) { setError("Choose a file and enter the new revision."); return; }
    setBusy(true); setError("");
    try {
      await createDocumentVersion(selected.documentId, { ...(await sendFile(revisionFile)), revision });
      setRevisionFile(null); setRevision("");
      setVersions((await fetchDocumentVersions(selected.documentId)).items);
      await reload();
      setNotice("A new immutable document version was created.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "New revision could not be saved."); }
    finally { setBusy(false); }
  }

  async function linkSelection() {
    if (!selected || (!pipelineId && !segmentId && !assetId)) { setError("Select at least one verified target."); return; }
    setBusy(true); setError("");
    try {
      await linkExistingDocument(selected.documentId, { pipelineId: pipelineId || undefined, segmentId: segmentId || undefined, assetId: assetId || undefined });
      setNotice("Existing document linked. No file copy was created.");
      setPipelineId(""); setSegmentId(""); setAssetId("");
      setSelected((await fetchRepositoryDocument(selected.documentId)).item);
      await reload();
    } catch (linkError) { setError(linkError instanceof Error ? linkError.message : "Document could not be linked."); }
    finally { setBusy(false); }
  }

  async function download(item: DocumentRepositoryItem, version: DocumentVersionRecord) {
    try {
      const blob = await downloadDocumentVersion(item.documentId, version.documentVersionId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = version.fileName; anchor.rel = "noopener"; anchor.style.display = "none"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "Download failed."); }
  }

  async function previewDocument(item: DocumentRepositoryItem, version?: DocumentVersionRecord) {
    const selectedVersion = version ?? item.versions[0];
    if (!selectedVersion) { setError("No Data"); return; }
    if (selectedVersion.mimeType !== "application/pdf" && !selectedVersion.mimeType.startsWith("image/")) { setError("Preview unavailable for this file type."); return; }
    try {
      const blob = await downloadDocumentVersion(item.documentId, selectedVersion.documentVersionId);
      clearPreview();
      setPreview({ url: URL.createObjectURL(blob), mimeType: selectedVersion.mimeType });
      await openDetails(item);
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "Preview unavailable."); }
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  const registerRows = items.flatMap((item) => item.versions.map((version) => ({ item, version })));

  return (
    <Panel className="border-slate-200 p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-lg font-semibold text-slate-900">Document Repository</h2><p className="mt-1 text-sm text-slate-500">All Documents and Document Register</p></div>
{canWrite ? <div className="flex flex-wrap gap-2"><button className="rounded border border-slateblue-300 px-4 py-2 text-sm font-semibold text-slateblue-700" onClick={() => setShowLinkExisting(true)} type="button">Link Existing</button><button className="rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => { setShowCreate((value) => !value); setSelected(null); if (pipelineFilter) setPipelineId(pipelineFilter); }} type="button">{showCreate ? "Close Upload" : "Upload Document"}</button></div> : null}
      </div>
      <div className="flex border-b border-slate-200" role="tablist" aria-label="Document repository views">
        <button aria-selected={tab === "all"} className={`px-4 py-3 text-sm font-semibold ${tab === "all" ? "border-b-2 border-slateblue-600 text-slateblue-700" : "text-slate-600"}`} onClick={() => setTab("all")} role="tab" type="button">All Documents</button>
        <button aria-selected={tab === "register"} className={`px-4 py-3 text-sm font-semibold ${tab === "register" ? "border-b-2 border-slateblue-600 text-slateblue-700" : "text-slate-600"}`} onClick={() => setTab("register")} role="tab" type="button">Document Register</button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Total Documents" value={overview?.totalDocuments ?? "Unavailable"} tone="blue" />
        <StatCard label="Approved" value={overview?.approved ?? "Unavailable"} tone="green" />
        <StatCard label="Under Review" value={overview?.underReview ?? "Unavailable"} tone="amber" />
        <StatCard label="Expired" value={overview?.expired ?? "Unavailable"} tone="red" />
        <StatCard label="Expiring Soon" value={overview?.expiringSoon ?? "Unavailable"} tone="amber" />
        <StatCard label="Unlinked / Unclassified Documents" value={overview?.unlinkedDocuments ?? "Unavailable"} tone="red" />
        <StatCard label="Total Storage" value={role === "Admin" && overview?.totalStorageBytes != null ? formatFileSize(overview.totalStorageBytes) : "Unavailable"} tone="blue" />
      </div>

      {error ? <p className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-5" role="alert">{error}</p> : null}
      {notice ? <p className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-5" role="status">{notice}</p> : null}

      {showLinkExisting ? <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40"><section aria-label="Link Existing Document" aria-modal="true" className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7" role="dialog"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Link Existing Document</h2><button aria-label="Close link existing drawer" className="rounded border px-3 py-2" onClick={() => setShowLinkExisting(false)} type="button">Close</button></div><label className="block text-sm font-medium text-slate-700">Existing Document<select aria-label="Existing Document" className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" onChange={(event) => setLinkCandidateId(event.target.value)} value={linkCandidateId}><option value="">Select Document</option>{items.map((item) => <option key={item.documentId} value={item.documentId}>{item.title} — {item.documentNumber || item.documentId}</option>)}</select></label><button className="mt-4 rounded border border-slateblue-300 px-4 py-2 text-sm font-semibold text-slateblue-700 disabled:opacity-50" disabled={!linkCandidateId} onClick={() => { const candidate = items.find((item) => item.documentId === linkCandidateId); if (candidate) { setShowLinkExisting(false); void openDetails(candidate); } }} type="button">Continue</button></section></div> : null}

      {false && showCreate ? <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40"><section aria-label="Upload Document" aria-modal="true" className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7" role="dialog"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Upload Document</h2><button aria-label="Close upload drawer" className="rounded border px-3 py-2" onClick={() => setShowCreate(false)} type="button">Close</button></div><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">File (25 MiB maximum)<input className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} type="file" /></label>
        <label className="text-sm font-medium text-slate-700">Title<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setTitle(event.target.value)} value={title} /></label>
        <label className="text-sm font-medium text-slate-700">Document Type<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setDocumentType(event.target.value)} value={documentType} /></label>
        <label className="text-sm font-medium text-slate-700">Category<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setCategory(event.target.value)} value={category} /></label>
        <label className="text-sm font-medium text-slate-700">Document Number<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setDocumentNumber(event.target.value)} value={documentNumber} /></label>
        <label className="text-sm font-medium text-slate-700">Document Revision<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setRevision(event.target.value)} value={revision} /></label>
        <label className="text-sm font-medium text-slate-700">Issue Date<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setIssueDate(event.target.value)} type="date" value={issueDate} /></label>
        <label className="text-sm font-medium text-slate-700">Review Due Date<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setReviewDueDate(event.target.value)} type="date" value={reviewDueDate} /></label>
        <label className="text-sm font-medium text-slate-700">Expiry Date<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setExpiryDate(event.target.value)} type="date" value={expiryDate} /></label>
        <label className="text-sm font-medium text-slate-700">Description<input className="mt-1 block w-full rounded-md border border-slate-300 p-2" onChange={(event) => setDescription(event.target.value)} value={description} /></label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input checked={isGlobal} onChange={(event) => { setIsGlobal(event.target.checked); if (event.target.checked) { setPipelineId(""); setSegmentId(""); setAssetId(""); } }} type="checkbox" />Global document</label>
        {!isGlobal ? <>
          <label className="text-sm font-medium text-slate-700">Pipeline<select className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" onChange={(event) => setPipelineId(event.target.value)} value={pipelineId}><option value="">Select Pipeline</option>{targets.pipelines.map((target) => <option key={target.id} value={target.id}>{target.pipelineCode} — {target.pipelineName}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Segment<select className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" onChange={(event) => setSegmentId(event.target.value)} value={segmentId}><option value="">Select Segment</option>{targets.segments.map((target) => <option key={target.id} value={target.id}>{target.segmentId}{target.name ? ` — ${target.name}` : ""}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Asset<select className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" onChange={(event) => setAssetId(event.target.value)} value={assetId}><option value="">Select Asset</option>{targets.assets.map((target) => <option key={target.id} value={target.id}>{target.assetId}{target.name ? ` — ${target.name}` : ""}</option>)}</select></label>
        </> : null}
        <p className="text-sm text-slate-500">Effective Date, Originator, Confidentiality, and Retention Class: No Data.</p>
        <div className="flex items-end"><button className="rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void createDocument()} type="button">{busy ? "Saving..." : "Save Document"}</button></div>
      </div></section></div> : null}
      {showCreate ? <DocumentUploadDialog mode="upload" document={null} existingDocuments={items} pipeline={uploadPipelineRecord} segments={uploadSegments} assets={uploadAssets} onClose={() => setShowCreate(false)} onSaved={async (documentId, message) => { setShowCreate(false); setSelected(null); setNotice(message); await reload(); const refreshed = await fetchRepositoryDocument(documentId); setSelected(refreshed.item); setVersions(refreshed.item.versions); }} /> : null}

      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <input aria-label="Keyword search" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setQuery, event.target.value)} placeholder="Keyword search" value={query} />
        <input aria-label="Document Type" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setTypeFilter, event.target.value)} placeholder="Document Type" value={typeFilter} />
        <input aria-label="Category" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setCategoryFilter, event.target.value)} placeholder="Category" value={categoryFilter} />
        <select aria-label="Pipeline" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" onChange={(event) => updateFilter(setPipelineFilter, event.target.value)} value={pipelineFilter}><option value="">Pipeline</option>{targets.pipelines.map((target) => <option key={target.id} value={target.id}>{target.pipelineCode} - {target.pipelineName}</option>)}</select>
        <select aria-label="Segment" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" onChange={(event) => updateFilter(setSegmentFilter, event.target.value)} value={segmentFilter}><option value="">Segment</option>{targets.segments.map((target) => <option key={target.id} value={target.id}>{target.segmentId}</option>)}</select>
        <select aria-label="Asset" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" onChange={(event) => updateFilter(setAssetFilter, event.target.value)} value={assetFilter}><option value="">Asset</option>{targets.assets.map((target) => <option key={target.id} value={target.id}>{target.assetId}</option>)}</select>
        <select aria-label="Approval Status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" onChange={(event) => updateFilter(setApprovalFilter, event.target.value)} value={approvalFilter}><option value="">Approval Status</option>{["Draft", "Submitted", "Under Review", "Approved", "Approved with Comments", "Rejected", "Superseded", "Archived"].map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Validity Status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" onChange={(event) => updateFilter(setValidityFilter, event.target.value)} value={validityFilter}><option value="">Validity Status</option>{["Current", "Review Due", "Expiring Soon", "Expired", "No Expiry"].map((value) => <option key={value}>{value}</option>)}</select>
        <input aria-label="Revision" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setRevisionFilter, event.target.value)} placeholder="Revision" value={revisionFilter} />
        <input aria-label="Owner" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setOwnerFilter, event.target.value)} placeholder="Owner" value={ownerFilter} />
        <label className="text-xs text-slate-600">Date Range — Issue Date from<input aria-label="Date Range — Issue Date from" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setIssueDateFrom, event.target.value)} type="date" value={issueDateFrom} /></label>
        <label className="text-xs text-slate-600">Date Range — Issue Date to<input aria-label="Date Range — Issue Date to" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(event) => updateFilter(setIssueDateTo, event.target.value)} type="date" value={issueDateTo} /></label>
        <select aria-label="Source filter 1 (unverified)" className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500" disabled><option>Source</option></select>
        <select aria-label="Source filter 2 (unverified)" className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500" disabled><option>Source</option></select>
        <input aria-label="Confidentiality unavailable" className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500" disabled placeholder="Confidentiality — Unavailable" />
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => { setQuery(""); setTypeFilter(""); setCategoryFilter(""); setPipelineFilter(""); setSegmentFilter(""); setAssetFilter(""); setApprovalFilter(""); setValidityFilter(""); setRevisionFilter(""); setOwnerFilter(""); setIssueDateFrom(""); setIssueDateTo(""); setPage(1); }} type="button">Reset Filters</button>
      </div>

      <div className={selected ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]" : ""}>
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-[1250px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{tab === "all" ? <><th className="px-3 py-3">Document ID</th><th className="px-3 py-3">Document Number</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Pipeline / Segment</th><th className="px-3 py-3">Asset</th><th className="px-3 py-3">Revision</th><th className="px-3 py-3">Approval Status</th><th className="px-3 py-3">Validity Status</th><th className="px-3 py-3">Issue Date</th><th className="px-3 py-3">Owner</th></> : <><th className="px-3 py-3">Document ID</th><th className="px-3 py-3">Document Number</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Revision</th><th className="px-3 py-3">Current Revision?</th><th className="px-3 py-3">Issue Date</th><th className="px-3 py-3">Effective Date</th><th className="px-3 py-3">Approval</th><th className="px-3 py-3">Validity</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Originator</th><th className="px-3 py-3">Confidentiality</th><th className="px-3 py-3">Retention Class</th></>}<th className="px-3 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={16}>Loading...</td></tr> : tab === "all" ? items.length ? items.map((item) => { const version = item.versions[0]; const pipelineSegments = item.links.flatMap((link) => [link.pipeline?.pipelineCode, link.segment?.segmentId].filter(Boolean)); const assets = item.links.map((link) => link.asset?.assetId).filter(Boolean); return <tr className="cursor-pointer hover:bg-slate-50" key={item.documentId} onClick={() => void openDetails(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void openDetails(item); } }} tabIndex={0}><td className="px-3 py-3">{item.documentId}</td><td className="px-3 py-3">{item.documentNumber || "No Data"}</td><td className="px-3 py-3"><button className="text-left font-semibold text-slate-900 hover:text-slateblue-700" onClick={(event) => { event.stopPropagation(); void previewDocument(item); }} type="button">{item.title}</button></td><td className="px-3 py-3">{item.documentType || "No Data"}</td><td className="px-3 py-3">{item.category || "No Data"}</td><td className="px-3 py-3">{pipelineSegments.join(", ") || "No Data"}</td><td className="px-3 py-3">{assets.join(", ") || "No Data"}</td><td className="px-3 py-3">{version?.revision || "No Data"}</td><td className="px-3 py-3">{version?.approvalStatus || "No Data"}</td><td className="px-3 py-3">{version?.validityStatus || "No Data"}</td><td className="px-3 py-3">{formatDate(version?.issueDate)}</td><td className="px-3 py-3">{item.owner?.name || item.ownerId || "No Data"}</td><td className="px-3 py-3"><button className="text-slateblue-700 underline" onClick={(event) => { event.stopPropagation(); void openDetails(item); }} type="button">View Details</button></td></tr>; }) : <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={13}>No Data</td></tr> : registerRows.length ? registerRows.map(({ item, version }) => <tr className="cursor-pointer hover:bg-slate-50" key={version.documentVersionId} onClick={() => void openDetails(item)} tabIndex={0}><td className="px-3 py-3">{item.documentId}</td><td className="px-3 py-3">{item.documentNumber || "No Data"}</td><td className="px-3 py-3">{item.title}</td><td className="px-3 py-3">{item.documentType || "No Data"}</td><td className="px-3 py-3">{item.category || "No Data"}</td><td className="px-3 py-3">{version.revision || "No Data"}</td><td className="px-3 py-3">{version.approvalStatus === "Approved" ? "Current" : version.approvalStatus === "Superseded" ? "Not Current" : "No Data"}</td><td className="px-3 py-3">{formatDate(version.issueDate)}</td><td className="px-3 py-3">No Data</td><td className="px-3 py-3">{version.approvalStatus}</td><td className="px-3 py-3">{version.validityStatus || "No Data"}</td><td className="px-3 py-3">{item.owner?.name || item.ownerId || "No Data"}</td><td className="px-3 py-3">No Data</td><td className="px-3 py-3">No Data</td><td className="px-3 py-3">No Data</td><td className="px-3 py-3"><button className="text-slateblue-700 underline" onClick={(event) => { event.stopPropagation(); void openDetails(item); }} type="button">View Details</button></td></tr>) : <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={15}>No Data</td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600"><span>{total ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}` : "No Data"}</span><div className="flex gap-2"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * pageSize >= total} onClick={() => setPage((value) => value + 1)} type="button">Next</button></div></div>
        </div>
        {selected ? <aside aria-label="Document Details" className="min-w-0 border-l border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{selected.title}</h3><p className="mt-1 break-all text-xs text-slate-500">Document_ID: {selected.documentId}</p></div><button aria-label="Close details" className="rounded border px-3 py-1" onClick={() => { setSelected(null); clearPreview(); }} type="button">Close</button></div>
          {preview ? <div className="mt-3 overflow-hidden rounded border bg-white">{preview.mimeType === "application/pdf" ? <iframe title="Document preview" className="h-[420px] w-full" src={preview.url} /> : <img alt={`Preview of ${selected.title}`} className="max-h-[420px] w-full object-contain" src={preview.url} />}</div> : null}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><dt>Document Number</dt><dd>{selected.documentNumber || "No Data"}</dd><dt>Type</dt><dd>{selected.documentType || "No Data"}</dd><dt>Category</dt><dd>{selected.category || "No Data"}</dd><dt>Owner</dt><dd>{selected.owner?.name || selected.ownerId || "No Data"}</dd><dt>Issue Date</dt><dd>{formatDate(versions[0]?.issueDate)}</dd><dt>Effective Date</dt><dd>No Data</dd><dt>Review Due Date</dt><dd>{formatDate(versions[0]?.reviewDueDate)}</dd><dt>Expiry Date</dt><dd>{formatDate(versions[0]?.expiryDate)}</dd><dt>Originator</dt><dd>No Data</dd><dt>Confidentiality</dt><dd>No Data</dd><dt>Retention Class</dt><dd>No Data</dd><dt>Approval Status</dt><dd>{versions[0]?.approvalStatus || "Draft"}</dd><dt>Validity / Review Status</dt><dd>{versions[0]?.validityStatus || "No Data"}</dd></dl>
          <p className="mt-3 text-sm text-slate-600">Related records: {selected.isGlobal ? "Global" : selected.links.length ? selected.links.map((link) => link.pipeline?.pipelineCode || link.segment?.segmentId || link.asset?.assetId || "No Data").join(", ") : "No Data"}</p>
          {canWrite ? <div className="mt-3 grid gap-2 rounded-md border bg-white p-3"><h4 className="text-sm font-semibold">Link Existing Document</h4><select aria-label="Link Existing Document Pipeline" className="rounded border p-2" onChange={(event) => setPipelineId(event.target.value)} value={pipelineId}><option value="">Pipeline</option>{targets.pipelines.map((target) => <option key={target.id} value={target.id}>{target.pipelineCode} — {target.pipelineName}</option>)}</select><select aria-label="Link Existing Document Segment" className="rounded border p-2" onChange={(event) => setSegmentId(event.target.value)} value={segmentId}><option value="">Segment</option>{targets.segments.map((target) => <option key={target.id} value={target.id}>{target.segmentId}</option>)}</select><select aria-label="Link Existing Document Asset" className="rounded border p-2" onChange={(event) => setAssetId(event.target.value)} value={assetId}><option value="">Asset</option>{targets.assets.map((target) => <option key={target.id} value={target.id}>{target.assetId}{target.name ? ` — ${target.name}` : ""}</option>)}</select><button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={busy} onClick={() => void linkSelection()} type="button">Link Existing Document</button></div> : null}
          <h4 className="mt-4 text-sm font-semibold">Version History</h4>
          <div className="mt-2 divide-y rounded-md border bg-white">{versions.length ? versions.map((version) => <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm" key={version.documentVersionId}><span>{version.revision || "No Data"} · {version.fileName} · {formatFileSize(version.fileSize)}{version.approvalStatus === "Approved" ? " · Current" : version.approvalStatus === "Superseded" ? " · Not Current" : " · Current status: No Data"}</span><div className="flex gap-3"><button className="text-slateblue-700 underline" onClick={() => void previewDocument(selected, version)} type="button">Preview</button><button className="text-slateblue-700 underline" onClick={() => void download(selected, version)} type="button">Download</button></div></div>) : <p className="p-3 text-sm text-slate-500">No Data</p>}</div>
          {canWrite ? <div className="mt-4 grid gap-3"><label className="text-sm">New Revision<input className="mt-1 block w-full rounded border p-2" onChange={(event) => setRevision(event.target.value)} value={revision} /></label><label className="text-sm">New Version File<input className="mt-1 block w-full rounded border p-2" onChange={(event) => setRevisionFile(event.target.files?.[0] ?? null)} type="file" /></label><button className="rounded border border-slateblue-300 px-3 py-2 text-sm text-slateblue-700 disabled:opacity-50" disabled={busy} onClick={() => void addRevision()} type="button">Add New Revision</button><button className="rounded border px-3 py-2 text-sm" disabled>Share — Unavailable</button><button className="rounded border px-3 py-2 text-sm" disabled>Add to Package — Unavailable</button><button className="rounded border px-3 py-2 text-sm" disabled>Import — Unavailable</button></div> : null}
        </aside> : null}
      </div>

      <div className="hidden">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{tab === "all" ? <><th className="px-4 py-3">Document</th><th className="px-4 py-3">Document Number</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Current Revision</th><th className="px-4 py-3">Approval Status</th><th className="px-4 py-3">Validity / Review Status</th></> : <><th className="px-4 py-3">Document_ID</th><th className="px-4 py-3">Document_Family_ID</th><th className="px-4 py-3">Document_Version_ID</th><th className="px-4 py-3">Document_Revision</th><th className="px-4 py-3">Approval Status</th><th className="px-4 py-3">Validity / Review Status</th></>}<th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{loading ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Loading...</td></tr> : tab === "all" ? items.length ? items.map((item) => { const version = item.versions[0]; return <tr className="hover:bg-slate-50" key={item.documentId}><td className="px-4 py-3"><button className="text-left font-semibold text-slate-900 hover:text-slateblue-700" onClick={() => void openDetails(item)} type="button">{item.title}</button><p className="text-xs text-slate-500">{item.documentType}</p></td><td className="px-4 py-3">{item.documentNumber || "No Data"}</td><td className="px-4 py-3">{item.category}</td><td className="px-4 py-3">{version?.revision || "No Data"}</td><td className="px-4 py-3">{version?.approvalStatus || "No Data"}</td><td className="px-4 py-3">{version?.validityStatus || "No Data"}</td><td className="px-4 py-3"><button className="text-slateblue-700 underline" onClick={() => void openDetails(item)} type="button">Details</button></td></tr>; }) : <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No Data</td></tr> : registerRows.length ? registerRows.map(({ item, version }) => <tr className="hover:bg-slate-50" key={version.documentVersionId}><td className="px-4 py-3">{item.documentId}</td><td className="px-4 py-3">{item.documentFamilyId}</td><td className="px-4 py-3">{version.documentVersionId}</td><td className="px-4 py-3">{version.revision || "No Data"}</td><td className="px-4 py-3">{version.approvalStatus}</td><td className="px-4 py-3">{version.validityStatus || "No Data"}</td><td className="px-4 py-3"><button className="text-slateblue-700 underline" onClick={() => void openDetails(item)} type="button">Details</button></td></tr>) : <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No Data</td></tr>}</tbody>
        </table>
      </div>
      <div className="hidden">
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600"><span>{total ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}` : "No Data"}</span><div className="flex gap-2"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * pageSize >= total} onClick={() => setPage((value) => value + 1)} type="button">Next</button></div></div>
      </div>

      {selected ? <div className="hidden">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{selected.title}</h3><p className="mt-1 break-all text-xs text-slate-500">Document_ID: {selected.documentId}</p></div><button aria-label="Close details" className="rounded border px-3 py-1" onClick={() => setSelected(null)} type="button">Close</button></div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Approval Status: {selected.versions[0]?.approvalStatus || "Draft"}</p><p>Validity / Review Status: {selected.versions[0]?.validityStatus || "No Data"}</p><p>Processing Status: {selected.versions[0]?.processingStatus || "No Data"}</p></div>
        <p className="mt-2 text-sm text-slate-600">Linked targets: {selected.isGlobal ? "Global" : selected.links.length ? selected.links.map((link) => link.pipeline?.pipelineName || link.segment?.name || link.asset?.name || link.pipeline?.pipelineCode || link.segment?.segmentId || link.asset?.assetId || "No Data").join(", ") : "No Data"}</p>
        <h4 className="mt-4 text-sm font-semibold">Version History</h4>
        <div className="mt-2 divide-y rounded-md border bg-white">{versions.length ? versions.map((version) => <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm" key={version.documentVersionId}><span>{version.revision || "No Data"} · {version.fileName} · {formatFileSize(version.fileSize)}</span><button className="text-slateblue-700 underline" onClick={() => void download(selected, version)} type="button">Download</button></div>) : <p className="p-3 text-sm text-slate-500">No Data</p>}</div>
        {canWrite ? <div className="mt-4 grid gap-3 md:grid-cols-4"><label className="text-sm">New Revision<input className="mt-1 block w-full rounded border p-2" onChange={(event) => setRevision(event.target.value)} value={revision} /></label><label className="text-sm">New Version File<input className="mt-1 block w-full rounded border p-2" onChange={(event) => setRevisionFile(event.target.files?.[0] ?? null)} type="file" /></label><button className="self-end rounded border border-slateblue-300 px-3 py-2 text-sm text-slateblue-700 disabled:opacity-50" disabled={busy} onClick={() => void addRevision()} type="button">Add New Revision</button>
          <div className="grid gap-2"><select aria-label="Link Existing Document Pipeline" className="rounded border p-2" onChange={(event) => setPipelineId(event.target.value)} value={pipelineId}><option value="">Pipeline</option>{targets.pipelines.map((target) => <option key={target.id} value={target.id}>{target.pipelineCode} — {target.pipelineName}</option>)}</select><select aria-label="Link Existing Document Segment" className="rounded border p-2" onChange={(event) => setSegmentId(event.target.value)} value={segmentId}><option value="">Segment</option>{targets.segments.map((target) => <option key={target.id} value={target.id}>{target.segmentId}</option>)}</select><select aria-label="Link Existing Document Asset" className="rounded border p-2" onChange={(event) => setAssetId(event.target.value)} value={assetId}><option value="">Asset</option>{targets.assets.map((target) => <option key={target.id} value={target.id}>{target.assetId}</option>)}</select><button className="rounded border px-3 py-2 text-sm" disabled={busy} onClick={() => void linkSelection()} type="button">Link Existing Document</button></div>
        </div> : null}
      </div> : null}
    </Panel>
  );
}

export default function DocumentUploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const letterHeadInputRef = useRef<HTMLInputElement | null>(null);
  const { isAuthenticated, user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>(getStoredUploadHistory);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [letterHead, setLetterHead] = useState<LetterHeadRecord | null>(null);
  const [letterHeadError, setLetterHeadError] = useState<string | null>(null);
  const [isLetterHeadLoading, setIsLetterHeadLoading] = useState(true);
  const [isSavingLetterHead, setIsSavingLetterHead] = useState(false);
  const [useLetterHeadForPrint, setUseLetterHeadForPrint] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadHistory));
    }
  }, [uploadHistory]);

  useEffect(() => {
    let active = true;

    async function loadLetterHead() {
      if (!isAuthenticated) {
        if (active) {
          setLetterHead(null);
          setIsLetterHeadLoading(false);
        }
        return;
      }

      setIsLetterHeadLoading(true);
      try {
        const record = await fetchLetterHead();
        if (active) {
          setLetterHead(record);
          setLetterHeadError(null);
        }
      } catch (error) {
        if (active) {
          setLetterHeadError(error instanceof Error ? error.message : "Letter Head could not be loaded.");
        }
      } finally {
        if (active) {
          setIsLetterHeadLoading(false);
        }
      }
    }

    void loadLetterHead();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const canDelete = user?.role === "Admin" || user?.role === "Engineer";

  function validateFiles(files: File[]) {
    const nextErrors: string[] = [];

    if (files.length === 0) {
      nextErrors.push("Please select at least one file to upload.");
      return nextErrors;
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      nextErrors.push(`You can upload up to ${MAX_FILES_PER_UPLOAD} files per batch.`);
    }

    const unsupportedFiles = files.filter((file) => !isAllowedFileType(file));
    if (unsupportedFiles.length > 0) {
      nextErrors.push("Unsupported file type. Use PDF, DOC/DOCX, XLS/XLSX, CSV, JPG/JPEG, PNG, TIFF/TIF, EML, MSG, or scanned PDF/images.");
    }

    const oversized = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      nextErrors.push(`Each file must be ${MAX_FILE_SIZE_MB} MB or smaller. ${oversized[0].name} exceeds the limit.`);
    }

    return nextErrors;
  }

  function applySelectedFiles(files: File[]) {
    const nextErrors = validateFiles(files);
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function openLetterHeadPicker() {
    letterHeadInputRef.current?.click();
  }

  function handleBrowse(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    applySelectedFiles(files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    applySelectedFiles(files);
  }

  async function handleLetterHeadUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (letterHeadInputRef.current) {
      letterHeadInputRef.current.value = "";
    }

    if (!file) {
      return;
    }

    if (!isAuthenticated || !user) {
      setLetterHeadError("Please log in to upload a letter head.");
      return;
    }

    if (!isAllowedLetterHeadType(file)) {
      setLetterHeadError("Letter Head must be a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLetterHeadError(`Letter Head must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
      return;
    }

    setIsSavingLetterHead(true);
    try {
      const fileData = await readFileAsDataUri(file);
      const saved = await saveLetterHead({
        fileName: file.name,
        fileData
      });
      setLetterHead(saved);
      setLetterHeadError(null);
    } catch (error) {
      setLetterHeadError(error instanceof Error ? error.message : "Letter Head could not be uploaded. Please try again.");
    } finally {
      setIsSavingLetterHead(false);
    }
  }

  async function handleUpload() {
    if (!isAuthenticated || !user) {
      setErrors(["Please log in to upload documents."]);
      return;
    }

    if (selectedFiles.length === 0) {
      setErrors(["Please select at least one file to upload."]);
      return;
    }

    setIsUploading(true);
    setErrors([]);

    const successfulRecords: UploadRecord[] = [];
    const failedRecords: UploadRecord[] = [];

    for (const file of selectedFiles) {
      const progressKey = `${file.name}-${file.size}-${file.lastModified}`;
      setUploadProgress((previous) => ({ ...previous, [progressKey]: 0 }));

      await new Promise((resolve) => setTimeout(resolve, 150));

      for (let progress = 10; progress <= 100; progress += 20) {
        setUploadProgress((previous) => ({ ...previous, [progressKey]: progress }));
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      try {
        const fileData = await readFileAsDataUri(file);
        successfulRecords.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: getFileLabel(file),
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.name || user.email,
          status: "Uploaded",
          fileData
        });
      } catch {
        failedRecords.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: getFileLabel(file),
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.name || user.email,
          status: "Failed",
          error: "Upload failed. Please try again."
        });
      }
    }

    setUploadHistory((current) => [...successfulRecords, ...failedRecords, ...current]);
    setSelectedFiles([]);
    setUploadProgress({});
    setIsUploading(false);

    if (failedRecords.length > 0) {
      setErrors([`${failedRecords.length} file(s) failed to upload.`]);
    }
  }

  function handleView(record: UploadRecord) {
    if (!record.fileData) {
      setErrors([`The file ${record.fileName} is not available to preview.`]);
      return;
    }

    const viewWindow = window.open(record.fileData, "_blank", "noopener,noreferrer");
    if (!viewWindow) {
      setErrors(["Pop-up blocking prevented the document preview. Please allow pop-ups and try again."]);
    }
  }

  function handleDownload(record: UploadRecord) {
    if (!record.fileData) {
      setErrors([`The file ${record.fileName} is not available to download.`]);
      return;
    }

    const blob = dataUriToBlob(record.fileData);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDelete(recordId: string) {
    if (!canDelete) {
      setErrors(["You do not have permission to delete uploaded documents."]);
      return;
    }

    setUploadHistory((current) => current.filter((record) => record.id !== recordId));
  }

  function handleLetterHeadPreview() {
    if (!letterHead) {
      return;
    }

    const previewWindow = window.open(letterHead.fileData, "_blank", "noopener,noreferrer");
    if (!previewWindow) {
      setLetterHeadError("Pop-up blocking prevented the Letter Head preview. Please allow pop-ups and try again.");
    }
  }

  async function handleRemoveLetterHead() {
    if (!canDelete) {
      setLetterHeadError("You do not have permission to remove the Letter Head.");
      return;
    }

    setIsSavingLetterHead(true);
    try {
      await deleteLetterHead();
      setLetterHead(null);
      setLetterHeadError(null);
    } catch (error) {
      setLetterHeadError(error instanceof Error ? error.message : "Letter Head could not be removed.");
    } finally {
      setIsSavingLetterHead(false);
    }
  }

  async function handlePrint(record: UploadRecord) {
    if (!record.fileData) {
      setErrors([`The file ${record.fileName} is not available to print.`]);
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setErrors(["Pop-up blocking prevented printing. Please allow pop-ups and try again."]);
      return;
    }

    try {
      const pdf = await createLetterHeadPrint({
        fileName: record.fileName,
        fileData: record.fileData,
        includeLetterHead: Boolean(useLetterHeadForPrint[record.id] && letterHead)
      });
      const url = URL.createObjectURL(pdf);
      printWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      printWindow.close();
      setErrors([error instanceof Error ? error.message : "The printable PDF could not be prepared."]);
    }
  }

  return (
    <div className="space-y-6">
      <RepositoryWorkspace isAuthenticated={isAuthenticated} role={user?.role} />

      <Panel className="border-slateblue-100 bg-gradient-to-br from-white via-white to-slateblue-50/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slateblue-600">Print identity</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Letter Head</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Manage the company letterhead separately from normal uploaded documents.</p>
          </div>
          <button
            className="w-fit rounded-full border border-slateblue-200 bg-slateblue-50 px-5 py-3 text-sm font-semibold text-slateblue-700 transition hover:border-slateblue-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isAuthenticated || isSavingLetterHead}
            onClick={openLetterHeadPicker}
            type="button"
          >
            Letter Head
          </button>
          <input
            ref={letterHeadInputRef}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(event) => void handleLetterHeadUpload(event)}
            type="file"
          />
        </div>

        {letterHeadError ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{letterHeadError}</div> : null}

        {isLetterHeadLoading ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">Loading Letter Head...</div>
        ) : letterHead ? (
          <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-slateblue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
            <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:w-44">
              {letterHead.fileType.startsWith("image/") ? <img alt="Letter Head thumbnail" className="h-full w-full object-contain" src={letterHead.fileData} /> : <span className="text-sm font-semibold text-slate-500">PDF Letter Head</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{letterHead.fileName}</p>
              <p className="mt-1 text-sm text-slate-500">Uploaded {formatDateTime(letterHead.uploadedAt)}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{formatFileSize(letterHead.fileSize)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slateblue-200 hover:bg-slateblue-50" onClick={handleLetterHeadPreview} type="button">Preview Letter Head</button>
                <button className="rounded-full border border-slateblue-200 bg-slateblue-50 px-3 py-1.5 text-xs font-semibold text-slateblue-700 disabled:opacity-60" disabled={!isAuthenticated || isSavingLetterHead} onClick={openLetterHeadPicker} type="button">Replace Letter Head</button>
                {canDelete ? <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60" disabled={isSavingLetterHead} onClick={() => void handleRemoveLetterHead()} type="button">Remove Letter Head</button> : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slateblue-200 bg-white/80 px-4 py-5 text-sm leading-6 text-slate-500">No letter head uploaded. Upload a PDF, PNG, JPG, or JPEG to make it available for printable documents.</div>
        )}
      </Panel>

    </div>
  );
}
