const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const { delimiter, resolve } = require("node:path");
const frontendUrl = process.env.DOCUMENT_TEST_URL || "http://localhost:4031";

let playwright;
for (const entry of process.env.PATH.split(delimiter)) {
  try { playwright = require(resolve(entry, "../playwright")); break; } catch {}
}
if (!playwright) throw new Error("Run with temporary Playwright tooling; no application dependency is required.");

const version = {
  documentVersionId: "version-fixture-a",
  documentId: "document-fixture",
  revision: "A",
  fileName: "fixture.pdf",
  mimeType: "application/pdf",
  fileSize: 1,
  approvalStatus: "Approved",
  validityStatus: null,
  processingStatus: null,
  uploadedAt: "2026-10-13T08:00:00.000Z",
  issueDate: "2026-10-12T00:00:00.000Z",
  reviewDueDate: null,
  expiryDate: null
};
const fixture = {
  documentId: "document-fixture",
  documentFamilyId: "family-fixture",
  documentNumber: "DOC-01",
  title: "Fixture Document",
  documentType: "Drawing",
  category: "Test",
  description: null,
  isGlobal: false,
  ownerId: "test-admin",
  owner: { id: "test-admin", name: "Test Admin" },
  updatedAt: "2026-10-13T08:00:00.000Z",
  versions: [version],
  links: [{ documentLinkId: "link-fixture", documentVersionId: version.documentVersionId, pipeline: { id: "pipeline-fixture", pipelineCode: "P-01", pipelineName: "Fixture Pipeline" }, segment: null, asset: null }]
};
const documents = [fixture];
let browserRole = "Admin";
let releaseSlowList;

async function main() {
  const browser = await playwright.chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem("klinthru-auth-token", "isolated-test-token"));
  await page.route("http://localhost:4002/**", async (route) => {
    const request = route.request();
    const cors = { "Access-Control-Allow-Origin": new URL(frontendUrl).origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ id: `test-${browserRole.toLowerCase()}`, name: `Test ${browserRole}`, email: `${browserRole.toLowerCase()}@test.invalid`, role: browserRole }) });
    if (path === "/api/documents/targets") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ pipelines: [{ id: "pipeline-fixture", pipelineCode: "P-01", pipelineName: "Fixture Pipeline" }, { id: "pipeline-fixture-2", pipelineCode: "P-02", pipelineName: "Second Fixture Pipeline" }], segments: [], assets: [] }) });
    if (path === "/api/documents/overview") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ totalDocuments: documents.length, unlinkedDocuments: 0, totalStorageBytes: 1, approved: null, underReview: null, expired: null, expiringSoon: null }) });
    if (path === "/api/documents" && request.method() === "POST") {
      const input = request.postDataJSON();
      const uploadedVersion = { ...version, documentVersionId: "version-uploaded", documentId: "document-uploaded", revision: input.revision || null, fileName: input.fileName, mimeType: input.mimeType, fileSize: Buffer.from(input.fileData, "base64").length };
      const uploaded = { ...fixture, documentId: "document-uploaded", documentFamilyId: "family-uploaded", documentNumber: input.documentNumber || null, title: input.title, documentType: input.documentType, category: input.category, versions: [uploadedVersion], links: [] };
      documents.push(uploaded);
      return route.fulfill({ status: 201, headers: cors, contentType: "application/json", body: JSON.stringify({ item: uploaded }) });
    }
    if (path === "/api/documents" && request.method() === "GET") {
      const params = new URL(request.url()).searchParams;
      if (params.get("q") === "Slow") await new Promise((resolve) => { releaseSlowList = resolve; });
      if (params.get("q") === "Error") return route.fulfill({ status: 503, headers: cors, contentType: "application/json", body: JSON.stringify({ message: "Fixture service unavailable." }) });
      const matches = documents.filter((item) => (!params.get("documentType") || item.documentType.toLowerCase().includes(params.get("documentType").toLowerCase())) && (!params.get("q") || item.title.toLowerCase().includes(params.get("q").toLowerCase())));
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ items: matches, page: 1, pageSize: 25, total: matches.length }) });
    }
    if (path === "/api/documents/document-fixture/links" && request.method() === "POST") {
      const input = request.postDataJSON();
      const pipeline = [{ id: "pipeline-fixture", pipelineCode: "P-01", pipelineName: "Fixture Pipeline" }, { id: "pipeline-fixture-2", pipelineCode: "P-02", pipelineName: "Second Fixture Pipeline" }].find((item) => item.id === input.pipelineId);
      if (pipeline && !fixture.links.some((link) => link.pipeline?.id === pipeline.id)) fixture.links.push({ documentLinkId: `link-${fixture.links.length + 1}`, documentVersionId: version.documentVersionId, pipeline, segment: null, asset: null });
      return route.fulfill({ status: 201, headers: cors, contentType: "application/json", body: JSON.stringify({ items: fixture.links }) });
    }
    if (path === "/api/documents/document-fixture" && request.method() === "GET") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ item: fixture }) });
    if (path === "/api/documents/document-fixture/versions" && request.method() === "GET") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ items: [version] }) });
    if (path === `/api/documents/document-fixture/versions/${version.documentVersionId}/download`) return route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "application/pdf" }, body: "%PDF-1.4\nfixture" });
    if (path === "/api/letter-heads" && request.method() === "GET") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "null" });
    return route.fulfill({ status: 404, headers: cors, contentType: "application/json", body: JSON.stringify({ message: "No isolated fixture for this API." }) });
  });

  const errors = [];
  const layoutFailures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${frontendUrl}/document-upload`, { waitUntil: "networkidle" });
    await page.getByText("Document Repository", { exact: true }).waitFor();
    const fixtureTitle = page.getByRole("button", { name: "Fixture Document", exact: true });
    await fixtureTitle.waitFor();
    assert.equal(await fixtureTitle.count(), 1, "the one-item API fixture renders one visible title action");
    assert.equal(await page.getByRole("tab").count(), 2, "only the approved repository tabs are present");
    assert.equal(await page.getByRole("tab", { name: "All Documents" }).getAttribute("aria-selected"), "true");
    assert.equal(await page.getByLabel("Source filter 1 (unverified)").isDisabled(), true);
    assert.equal(await page.getByLabel("Source filter 2 (unverified)").isDisabled(), true);
    await page.getByRole("tab", { name: "Document Register" }).click();
    await page.getByRole("columnheader", { name: "Document ID" }).waitFor();
    await page.getByRole("columnheader", { name: "Current Revision?" }).waitFor();
    await page.getByRole("columnheader", { name: "Effective Date" }).waitFor();
    const documentIdCell = page.getByRole("cell", { name: "document-fixture", exact: true });
    await documentIdCell.waitFor();
    assert.equal(await documentIdCell.count(), 1, "Document Register displays one visible row for the one-item API result");
    await page.getByRole("cell", { name: "Current", exact: true }).waitFor();
    await page.getByRole("tab", { name: "All Documents" }).click();
    await page.getByRole("button", { name: "Link Existing", exact: true }).click();
    const linkChooser = page.getByRole("dialog", { name: "Link Existing Document" });
    await linkChooser.getByLabel("Existing Document").selectOption("document-fixture");
    await linkChooser.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Version History" }).waitFor();
    await page.getByRole("complementary", { name: "Document Details" }).waitFor();
    await page.getByText("Related records:").waitFor();
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("button", { name: "Fixture Document" }).click();
    await page.getByTitle("Document preview").waitFor();
    const details = page.getByRole("complementary", { name: "Document Details" });
    await details.getByLabel("Link Existing Document Pipeline").selectOption("pipeline-fixture-2");
    await details.getByRole("button", { name: "Link Existing Document" }).click();
    await page.getByRole("status").filter({ hasText: "Existing document linked" }).waitFor();
    await details.getByText("Related records: P-01, P-02", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByLabel("Keyword search").fill("Slow");
    await page.getByRole("cell", { name: "Loading..." }).waitFor();
    releaseSlowList();
    await page.getByRole("cell", { name: "No Data", exact: true }).first().waitFor();
    await page.getByLabel("Keyword search").fill("Error");
    await page.getByRole("alert").filter({ hasText: "Fixture service unavailable" }).waitFor();
    await page.getByRole("button", { name: "Reset Filters" }).click();
    await page.getByLabel("Document Type").fill("Drawing");
    await page.getByRole("button", { name: "Fixture Document", exact: true }).waitFor();
    await page.getByLabel("Document Type").fill("No Match");
    await page.getByRole("cell", { name: "No Data", exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Reset Filters" }).click();
    await page.getByRole("button", { name: "Upload Document" }).first().click();
    await page.getByRole("dialog", { name: "Upload Document" }).waitFor();
    await page.getByRole("textbox", { name: "Title" }).waitFor();
    await page.getByLabel("Issue Date", { exact: true }).waitFor();
    await page.getByText("Letter Head", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Browse Files" }).waitFor();
    const uploadDialog = page.getByRole("dialog", { name: "Upload Document" });
    await uploadDialog.getByLabel("File (25 MiB maximum)").setInputFiles({ name: "upload-fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture") });
    await uploadDialog.getByRole("textbox", { name: "Title", exact: true }).fill("Uploaded Fixture");
    await uploadDialog.getByRole("textbox", { name: "Document Type", exact: true }).fill("Drawing");
    await uploadDialog.getByRole("textbox", { name: "Category", exact: true }).fill("Test");
    await uploadDialog.getByRole("button", { name: "Save Document" }).click();
    await page.getByRole("status").filter({ hasText: "Document saved" }).waitFor();
    await page.getByRole("button", { name: "Uploaded Fixture", exact: true }).waitFor();

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const layout = await page.evaluate(() => ({ width: window.innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
      assert.ok(layout.documentWidth <= layout.width + 1 && layout.bodyWidth <= layout.width + 1, `page overflows at ${viewport.width}px: ${JSON.stringify(layout)}`);
    }
    if (process.env.DOCUMENT_TEST_EVIDENCE_DIR) mkdirSync(process.env.DOCUMENT_TEST_EVIDENCE_DIR, { recursive: true });
    for (const role of ["Admin", "Engineer", "Viewer"]) {
      browserRole = role;
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Fixture Document", exact: true }).waitFor();
        const canWrite = role !== "Viewer";
        assert.equal(await page.getByRole("button", { name: "Upload Document", exact: true }).count(), canWrite ? 2 : 1, `${role}: repository upload visibility; legacy upload stays preserved`);
        assert.equal(await page.getByRole("button", { name: "Link Existing", exact: true }).count(), canWrite ? 1 : 0, `${role}: header chooser visibility`);
        await page.getByRole("tab", { name: "Document Register" }).click();
        await page.getByRole("cell", { name: "Current", exact: true }).first().waitFor();
        await page.getByRole("tab", { name: "All Documents" }).click();
        if (canWrite) {
          await page.getByRole("button", { name: "Link Existing", exact: true }).click();
          const chooser = page.getByRole("dialog", { name: "Link Existing Document" });
          await chooser.getByLabel("Existing Document").selectOption("document-fixture");
          await chooser.getByRole("button", { name: "Continue" }).click();
        } else {
          await page.getByRole("button", { name: "View Details" }).first().click();
        }
        const roleDetails = page.getByRole("complementary", { name: "Document Details" });
        await roleDetails.waitFor();
        assert.equal(await roleDetails.getByRole("button", { name: "Link Existing Document" }).count(), canWrite ? 1 : 0, `${role}: detail link controls`);
        assert.equal(await roleDetails.getByRole("button", { name: "Add New Revision" }).count(), canWrite ? 1 : 0, `${role}: revision controls`);
        if (canWrite) {
          for (const action of ["Share", "Import", "Add to Package"]) {
            assert.equal(await roleDetails.getByRole("button", { name: new RegExp(`^${action}`) }).isDisabled(), true, `${action} remains blocked`);
          }
        }
        const width = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
        assert.ok(width.page <= width.viewport + 1, `${role} details overflow at ${viewport.width}px`);
        const badgeBounds = await page.getByText("Unlinked / Unclassified Documents", { exact: true }).evaluate((badge) => {
          const label = badge.getBoundingClientRect();
          const card = badge.parentElement.getBoundingClientRect();
          return { labelRight: label.right, cardRight: card.right, overflow: label.right > card.right + 1 };
        });
        if (badgeBounds.overflow) layoutFailures.push({ role, viewport: viewport.width, ...badgeBounds });
        if (process.env.DOCUMENT_TEST_EVIDENCE_DIR) await page.screenshot({ path: resolve(process.env.DOCUMENT_TEST_EVIDENCE_DIR, `${role.toLowerCase()}-${viewport.width}.png`), fullPage: true });
        console.log(`PASS matrix: ${role} ${viewport.width}x${viewport.height}, both tabs, revision label, chooser/link permissions, blocked actions, layout`);
      }
    }
    for (const [status, designation] of [["Superseded", "Not Current"], ["Draft", "No Data"]]) {
      version.approvalStatus = status;
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("tab", { name: "Document Register" }).click();
      const revisionRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "document-fixture", exact: true }) });
      assert.equal((await revisionRow.getByRole("cell").nth(5).textContent()).trim(), designation);
      console.log(`PASS Current Revision fixture: ${status} -> ${designation}`);
    }
    assert.deepEqual(errors, [], "browser should not emit uncaught page errors");
    console.log("PASS: tabs, current-revision label, record linking, upload, filters, loading/error/empty states, Admin/Engineer/Viewer controls, detail/preview, legacy Upload/Letter Head, and desktop/tablet/mobile overflow.");
    if (layoutFailures.length) {
      console.error("FAIL: KPI label exceeds its card bounds:", JSON.stringify(layoutFailures));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
