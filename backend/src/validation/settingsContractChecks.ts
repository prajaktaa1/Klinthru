import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const backendRoot = path.resolve(__dirname, "../..");
const schema = fs.readFileSync(path.join(backendRoot, "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(backendRoot, "prisma/drafts/20261021_settings_contracts.sql"), "utf8");
const route = fs.readFileSync(path.join(backendRoot, "src/routes/settings.ts"), "utf8");

const endpoints = ["users", "roles", "dictionaries", "units", "workflows", "thresholds", "notifications", "system-configuration", "audit-log"];
const models = [
  "SettingsGroup", "SettingsGroupMembership", "SettingsAccessScope", "SettingsUserAccessScope", "SettingsRoleDefinition",
  "SettingsUserRole", "SettingsPermissionSet", "SettingsPermissionGrant", "SettingsRolePermissionSet", "SettingsDictionary",
  "SettingsDictionaryValue", "SettingsDictionaryValueVersion", "SettingsDictionaryUsageReference", "SettingsUnit",
  "SettingsUnitConversion", "SettingsStandard", "SettingsStandardVersion", "SettingsUnitDisplayPreference",
  "SettingsWorkflowDefinition", "SettingsWorkflowVersion", "SettingsWorkflowStage", "SettingsWorkflowApprover",
  "SettingsWorkflowRule", "SettingsWorkflowInstanceReference", "SettingsThresholdRegistry", "SettingsThresholdReference",
  "SettingsNotificationTemplate", "SettingsNotificationRule", "SettingsNotificationSubscription",
  "SettingsNotificationChannelReference", "SettingsNotificationEventReference", "SettingsNotificationDelivery",
  "SettingsConfigurationSet", "SettingsConfigurationVersion", "SettingsConfigurationDistribution", "SettingsAuditEvent"
];

for (const endpoint of endpoints) {
  assert.match(route, new RegExp(`settingsRouter\\.get\\("/${endpoint.replace("-", "\\-")}"`), `Missing Settings endpoint: ${endpoint}`);
}

const endpointBlocks = route.split("settingsRouter.get(").slice(1);
for (const block of endpointBlocks) {
  assert.match(block, /requireAuth/, "Every Settings endpoint must require authentication.");
  assert.match(block, /request\.user\?\.role !== "Admin"/, "Every Settings endpoint must enforce Admin access.");
}

for (const model of models) {
  assert.match(schema, new RegExp(`model\\s+${model}\\s*\\{`), `Missing Prisma model: ${model}`);
}

assert.match(schema, /enum SettingsApprovalState/);
assert.match(schema, /enum SettingsRecordState/);
assert.match(schema, /model SettingsAuditEvent[\s\S]*@@index\(\[occurredAt, sourceModule\]\)/);
assert.match(schema, /model SettingsConfigurationVersion[\s\S]*immutable\s+Boolean/);
assert.match(schema, /model SettingsWorkflowVersion[\s\S]*immutable\s+Boolean/);
assert.match(schema, /model SettingsThresholdRegistry[\s\S]*ownerModule[\s\S]*ownerRuleId[\s\S]*ruleVersion/);

assert.match(migration, /^-- DRAFT ONLY\. DO NOT APPLY\./);
const executableMigration = migration.replace(/^\s*--.*$/gm, "");
assert.doesNotMatch(executableMigration, /\b(?:INSERT\s+INTO|UPDATE\s+(?:"[^"]+"|[a-z_][a-z0-9_]*)\s+SET|DELETE\s+FROM|TRUNCATE\s+)/i, "Draft must not contain data mutation statements.");
assert.match(migration, /REFERENCES\s+"User"\("id"\)/, "Draft must preserve User ownership references.");
assert.match(migration, /settings_reject_audit_mutation/);
assert.match(migration, /settings_reject_approved_version_mutation/);
assert.match(migration, /BEFORE UPDATE OR DELETE ON "settings_audit_events"/);
assert.match(migration, /BEFORE UPDATE OR DELETE ON "settings_configuration_versions"/);
assert.match(migration, /BEFORE UPDATE OR DELETE ON "settings_workflow_versions"/);

assert.doesNotMatch(route, /secretReference|configuration\s*:/, "Settings routes must not expose connector secrets or raw configuration.");
assert.match(route, /connectorId/);
assert.match(route, /connectorType/);
assert.match(route, /lastSuccessfulTestAt/);

console.log("Settings contract checks passed: 9 endpoints, Prisma models, ownership guards, draft safety and immutability clauses verified.");
