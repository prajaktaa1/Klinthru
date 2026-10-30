const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { delimiter, resolve } = require("node:path");

process.env.DATABASE_URL = "";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-document-repository-test-secret";

let engine;
for (const entry of process.env.PATH.split(delimiter)) {
  try { engine = require(resolve(entry, "../@electric-sql/pglite")); break; } catch {}
}
if (!engine) throw new Error("Run this isolated check with temporary @electric-sql/pglite tooling.");

function makePrisma(state) {
  const targetsFor = (doc) => state.links.filter((link) => link.documentId === doc.documentId).map((link) => ({
    ...link,
    pipeline: state.pipelines.find((target) => target.id === link.pipelineId) ?? null,
    segment: state.segments.find((target) => target.id === link.segmentId) ?? null,
    asset: state.assets.find((target) => target.id === link.assetId) ?? null
  }));
  const versionsFor = (doc) => state.versions.filter((version) => version.documentId === doc.documentId).sort((a, b) => b.uploadedAt - a.uploadedAt);
  const matches = (doc, where = {}) => {
    if (where.AND && !where.AND.every((part) => matches(doc, part))) return false;
    if (where.OR && !where.OR.some((part) => matches(doc, part))) return false;
    if (where.documentId && where.documentId !== doc.documentId) return false;
    if (typeof where.ownerId === "string" && where.ownerId !== doc.ownerId) return false;
    if (where.ownerId?.contains && !doc.ownerId.toLowerCase().includes(where.ownerId.contains.toLowerCase())) return false;
    if (where.owner?.name?.contains && !doc.ownerName?.toLowerCase().includes(where.owner.name.contains.toLowerCase())) return false;
    if (where.documentType?.contains && !doc.documentType.toLowerCase().includes(where.documentType.contains.toLowerCase())) return false;
    if (where.documentNumber && where.documentNumber !== doc.documentNumber) return false;
    if (where.title?.contains && !doc.title.toLowerCase().includes(where.title.contains.toLowerCase())) return false;
    if (where.category?.contains && !doc.category.toLowerCase().includes(where.category.contains.toLowerCase())) return false;
    if (where.links?.some) {
      const links = targetsFor(doc);
      const filter = where.links.some;
      const has = links.some((link) => {
        if (filter.pipeline?.createdById) return link.pipeline?.createdById === filter.pipeline.createdById;
        if (filter.segment?.pipeline?.createdById) return link.segment && state.pipelines.find((p) => p.id === link.segment.pipelineId)?.createdById === filter.segment.pipeline.createdById;
        if (filter.asset?.pipeline?.createdById) return link.asset && state.pipelines.find((p) => p.id === link.asset.pipelineId)?.createdById === filter.asset.pipeline.createdById;
        if (filter.pipelineId) return link.pipelineId === filter.pipelineId;
        if (filter.segmentId) return link.segmentId === filter.segmentId;
        if (filter.assetId) return link.assetId === filter.assetId;
        if (filter.OR) return filter.OR.some((condition) => condition.pipelineId ? link.pipelineId === condition.pipelineId : condition.segment ? link.segment && link.segment.pipelineId === condition.segment.pipelineId : link.asset && link.asset.pipelineId === condition.asset.pipelineId);
        return false;
      });
      if (!has) return false;
    }
    if (where.links?.none && targetsFor(doc).length) return false;
    if (where.versions?.some) {
      const filter = where.versions.some;
      if (!versionsFor(doc).some((version) => Object.entries(filter).every(([key, value]) => {
        if (key === "revision" && value?.contains) return version.revision?.toLowerCase().includes(value.contains.toLowerCase());
        if (key === "issueDate" && value?.gte && new Date(version.issueDate) < value.gte) return false;
        if (key === "issueDate" && value?.lte && new Date(version.issueDate) > value.lte) return false;
        if (key === "issueDate") return Boolean(version.issueDate);
        return version[key] === value;
      }))) return false;
    }
    return true;
  };
  const hydrate = (doc, include = {}) => ({
    ...doc,
    ...(include.owner ? { owner: { id: doc.ownerId, name: doc.ownerName ?? "Test Owner" } } : {}),
    ...(include.versions ? { versions: versionsFor(doc).map(({ fileContent: _content, ...version }) => version) } : {}),
    ...(include.links ? { links: targetsFor(doc) } : {})
  });
  const client = {
    $transaction: (callback) => callback(client),
    documentFamily: { create: async ({ data }) => { const item = { ...data, documentFamilyId: `family-${state.families.length + 1}`, createdAt: new Date() }; state.families.push(item); return item; } },
    managedDocument: {
      create: async ({ data }) => { const item = { ...data, ownerName: "Test Owner", documentId: `document-${state.documents.length + 1}`, createdAt: new Date(), updatedAt: new Date() }; state.documents.push(item); return item; },
      findUnique: async ({ where }) => state.documents.find((doc) => doc.documentId === where.documentId) ?? null,
      findFirst: async ({ where, include }) => { const doc = state.documents.find((item) => matches(item, where)); return doc ? hydrate(doc, include) : null; },
      findMany: async ({ where, skip = 0, take = 100, include }) => state.documents.filter((doc) => matches(doc, where)).sort((a, b) => b.updatedAt - a.updatedAt).slice(skip, skip + take).map((doc) => hydrate(doc, include)),
      count: async ({ where }) => state.documents.filter((doc) => matches(doc, where)).length,
      update: async ({ where, data }) => { const doc = state.documents.find((item) => item.documentId === where.documentId); Object.assign(doc, data); return doc; }
    },
    documentVersion: {
      aggregate: async ({ where }) => ({ _sum: { fileSize: state.versions.filter((version) => matches(state.documents.find((doc) => doc.documentId === version.documentId), where.document)).reduce((sum, version) => sum + version.fileSize, 0) } }),
      create: async ({ data }) => { const item = { ...data, documentVersionId: `version-${state.versions.length + 1}`, uploadedAt: new Date() }; state.versions.push(item); return item; },
      findUnique: async ({ where }) => state.versions.find((version) => where.fileHash ? version.fileHash === where.fileHash : version.documentVersionId === where.documentVersionId) ?? null,
      findFirst: async ({ where }) => state.versions.find((version) => Object.entries(where).every(([key, value]) => version[key] === value)) ?? null,
      findMany: async ({ where }) => versionsFor(state.documents.find((doc) => doc.documentId === where.documentId) || { documentId: "" })
    },
    documentLink: {
      create: async ({ data }) => { const item = { ...data, documentLinkId: `link-${state.links.length + 1}`, createdAt: new Date() }; state.links.push(item); return item; },
      findFirst: async ({ where }) => state.links.find((link) => Object.entries(where).every(([key, value]) => link[key] === value)) ?? null
    },
    pipeline: {
      findUnique: async ({ where }) => state.pipelines.find((item) => item.id === where.id) ?? null,
      findMany: async ({ where = {} }) => state.pipelines.filter((item) => !where.createdById || item.createdById === where.createdById)
    },
    segment: {
      findUnique: async ({ where, include }) => { const item = state.segments.find((target) => target.id === where.id); return item ? { ...item, ...(include?.pipeline ? { pipeline: { createdById: state.pipelines.find((p) => p.id === item.pipelineId)?.createdById } } : {}) } : null; },
      findMany: async ({ where = {} }) => state.segments.filter((item) => !where.pipeline || state.pipelines.find((p) => p.id === item.pipelineId)?.createdById === where.pipeline.createdById)
    },
    asset: {
      findUnique: async ({ where, include }) => { const item = state.assets.find((target) => target.id === where.id); return item ? { ...item, ...(include?.pipeline ? { pipeline: { createdById: state.pipelines.find((p) => p.id === item.pipelineId)?.createdById } } : {}) } : null; },
      findMany: async ({ where = {} }) => state.assets.filter((item) => !where.pipeline || state.pipelines.find((p) => p.id === item.pipelineId)?.createdById === where.pipeline.createdById)
    }
  };
  return client;
}

async function main() {
  const db = new engine.PGlite();
  await db.exec(`CREATE TABLE "User" (id TEXT PRIMARY KEY);
    CREATE TABLE "Pipeline" (id TEXT PRIMARY KEY);
    CREATE TABLE "Segment" (id TEXT PRIMARY KEY);
    CREATE TABLE "Asset" (id TEXT PRIMARY KEY);`);
  const migration = readFileSync(resolve(__dirname, "../../prisma/migrations/20261013120000_add_document_repository_phase_1a/migration.sql"), "utf8");
  await db.exec(migration);
  await db.exec(`INSERT INTO "User" (id) VALUES ('test-admin');
    INSERT INTO "Pipeline" (id) VALUES ('test-pipeline');
    INSERT INTO "Document_Family" ("Document_Family_ID", "Owner_ID") VALUES ('test-family', 'test-admin');
    INSERT INTO "Managed_Document" ("Document_ID", "Document_Family_ID", "Title", "Document_Type", "Document_Category", "Owner_ID", "Updated_At") VALUES ('test-doc', 'test-family', 'Fixture', 'PDF', 'Test', 'test-admin', CURRENT_TIMESTAMP);
    INSERT INTO "Document_Version" ("Document_Version_ID", "Document_ID", "File_Name", "MIME_Type", "File_Size_Bytes", "File_Hash_SHA256", "File_Content", "Uploaded_By_ID") VALUES ('test-version', 'test-doc', 'fixture.pdf', 'application/pdf', 1, 'unique-test-hash', decode('41','hex'), 'test-admin');
    INSERT INTO "Document_Link" ("Document_Link_ID", "Document_ID", "Pipeline_ID", "Created_By_ID") VALUES ('test-link', 'test-doc', 'test-pipeline', 'test-admin');`);
  const persisted = (await db.query(`SELECT "Approval_Status", "Validity_Review_Status", "Processing_Status" FROM "Document_Version" WHERE "Document_Version_ID"='test-version'`)).rows[0];
  assert.deepEqual(persisted, { Approval_Status: "Draft", Validity_Review_Status: null, Processing_Status: null }, "new versions default to Draft while unknown validity/processing remain null");
  await assert.rejects(() => db.query(`INSERT INTO "Document_Link" ("Document_Link_ID", "Document_ID", "Pipeline_ID", "Asset_ID", "Created_By_ID") VALUES ('bad-link', 'test-doc', 'test-pipeline', 'missing-asset', 'test-admin')`), (error) => error.code === "23514");
  await assert.rejects(() => db.query(`INSERT INTO "Document_Version" ("Document_Version_ID", "Document_ID", "File_Name", "MIME_Type", "File_Size_Bytes", "File_Hash_SHA256", "File_Content", "Uploaded_By_ID") VALUES ('duplicate-version', 'test-doc', 'dup.pdf', 'application/pdf', 1, 'unique-test-hash', decode('42','hex'), 'test-admin')`), (error) => error.code === "23505");

  const state = { families: [], documents: [], versions: [], links: [], pipelines: [{ id: "pipe-admin", pipelineCode: "P-1", pipelineName: "Fixture Pipeline", createdById: "test-admin" }, { id: "pipe-admin-2", pipelineCode: "P-2", pipelineName: "Second Admin Pipeline", createdById: "test-admin" }, { id: "pipe-engineer", pipelineCode: "E-1", pipelineName: "Engineer Pipeline", createdById: "test-engineer" }, { id: "pipe-engineer-2", pipelineCode: "E-2", pipelineName: "Second Engineer Pipeline", createdById: "test-engineer" }], segments: [], assets: [] };
  const users = {
    "test-admin": { id: "test-admin", name: "Test Admin", email: "admin@test.invalid", role: "Admin", passwordHash: "", createdAt: new Date().toISOString() },
    "test-engineer": { id: "test-engineer", name: "Test Engineer", email: "engineer@test.invalid", role: "Engineer", passwordHash: "", createdAt: new Date().toISOString() },
    "test-viewer": { id: "test-viewer", name: "Test Viewer", email: "viewer@test.invalid", role: "Viewer", passwordHash: "", createdAt: new Date().toISOString() }
  };
  const prisma = require("../../dist/lib/prisma");
  prisma.getPrismaClient = () => makePrisma(state);
  const { store } = require("../../dist/data/store");
  store.findUserById = async (id) => users[id] ?? null;
  const { createApp } = require("../../dist/app");
  const { signToken } = require("../../dist/lib/jwt");
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, userId, method = "GET", body) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(userId ? { Authorization: `Bearer ${signToken({ sub: userId, email: users[userId].email, role: users[userId].role })}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    const payload = { title: "Fixture Drawing", documentType: "Drawing", category: "Test", documentNumber: "D-01", revision: "A", issueDate: "2024-01-02", pipelineId: "pipe-admin", fileName: "fixture.pdf", mimeType: "application/pdf", fileData: "data:application/pdf;base64,QQ==" };
    assert.equal((await call("/api/documents", null, "POST", payload)).status, 401);
    assert.equal((await call("/api/documents", "test-viewer", "POST", payload)).status, 403);
    const createdResponse = await call("/api/documents", "test-admin", "POST", payload);
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).item;
    assert.equal(created.versions[0].approvalStatus, "Draft");
    assert.equal(created.versions[0].validityStatus, null);
    assert.equal(created.versions[0].processingStatus, null);
    assert.equal(new Date(created.versions[0].issueDate).toISOString().slice(0, 10), "2024-01-02");
    assert.equal((await call(`/api/documents/${created.documentId}/links`, "test-admin", "POST", { pipelineId: "pipe-admin-2" })).status, 201, "Admin can link an existing repository document to a verified target");
    assert.equal((await call(`/api/documents/${created.documentId}/links`, "test-viewer", "POST", { pipelineId: "pipe-admin-2" })).status, 403, "Viewer cannot link documents");
    const engineerDocument = await call("/api/documents", "test-engineer", "POST", { ...payload, documentNumber: "D-02", pipelineId: "pipe-engineer", fileData: "data:application/pdf;base64,Qw==" });
    assert.equal(engineerDocument.status, 201);
    const engineerDocumentId = (await engineerDocument.json()).item.documentId;
    assert.equal((await call(`/api/documents/${engineerDocumentId}/links`, "test-engineer", "POST", { pipelineId: "pipe-engineer-2" })).status, 201, "Engineer can link an owned document to an authorized target");
    assert.equal((await call("/api/documents", "test-viewer", "POST", payload)).status, 403);
    const duplicate = await call("/api/documents", "test-admin", "POST", payload);
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).fields.existingDocumentId, created.documentId);
    assert.equal((await call("/api/documents", "test-engineer", "GET")).status, 200);
    assert.equal((await call(`/api/documents/${created.documentId}`, "test-engineer")).status, 404);
    const revisionResponse = await call(`/api/documents/${created.documentId}/versions`, "test-admin", "POST", { revision: "B", fileName: "fixture-b.pdf", mimeType: "application/pdf", fileData: "data:application/pdf;base64,Qg==" });
    assert.equal(revisionResponse.status, 201);
    const history = await (await call(`/api/documents/${created.documentId}/versions`, "test-admin")).json();
    assert.equal(history.items.length, 2);
    const oldDownload = await call(`/api/documents/${created.documentId}/versions/${created.versions[0].documentVersionId}/download`, "test-admin");
    assert.equal(oldDownload.status, 200);
    assert.equal(Buffer.from(await oldDownload.arrayBuffer()).toString(), "A", "older immutable binary remains unchanged");
    const listed = await (await call("/api/documents", "test-admin")).json();
    assert.equal(listed.items[0].documentId, created.documentId);
    assert.equal(listed.total, 2);
    const filtered = await (await call("/api/documents?documentType=Draw&category=Test&pipelineId=pipe-admin&revision=A&owner=Test%20Owner&issueDateFrom=2024-01-01&issueDateTo=2024-01-31", "test-admin")).json();
    assert.equal(filtered.total, 1, "document filters bind to persisted type/category/link/revision/owner/issue-date fields");
    const summary = await (await call("/api/documents/overview", "test-admin")).json();
    assert.equal(summary.totalDocuments, 2);
    assert.equal(summary.totalStorageBytes, 3, "storage includes immutable historical versions");
    assert.equal(summary.approved, null, "status KPIs stay unavailable without an agreed current-revision rule");
    console.log("PASS: isolated migration DDL, status defaults, target check, hash uniqueness, auth/roles, upload dates, duplicate detection, immutable revisions, history, filters, summary, list, and download.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
