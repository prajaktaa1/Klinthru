const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.SENSORS_PLAYWRIGHT_DIR || "playwright");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, ".sensors-verification");
const url = process.env.SENSORS_TEST_URL || "http://127.0.0.1:4000";

// Isolated response doubles exercise bindings without creating backend records.
const records = ["Active", "Inactive", "Fault"].map((status, index) => ({
  id: "browser-only-" + index, deviceId: "BROWSER-ONLY-" + index,
  deviceType: "Flow Meter", pipelineOrLocation: "Browser test location",
  status, latestReadingOrState: "Not commissioned", unit: "",
  lastUpdatedAt: "2026-10-14T00:00:00.000Z", isDemoData: false
}));
const demo = { ...records[0], id: "browser-only-demo", deviceId: "ISOLATED-DEMO", isDemoData: true };
const normalized = source => source.replace(/\r\n/g, "\n").trimEnd();

async function run() {
  fs.mkdirSync(output, { recursive: true });
  if (process.env.SENSORS_BASELINE_DIR) {
    for (const file of ["src/app/sensors/page.tsx",
      "src/components/sensors-table.tsx", "src/components/sensor-registration-form.tsx",
      "src/components/sensor-create-assignment.tsx", "src/components/sensor-assignment-view.tsx",
      "src/lib/sensor-assignment-options.ts"]) {
      assert.equal(normalized(fs.readFileSync(path.join(root, "frontend", file), "utf8")),
        normalized(fs.readFileSync(path.join(process.env.SENSORS_BASELINE_DIR, file), "utf8")), file);
    }
  }
  assert.ok(!fs.existsSync(path.join(root, "frontend/src/components/sensors-workspace.module.css")));
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.SENSORS_BROWSER_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const results = [];
  try {
    for (const viewport of [{ name: "desktop", width: 1672, height: 1050 },
      { name: "tablet", width: 1024, height: 1100 }, { name: "mobile", width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      await context.addInitScript(() => {
        localStorage.setItem("klinthru-auth-token", "browser-test-only");
        localStorage.setItem("theme", "light");
      });
      let mode = "empty";
      const errors = [], writes = [];
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", route => {
        const request = route.request();
        if (!["GET", "OPTIONS"].includes(request.method())) {
          writes.push(request.url()); return route.abort();
        }
        const pathname = new URL(request.url()).pathname;
        if (pathname === "/api/auth/me") return route.fulfill({ json: {
          id: "browser-test-session", name: "UI Verification", email: "test@example.invalid", role: "Admin"
        } });
        if (pathname === "/api/devices") return mode === "error"
          ? route.fulfill({ status: 503, json: { message: "Test unavailable" } })
          : route.fulfill({ json: mode === "records" ? [...records, demo] : [] });
        return route.fulfill({ json: [] });
      });
      await page.goto(url + "/sensors", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Sensors by Type", exact: true }).waitFor();
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
      assert.ok(await page.getByRole("heading", { name: "Sensors", exact: true }).isVisible());
      assert.ok(await page.getByText("Monitor sensor devices, connectivity, data quality, calibration and maintenance status.", { exact: true }).isVisible());
      assert.ok(await page.getByText("Detailed breakdown of sensors by type with status and key metrics.", { exact: true }).isVisible());
      assert.equal(await page.locator('nav[aria-label="Sensors views"]').count(), 1);
      assert.equal(await page.getByRole("button", { name: "Data Quality", exact: true }).count(), 1);
      assert.equal(await page.locator("dialog").count(), 0);
      assert.equal(await page.locator('aside[aria-label="Sensor details"]').count(), 0);
      for (const label of ["Total Devices", "Active Devices", "Inactive Devices", "Fault Devices"]) {
        assert.equal(await page.getByText(label, { exact: true }).locator("..").locator("p").textContent(), "0");
      }
      const emptyStates = page.getByText("No device records are available yet.", { exact: true });
      assert.ok(await emptyStates.first().isVisible() || await emptyStates.last().isVisible());
      assert.ok(await page.getByRole("heading", { name: "Register Sensor", exact: true }).isVisible());
      assert.ok(await page.getByRole("heading", { name: "Create Assignment", exact: true }).isVisible());
      await page.getByLabel("Device ID *", { exact: true }).fill("UNSAVED-BROWSER-INPUT");
      await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
      assert.equal(await page.getByLabel("Device ID *", { exact: true }).inputValue(), "");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      await page.screenshot({ path: path.join(output, "img01-restored-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "Data Quality", exact: true }).click();
      await page.getByRole("heading", { name: "Data Quality Trend", exact: true }).waitFor();
      for (const label of ["Data Validity", "Data Completeness", "Data Freshness", "Missing Values", "Stale Records", "Bad Quality Readings"]) {
        assert.ok(await page.getByText(label, { exact: true }).isVisible());
      }
      for (const label of ["All Pipelines", "All Types", "All Statuses", "Last 30 days"]) {
        assert.equal(await page.locator("option", { hasText: label }).count(), 1);
      }
      for (const label of ["Reset Filters", "Sensor Data Quality", "Recent Data Quality Issues"]) {
        assert.ok(await page.getByText(label, { exact: true }).isVisible());
      }
      assert.ok(await page.getByText("Not Available", { exact: true }).first().isVisible());
      await page.screenshot({ path: path.join(output, "img06-data-quality-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "Calibration", exact: true }).click();
      await page.getByRole("heading", { name: "Calibration Schedule", exact: true }).waitFor();
      for (const label of ["Calibration Status Overview", "Calibration Certificates", "Recent Calibration Activity", "Sensor Calibration List", "Calibration Schedule"]) {
        assert.ok(await page.getByRole("heading", { name: label, exact: true }).isVisible());
      }
      for (const label of ["Sensor ID", "Channel", "Last Calibration", "Next Due", "Provider", "Result", "Certificate", "Actions"]) {
        assert.ok(await page.getByRole("columnheader", { name: label, exact: true }).isVisible());
      }
      assert.ok(await page.getByText("Not Available", { exact: true }).first().isVisible());
      await page.screenshot({ path: path.join(output, "img07-calibration-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "Maintenance", exact: true }).click();
      await page.getByRole("heading", { name: "Maintenance Tasks", exact: true }).waitFor();
      for (const label of ["Maintenance Overview", "Upcoming Maintenance", "Overdue Maintenance", "Work Order Status", "Parts Replaced", "Maintenance Trend", "Technicians / Contractors", "Maintenance Tasks"]) {
        assert.ok(await page.getByRole("heading", { name: label, exact: true }).isVisible());
      }
      for (const label of ["Sensor ID", "Sensor Type", "Maintenance Type", "Priority", "Planned Date", "Due Date", "Status", "Work Order", "Assigned To", "Actions"]) {
        assert.ok(await page.getByRole("columnheader", { name: label, exact: true }).isVisible());
      }
      for (const label of ["All Types", "All Priorities", "All Statuses", "Select Date Range"]) {
        assert.equal(await page.locator("option", { hasText: label }).count(), 1);
      }
      assert.ok(await page.getByText("Not Available", { exact: true }).first().isVisible());
      await page.screenshot({ path: path.join(output, "img08-maintenance-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "Alerts & Events", exact: true }).click();
      await page.getByRole("heading", { name: "Alerts & Events Center", exact: true }).waitFor();
      for (const label of ["Alerts & Events Center", "Events Timeline (Last 7 days)", "Event Details", "Supported Hardware Event Types"]) {
        assert.ok(await page.getByRole("heading", { name: label, exact: true }).isVisible());
      }
      for (const label of ["Date & Time", "Severity", "Event Type", "Sensor / Device", "Asset / Location", "Message", "Status", "Actions"]) {
        assert.ok(await page.getByRole("columnheader", { name: label, exact: true }).isVisible());
      }
      for (const label of ["All Severities", "All Statuses", "All Event Types", "All Assets"]) {
        assert.equal(await page.locator("option", { hasText: label }).count(), 1);
      }
      for (const label of ["Offline", "Weak Signal", "Low Battery", "Calibration", "Stale", "Hardware Fault"]) {
        assert.ok(await page.locator("span").filter({ hasText: label }).first().isVisible());
      }
      assert.ok(await page.getByText("Not Available", { exact: true }).first().isVisible());
      await page.screenshot({ path: path.join(output, "img09-alerts-events-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "Configuration", exact: true }).click();
      await page.getByRole("heading", { name: "Sensor Type Templates", exact: true }).waitFor();
      for (const label of ["Sensor Type Templates", "Channel Templates", "Data Freshness Thresholds", "Calibration Interval Rules", "Maintenance Interval Rules", "Battery Warning Thresholds", "Health Score Rules", "Routing Defaults", "Allowed Units", "Gateway Templates", "User Configurable Settings"]) {
        assert.ok(await page.getByRole("heading", { name: label, exact: true }).isVisible());
      }
      for (const unit of ["psi", "MPa", "K", "in/s", "mm/year", "mm", "in", "m", "mV"]) {
        assert.ok(await page.locator("td").filter({ hasText: unit }).first().isVisible());
      }
      assert.ok(await page.locator("td").filter({ hasText: "F" }).first().isVisible());
      for (const label of ["Type Name", "Channel Name", "Freshness Threshold", "Calibration Interval", "Maintenance Interval", "Warning Threshold", "Weight", "Measurement Category", "Allowed Units"]) {
        assert.ok(await page.getByText(label, { exact: true }).first().isVisible());
      }
      assert.ok(await page.getByText("Not Available", { exact: true }).first().isVisible());
      await page.screenshot({ path: path.join(output, "img10-configuration-" + viewport.name + ".png"), fullPage: true });
      await page.getByRole("button", { name: "All Sensors", exact: true }).click();
      mode = "records";
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("cell", { name: "BROWSER-ONLY-0", exact: true }).waitFor({ state: "attached" });
      for (const [label, value] of [["Total Devices", "3"], ["Active Devices", "1"], ["Inactive Devices", "1"], ["Fault Devices", "1"]]) {
        assert.equal(await page.getByText(label, { exact: true }).locator("..").locator("p").textContent(), value);
      }
      assert.equal(await page.getByRole("cell", { name: "ISOLATED-DEMO", exact: true }).count(), 0);
      assert.ok(await page.getByText(/1 demo device record isolated from the REAL inventory view/).isVisible());
      mode = "error";
      await page.reload({ waitUntil: "networkidle" });
      await page.getByText("Device records could not be loaded.", { exact: true }).first().waitFor();
      assert.equal(await page.getByText("Total Devices", { exact: true }).locator("..").locator("p").textContent(), "Unavailable");
      assert.equal(await page.getByRole("heading", { name: "Sensors by Type", exact: true }).count(), 0);
      assert.deepEqual(errors, []); assert.deepEqual(writes, []);
      results.push({ viewport: viewport.name, result: "PASS", pageOverflow: overflow,
        screenshot: "img01-restored-" + viewport.name + ".png", browserErrors: 0, backendWrites: 0 });
      await context.close();
    }
    fs.writeFileSync(path.join(output, "img01-restored-test-results.json"), JSON.stringify({
      testedAt: new Date().toISOString(), baseline: process.env.SENSORS_BASELINE_DIR || "not supplied",
      authentication: "intercepted browser-only session", screenshotData: "empty inventory", results
    }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
