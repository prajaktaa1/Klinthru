import { Router } from "express";

import { store } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const settingsRouter = Router();

settingsRouter.get("/users", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings user administration requires Admin access." });
    return;
  }

  const users = await store.listUsers();
  response.json({
    users: users.map(({ passwordHash: _passwordHash, ...user }) => ({
      ...user,
      accountStatus: null,
      mfaStatus: null,
      employeeId: null,
      department: null,
      groups: null,
      accessScope: null,
      lastLoginAt: null,
      defaultTimezone: null,
      language: null
    })),
    contractStatus: "partial",
    missingFields: ["accountStatus", "mfaStatus", "employeeId", "department", "groups", "accessScope", "lastLoginAt", "defaultTimezone", "language"]
  });
});

settingsRouter.get("/roles", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings role administration requires Admin access." });
    return;
  }

  const users = await store.listUsers();
  const roles = ["Admin", "Engineer", "Viewer"]
    .map((name) => ({ name, userCount: users.filter((user) => user.role === name).length }))
    .filter((role) => role.userCount > 0);

  response.json({
    roles,
    permissionsAvailable: false,
    missingFields: ["roleId", "roleType", "description", "status", "permissionSetId", "modulePermissions", "approvalWorkflow"]
  });
});

settingsRouter.get("/dictionaries", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings dictionary administration requires Admin access." });
    return;
  }

  response.json({
    dictionaries: [],
    values: [],
    contractStatus: "missing",
    missingFields: ["dictionaryId", "dictionaryName", "dictionaryValueId", "code", "label", "description", "category", "parentValue", "status", "language", "effectiveDate", "version", "usedInModules", "changeImpact", "recentChanges"]
  });
});

settingsRouter.get("/units", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings units administration requires Admin access." });
    return;
  }

  response.json({
    unitSystem: null,
    standards: [],
    conversions: [],
    mappings: [],
    contractStatus: "missing",
    missingFields: ["unitId", "unitSystem", "canonicalUnit", "displayUnit", "unitConversionId", "fromUnit", "toUnit", "conversionFactor", "offset", "category", "standardId", "standardVersionId", "standardCode", "title", "revision", "effectiveDate", "applicableModules", "defaultCriteria", "scope", "status"]
  });
});

settingsRouter.get("/workflows", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings workflow administration requires Admin access." });
    return;
  }

  response.json({
    workflows: [],
    contractStatus: "missing",
    missingFields: ["workflowDefinitionId", "workflowVersionId", "name", "description", "status", "owner", "department", "lastUpdated", "stages", "approvers", "sla", "escalationRules", "notifications", "conditionalLogic", "triggerSource", "history", "impactReview", "approval", "effectiveDate", "activation"]
  });
});

settingsRouter.get("/thresholds", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings threshold governance requires Admin access." });
    return;
  }

  response.json({
    registry: [],
    contractStatus: "missing",
    missingFields: ["thresholdRegistryId", "ownerModule", "ownerRuleId", "parameter", "standardReference", "ruleVersion", "warningLimit", "criticalLimit", "unit", "effectiveScope", "lastReview", "nextReview", "status", "exceptions", "impactedAssets", "revisionHistory"]
  });
});

settingsRouter.get("/notifications", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Settings notification administration requires Admin access." });
    return;
  }

  response.json({
    notifications: [],
    channels: [],
    rules: [],
    contractStatus: "missing",
    missingFields: ["notificationRuleId", "notificationTemplateId", "notificationEventId", "deliveryId", "subscriptionId", "sourceEvent", "severity", "recipients", "channel", "escalationTime", "quietHours", "template", "status", "connectorId", "channelStatus", "deliverySuccessRate", "recentActivity"]
  });
});

settingsRouter.get("/system-configuration", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "System configuration administration requires Admin access." });
    return;
  }

  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const connectors = await prisma.integrationConnector.findMany({
        where: {},
        select: { id: true, name: true, connectorType: true, enabled: true, status: true, lastTestedAt: true, lastSuccessfulTestAt: true, lastFailureAt: true },
        orderBy: { createdAt: "desc" }
      });
      response.json({
        environment: null,
        services: [],
        backup: null,
        license: null,
        settings: null,
        connectors: connectors.map((connector: { id: string; name: string; connectorType: string; enabled: boolean; status: string; lastTestedAt: Date | null; lastSuccessfulTestAt: Date | null; lastFailureAt: Date | null }) => ({
          connectorId: connector.id,
          name: connector.name,
          connectorType: connector.connectorType,
          enabled: connector.enabled,
          status: connector.status,
          lastTestedAt: connector.lastTestedAt?.toISOString() ?? null,
          lastSuccessfulTestAt: connector.lastSuccessfulTestAt?.toISOString() ?? null,
          lastFailureAt: connector.lastFailureAt?.toISOString() ?? null
        })),
        contractStatus: "partial",
        missingFields: ["environmentStatus", "version", "uptime", "lastRestart", "serviceName", "serviceStatus", "lastBackup", "nextBackup", "backupSize", "retention", "licenseStatus", "edition", "validUntil", "licensedAssets", "supportTier", "platformName", "systemDescription", "baseUrl", "contactEmail", "companyLogo", "primaryColor", "theme", "loginMessage", "defaultTimezone", "dateFormat", "timeFormat", "defaultLanguage", "defaultUnits", "mfaPolicy", "passwordComplexity", "passwordExpiryDays", "accountLockoutAttempts", "lockoutDurationMinutes", "singleSignOn", "ipWhitelist", "sessionTimeoutMinutes", "rememberMe", "concurrentSessionLimit", "activeSessionVisibility", "reauthenticationSensitiveActions", "storageType", "bucket", "region", "backupSchedule", "backupTime", "includeDatabase", "includeFileStorage", "includeConfiguration", "featureFlags", "environmentVariables"]
      });
      return;
    } catch (error) {
      const coded = error as { code?: string; message?: string };
      if (coded.code === "P2021" || coded.message?.includes("IntegrationConnector")) {
        response.status(503).json({ message: "Integration connector persistence is unavailable until its approved migration is applied." });
        return;
      }
      throw error;
    }
  }

  response.json({
    environment: null,
    services: [],
    backup: null,
    license: null,
    settings: null,
    connectors: [],
    contractStatus: "missing",
    missingFields: [
      "environmentStatus", "version", "uptime", "lastRestart", "serviceName", "serviceStatus",
      "lastBackup", "nextBackup", "backupSize", "retention", "licenseStatus", "edition", "validUntil",
      "licensedAssets", "supportTier", "platformName", "systemDescription", "baseUrl", "contactEmail",
      "companyLogo", "primaryColor", "theme", "loginMessage", "defaultTimezone", "dateFormat", "timeFormat",
      "defaultLanguage", "defaultUnits", "mfaPolicy", "passwordComplexity", "passwordExpiryDays",
      "accountLockoutAttempts", "lockoutDurationMinutes", "singleSignOn", "ipWhitelist", "sessionTimeoutMinutes",
      "rememberMe", "concurrentSessionLimit", "activeSessionVisibility", "reauthenticationSensitiveActions",
      "connectorId", "connectorType", "connectorStatus", "storageType", "bucket", "region", "backupSchedule",
      "backupTime", "includeDatabase", "includeFileStorage", "includeConfiguration", "featureFlags", "environmentVariables"
    ]
  });
});

settingsRouter.get("/audit-log", requireAuth, async (request, response) => {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ message: "Audit log access requires Admin access." });
    return;
  }

  response.json({
    events: [],
    contractStatus: "missing",
    missingFields: [
      "auditEventId", "userId", "timestamp", "module", "action", "recordId", "objectId", "result",
      "severity", "ipAddress", "sessionId", "requestId", "userAgent", "details", "beforeValues", "afterValues",
      "affectedRecord", "owningModule", "dateRange", "moduleFilter", "userFilter", "eventTypeFilter", "severityFilter",
      "retentionSettings", "integrityVerification", "exportFormat"
    ]
  });
});
