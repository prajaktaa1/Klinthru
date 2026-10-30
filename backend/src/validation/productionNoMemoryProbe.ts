import assert from "node:assert/strict";

process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

async function run() {
  const { DatabaseUnavailableError, initializeStorage } = await import("../data/store");

  await assert.rejects(
    () => initializeStorage(),
    (error) => error instanceof DatabaseUnavailableError,
    "Production must fail when DATABASE_URL is missing instead of using memory storage"
  );

  console.log("Production no-memory probe passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
