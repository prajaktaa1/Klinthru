import { createHash } from "node:crypto";
import express, { Router } from "express";

import { DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_PAGE_SIZE = 100;
const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "jpg", "jpeg", "png", "tif", "tiff", "eml", "msg"]);
const approvalStatuses = new Set(["Draft", "Submitted", "Under Review", "Approved", "Approved with Comments", "Rejected", "Superseded", "Archived"]);
const validityStatuses = new Set(["Current", "Review Due", "Expiring Soon", "Expired", "No Expiry"]);
const approvalEnum: Record<string, string> = { "Under Review": "UnderReview", "Approved with Comments": "ApprovedWithComments" };
const validityEnum: Record<string, string> = { "Review Due": "ReviewDue", "Expiring Soon": "ExpiringSoon", "No Expiry": "NoExpiry" };
const mimeByExtension: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", tif: "image/tiff", tiff: "image/tiff", eml: "message/rfc822", msg: "application/vnd.ms-outlook" };

export const documentsRouter = Router();
documentsRouter.use(requireAuth);
documentsRouter.use(express.json({ limit: "35mb" }));

function database() {
  const prisma = getPrismaClient();
  if (!prisma) throw new DatabaseUnavailableError();
  return prisma;
}

function canWrite(user: Express.Request["user"]) {
  return user?.role === "Admin" || user?.role === "Engineer";
}

function statusCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
}

function parseOptionalDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Document dates must use YYYY-MM-DD.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Document date is invalid.");
  return parsed;
}

function parseUpload(dataUri: unknown, fileName: unknown, mimeType: unknown) {
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255) throw new Error("A valid file name is required.");
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) throw new Error("Unsupported document file type.");
  if (typeof dataUri !== "string") throw new Error("File data is required.");
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
  if (!match || (typeof mimeType === "string" && match[1] !== mimeType)) throw new Error("File data or MIME type is invalid.");
  if (match[1] !== "application/octet-stream" && match[1] !== mimeByExtension[extension]) throw new Error("File MIME type does not match its extension.");
  const content = Buffer.from(match[2], "base64");
  if (!content.length || content.length > MAX_FILE_SIZE_BYTES) throw new Error("File must be between 1 byte and 25 MiB.");
  if (content.toString("base64").replace(/=+$/, "") !== match[2].replace(/=+$/, "")) throw new Error("File data is not valid base64.");
  return { fileName: fileName.trim(), mimeType: mimeByExtension[extension], content, fileHash: createHash("sha256").update(content).digest("hex") };
}

function safeDocument(document: any) {
  return {
    ...document,
    versions: document.versions?.map(safeVersion),
    links: document.links?.map((link: any) => ({
      documentLinkId: link.documentLinkId,
      documentVersionId: link.documentVersionId,
      pipeline: link.pipeline ? { id: link.pipeline.id, pipelineCode: link.pipeline.pipelineCode, pipelineName: link.pipeline.pipelineName } : null,
      segment: link.segment ? { id: link.segment.id, segmentId: link.segment.segmentId, name: link.segment.name } : null,
      asset: link.asset ? { id: link.asset.id, assetId: link.asset.assetId, name: link.asset.name } : null
    }))
  };
}

function safeVersion(version: any) {
  const { fileContent: _fileContent, ...metadata } = version;
  return {
    ...metadata,
    approvalStatus: ({ UnderReview: "Under Review", ApprovedWithComments: "Approved with Comments" } as Record<string, string>)[metadata.approvalStatus] ?? metadata.approvalStatus,
    validityStatus: ({ ReviewDue: "Review Due", ExpiringSoon: "Expiring Soon", NoExpiry: "No Expiry" } as Record<string, string>)[metadata.validityStatus] ?? metadata.validityStatus
  };
}

function documentReadScope(user: NonNullable<Express.Request["user"]>) {
  if (user.role === "Admin") return {};
  return {
    OR: [
      { ownerId: user.id },
      { links: { some: { pipeline: { createdById: user.id } } } },
      { links: { some: { segment: { pipeline: { createdById: user.id } } } } },
      { links: { some: { asset: { pipeline: { createdById: user.id } } } } }
    ]
  };
}

export async function getReadableDocument(documentId: string, user: NonNullable<Express.Request["user"]>) {
  return database().managedDocument.findFirst({
    where: { documentId, ...documentReadScope(user) },
    include: { owner: { select: { id: true, name: true } }, versions: { orderBy: { uploadedAt: "desc" }, select: { documentVersionId: true, revision: true, fileName: true, mimeType: true, fileSize: true, fileHash: true, approvalStatus: true, validityStatus: true, processingStatus: true, uploadedById: true, uploadedAt: true, issueDate: true, reviewDueDate: true, expiryDate: true } }, links: { include: { pipeline: true, segment: true, asset: true } } }
  });
}

async function verifiedLinks(input: any, user: NonNullable<Express.Request["user"]>) {
  const prisma = database();
  const links: Array<Record<string, string>> = [];
  const parentPipelineIds = new Set<string>();
  let selectedSegmentId: string | undefined;
  let selectedAssetSegmentId: string | null | undefined;
  const canUseOwner = (ownerId: string | null) => user.role === "Admin" || ownerId === user.id;
  if (input.pipelineId) {
    const target = await prisma.pipeline.findUnique({ where: { id: input.pipelineId } });
    if (!target || !canUseOwner(target.createdById)) throw new Error("Pipeline is unavailable or not authorized.");
    parentPipelineIds.add(target.id);
    links.push({ pipelineId: target.id });
  }
  if (input.segmentId) {
    const target = await prisma.segment.findUnique({ where: { id: input.segmentId }, include: { pipeline: { select: { createdById: true } } } });
    if (!target || !canUseOwner(target.pipeline.createdById)) throw new Error("Segment is unavailable or not authorized.");
    parentPipelineIds.add(target.pipelineId);
    selectedSegmentId = target.id;
    links.push({ segmentId: target.id });
  }
  if (input.assetId) {
    const target = await prisma.asset.findUnique({ where: { id: input.assetId }, include: { pipeline: { select: { createdById: true } } } });
    if (!target || !canUseOwner(target.pipeline.createdById)) throw new Error("Asset is unavailable or not authorized.");
    parentPipelineIds.add(target.pipelineId);
    selectedAssetSegmentId = target.segmentId;
    links.push({ assetId: target.id });
  }
  if (parentPipelineIds.size > 1 || (selectedSegmentId && selectedAssetSegmentId && selectedAssetSegmentId !== selectedSegmentId)) throw new Error("Selected targets must belong to the same Pipeline and matching Segment.");
  return { links, pipelineId: [...parentPipelineIds][0] };
}

async function duplicateMatch(fileHash: string, user: NonNullable<Express.Request["user"]>, documentNumber?: string, revision?: string, pipelineId?: string) {
  const prisma = database();
  const byHash = await prisma.documentVersion.findUnique({ where: { fileHash }, select: { documentId: true, documentVersionId: true } });
  if (byHash) {
    const visible = await prisma.managedDocument.findFirst({ where: { documentId: byHash.documentId, ...documentReadScope(user) }, select: { documentId: true } });
    if (visible) return byHash;
    return { hidden: true as const };
  }
  if (documentNumber && revision && pipelineId) {
    const byIdentity = await prisma.managedDocument.findFirst({
      where: { ...documentReadScope(user), documentNumber, links: { some: { OR: [{ pipelineId }, { segment: { pipelineId } }, { asset: { pipelineId } }] } }, versions: { some: { revision } } },
      select: { documentId: true, versions: { where: { revision }, select: { documentVersionId: true }, take: 1 } }
    });
    if (byIdentity) return { documentId: byIdentity.documentId, documentVersionId: byIdentity.versions[0]?.documentVersionId ?? null };
  }
  return null;
}

function replyError(response: express.Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Document request failed.";
  const code = statusCode(error);
  if (code === "P2002") {
    response.status(409).json({ code: "DUPLICATE_DOCUMENT", message: "A document with this file content or revision identity already exists." });
  } else if (message.includes("not authorized") || message.includes("unauthorized")) {
    response.status(403).json({ message });
  } else if (message.includes("unavailable")) {
    response.status(404).json({ message });
  } else {
    response.status(400).json({ message });
  }
}

documentsRouter.get("/targets", async (request, response, next) => {
  try {
    const prisma = database();
    const scope = request.user!.role === "Admin" ? {} : { createdById: request.user!.id };
    const [pipelines, segments, assets] = await Promise.all([
      prisma.pipeline.findMany({ where: scope, select: { id: true, pipelineCode: true, pipelineName: true }, orderBy: { pipelineName: "asc" } }),
      prisma.segment.findMany({ where: request.user!.role === "Admin" ? {} : { pipeline: { createdById: request.user!.id } }, select: { id: true, segmentId: true, name: true, pipelineId: true }, orderBy: { segmentId: "asc" } }),
      prisma.asset.findMany({ where: request.user!.role === "Admin" ? {} : { pipeline: { createdById: request.user!.id } }, select: { id: true, assetId: true, name: true, pipelineId: true, segmentId: true }, orderBy: { assetId: "asc" } })
    ]);
    response.json({ pipelines, segments, assets });
  } catch (error) { next(error); }
});

documentsRouter.get("/overview", async (request, response, next) => {
  try {
    const prisma = database();
    const access = documentReadScope(request.user!);
    const [totalDocuments, unlinkedDocuments, storage] = await Promise.all([
      prisma.managedDocument.count({ where: access }),
      prisma.managedDocument.count({ where: { AND: [access, { isGlobal: false, links: { none: {} } }] } }),
      request.user!.role === "Admin"
        ? prisma.documentVersion.aggregate({ where: { document: access }, _sum: { fileSize: true } })
        : Promise.resolve(null)
    ]);
    response.json({
      totalDocuments,
      unlinkedDocuments,
      totalStorageBytes: storage?._sum.fileSize ?? null,
      approved: null,
      underReview: null,
      expired: null,
      expiringSoon: null
    });
  } catch (error) { next(error); }
});

documentsRouter.get("/", async (request, response, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(request.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(String(request.query.pageSize ?? "25"), 10) || 25));
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const approvalStatus = typeof request.query.approvalStatus === "string" && approvalStatuses.has(request.query.approvalStatus) ? request.query.approvalStatus : undefined;
    const validityStatus = typeof request.query.validityStatus === "string" && validityStatuses.has(request.query.validityStatus) ? request.query.validityStatus : undefined;
    const documentType = typeof request.query.documentType === "string" ? request.query.documentType.trim() : "";
    const category = typeof request.query.category === "string" ? request.query.category.trim() : "";
    const pipelineId = typeof request.query.pipelineId === "string" ? request.query.pipelineId : "";
    const segmentId = typeof request.query.segmentId === "string" ? request.query.segmentId : "";
    const assetId = typeof request.query.assetId === "string" ? request.query.assetId : "";
    const revision = typeof request.query.revision === "string" ? request.query.revision.trim() : "";
    const owner = typeof request.query.owner === "string" ? request.query.owner.trim() : "";
    const issueDateFrom = typeof request.query.issueDateFrom === "string" ? new Date(request.query.issueDateFrom) : null;
    const issueDateTo = typeof request.query.issueDateTo === "string" ? new Date(request.query.issueDateTo) : null;
    const whereParts: Record<string, unknown>[] = [];
    const access = documentReadScope(request.user!);
    if (Object.keys(access).length) whereParts.push(access);
    if (q) whereParts.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { documentNumber: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] });
    if (documentType) whereParts.push({ documentType: { contains: documentType, mode: "insensitive" } });
    if (category) whereParts.push({ category: { contains: category, mode: "insensitive" } });
    if (owner) whereParts.push({ OR: [{ ownerId: { contains: owner, mode: "insensitive" } }, { owner: { name: { contains: owner, mode: "insensitive" } } }] });
    if (pipelineId) whereParts.push({ links: { some: { OR: [{ pipelineId }, { segment: { pipelineId } }, { asset: { pipelineId } }] } } });
    if (segmentId) whereParts.push({ links: { some: { segmentId } } });
    if (assetId) whereParts.push({ links: { some: { assetId } } });
    if (revision) whereParts.push({ versions: { some: { revision: { contains: revision, mode: "insensitive" } } } });
    if ((issueDateFrom && !Number.isNaN(issueDateFrom.getTime())) || (issueDateTo && !Number.isNaN(issueDateTo.getTime()))) {
      const issueDate: Record<string, Date> = {};
      if (issueDateFrom && !Number.isNaN(issueDateFrom.getTime())) issueDate.gte = issueDateFrom;
      if (issueDateTo && !Number.isNaN(issueDateTo.getTime())) issueDate.lte = new Date(`${request.query.issueDateTo}T23:59:59.999Z`);
      whereParts.push({ versions: { some: { issueDate } } });
    }
    if (approvalStatus || validityStatus) whereParts.push({ versions: { some: { ...(approvalStatus ? { approvalStatus: approvalEnum[approvalStatus] ?? approvalStatus } : {}), ...(validityStatus ? { validityStatus: validityEnum[validityStatus] ?? validityStatus } : {}) } } });
    const where = whereParts.length ? { AND: whereParts } : {};
    const [rows, total] = await Promise.all([
      database().managedDocument.findMany({ where, include: { owner: { select: { id: true, name: true } }, versions: { orderBy: { uploadedAt: "desc" }, select: { documentVersionId: true, revision: true, fileName: true, mimeType: true, fileSize: true, approvalStatus: true, validityStatus: true, processingStatus: true, uploadedById: true, uploadedAt: true, issueDate: true, reviewDueDate: true, expiryDate: true } }, links: { include: { pipeline: true, segment: true, asset: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      database().managedDocument.count({ where })
    ]);
    response.json({ items: rows.map(safeDocument), page, pageSize, total });
  } catch (error) { next(error); }
});

documentsRouter.post("/", async (request, response, next) => {
  try {
    if (!canWrite(request.user)) { response.status(403).json({ message: "Only Admin and Engineer roles may upload or revise documents." }); return; }
    const { title, documentType, category, documentNumber, revision, description, isGlobal, issueDate, reviewDueDate, expiryDate } = request.body ?? {};
    if (typeof title !== "string" || !title.trim() || title.length > 255 || typeof documentType !== "string" || !documentType.trim() || typeof category !== "string" || !category.trim()) throw new Error("Title, document type, and category are required.");
    if (documentNumber != null && (typeof documentNumber !== "string" || documentNumber.length > 255)) throw new Error("Document number is invalid.");
    if (revision != null && (typeof revision !== "string" || revision.length > 80)) throw new Error("Revision is invalid.");
    const file = parseUpload(request.body?.fileData, request.body?.fileName, request.body?.mimeType);
    const verified = await verifiedLinks(request.body, request.user!);
    const links = verified.links;
    if (isGlobal === true && links.length) throw new Error("Global documents cannot also have linked targets.");
    if (isGlobal !== true && !links.length) throw new Error("Select a verified Pipeline, Segment, or Asset, or mark the document as Global.");
    const normalizedDocumentNumber = typeof documentNumber === "string" ? documentNumber.trim() : undefined;
    const normalizedRevision = typeof revision === "string" ? revision.trim() : undefined;
    const duplicate = await duplicateMatch(file.fileHash, request.user!, normalizedDocumentNumber, normalizedRevision, verified.pipelineId);
    if (duplicate) { response.status(409).json({ code: "DUPLICATE_DOCUMENT", message: "This document matches an existing file or revision identity.", ...(duplicate.hidden ? {} : { fields: { existingDocumentId: duplicate.documentId, existingDocumentVersionId: duplicate.documentVersionId } }) }); return; }
    const result = await database().$transaction(async (tx: any) => {
      const now = new Date();
      const family = await tx.documentFamily.create({ data: { ownerId: request.user!.id } });
      const document = await tx.managedDocument.create({ data: { documentFamilyId: family.documentFamilyId, documentNumber: normalizedDocumentNumber || null, title: title.trim(), documentType: documentType.trim(), category: category.trim(), description: typeof description === "string" ? description.trim() || null : null, isGlobal: isGlobal === true, ownerId: request.user!.id } });
      const version = await tx.documentVersion.create({ data: { documentId: document.documentId, revision: normalizedRevision || null, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.content.length, fileHash: file.fileHash, fileContent: file.content, approvalStatus: "Draft", validityStatus: null, processingStatus: null, uploadedById: request.user!.id, issueDate: parseOptionalDate(issueDate), reviewDueDate: parseOptionalDate(reviewDueDate), expiryDate: parseOptionalDate(expiryDate) } });
      for (const link of links) await tx.documentLink.create({ data: { documentId: document.documentId, documentVersionId: version.documentVersionId, ...link, createdById: request.user!.id } });
      return { ...document, updatedAt: now, versions: [{ ...version, fileContent: undefined }], links: [] };
    });
    response.status(201).json({ item: safeDocument(result) });
  } catch (error) { if (statusCode(error) === "P2002") response.status(409).json({ code: "DUPLICATE_DOCUMENT", message: "A document with this file content or revision identity already exists." }); else replyError(response, error); }
});

documentsRouter.get("/:documentId/versions", async (request, response, next) => {
  try {
    const document = await getReadableDocument(request.params.documentId, request.user!);
    if (!document) { response.status(404).json({ message: "Document not found." }); return; }
    const versions = await database().documentVersion.findMany({ where: { documentId: request.params.documentId }, select: { documentVersionId: true, revision: true, fileName: true, mimeType: true, fileSize: true, fileHash: true, approvalStatus: true, validityStatus: true, processingStatus: true, uploadedById: true, uploadedAt: true, issueDate: true, reviewDueDate: true, expiryDate: true }, orderBy: { uploadedAt: "desc" } });
    response.json({ items: versions.map(safeVersion) });
  } catch (error) { next(error); }
});

documentsRouter.post("/:documentId/versions", async (request, response, next) => {
  try {
    if (!canWrite(request.user)) { response.status(403).json({ message: "Only Admin and Engineer roles may upload or revise documents." }); return; }
    const document = await getReadableDocument(request.params.documentId, request.user!);
    if (!document || (request.user!.role !== "Admin" && document.ownerId !== request.user!.id)) { response.status(404).json({ message: "Document not found." }); return; }
    const file = parseUpload(request.body?.fileData, request.body?.fileName, request.body?.mimeType);
    const revision = typeof request.body?.revision === "string" ? request.body.revision.trim() : "";
    if (!revision || revision.length > 80) throw new Error("A revision value is required for a new version.");
    const linkedPipelineId = document.links.map((link: any) => link.pipeline?.id ?? link.segment?.pipelineId ?? link.asset?.pipelineId).find(Boolean);
    const duplicate = await duplicateMatch(file.fileHash, request.user!, document.documentNumber, revision, linkedPipelineId);
    if (duplicate) { response.status(409).json({ code: "DUPLICATE_DOCUMENT", message: "This file or revision identity already exists.", ...(duplicate.hidden ? {} : { fields: { existingDocumentId: duplicate.documentId, existingDocumentVersionId: duplicate.documentVersionId } }) }); return; }
    const version = await database().$transaction(async (tx: any) => {
      const created = await tx.documentVersion.create({ data: { documentId: document.documentId, revision, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.content.length, fileHash: file.fileHash, fileContent: file.content, approvalStatus: "Draft", validityStatus: null, processingStatus: null, uploadedById: request.user!.id } });
      await tx.managedDocument.update({ where: { documentId: document.documentId }, data: { updatedAt: new Date() } });
      return created;
    });
    const { fileContent: _fileContent, ...metadata } = version;
    response.status(201).json({ item: metadata });
  } catch (error) { if (statusCode(error) === "P2002") response.status(409).json({ code: "DUPLICATE_DOCUMENT", message: "A document with this file content or revision identity already exists." }); else replyError(response, error); }
});

documentsRouter.post("/:documentId/links", async (request, response, next) => {
  try {
    if (!canWrite(request.user)) { response.status(403).json({ message: "Only Admin and Engineer roles may link documents." }); return; }
    const document = await getReadableDocument(request.params.documentId, request.user!);
    if (!document || (request.user!.role !== "Admin" && document.ownerId !== request.user!.id)) { response.status(404).json({ message: "Document not found." }); return; }
    const { links } = await verifiedLinks(request.body ?? {}, request.user!);
    if (!links.length) throw new Error("At least one verified Pipeline, Segment, or Asset is required.");
    const created = [];
    for (const link of links) {
      const existing = await database().documentLink.findFirst({ where: { documentId: document.documentId, ...link } });
      if (!existing) created.push(await database().documentLink.create({ data: { documentId: document.documentId, ...link, createdById: request.user!.id } }));
    }
    await database().managedDocument.update({ where: { documentId: document.documentId }, data: { isGlobal: false, updatedAt: new Date() } });
    response.status(201).json({ items: created });
  } catch (error) { replyError(response, error); }
});

documentsRouter.get("/:documentId/versions/:documentVersionId/download", async (request, response, next) => {
  try {
    const document = await getReadableDocument(request.params.documentId, request.user!);
    if (!document) { response.status(404).json({ message: "Document not found." }); return; }
    const version = await database().documentVersion.findFirst({ where: { documentVersionId: request.params.documentVersionId, documentId: document.documentId }, select: { fileName: true, mimeType: true, fileSize: true, fileContent: true } });
    if (!version) { response.status(404).json({ message: "Document version not found." }); return; }
    const safeName = version.fileName.replace(/[\r\n"\\]/g, "_");
    response.setHeader("Content-Type", version.mimeType);
    response.setHeader("Content-Length", version.fileSize);
    response.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    response.send(Buffer.from(version.fileContent));
  } catch (error) { next(error); }
});

documentsRouter.get("/:documentId", async (request, response, next) => {
  try {
    const document = await getReadableDocument(request.params.documentId, request.user!);
    if (!document) { response.status(404).json({ message: "Document not found." }); return; }
    response.json({ item: safeDocument(document) });
  } catch (error) { next(error); }
});
