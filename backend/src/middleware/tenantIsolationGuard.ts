import { NextFunction, Request, Response } from "express";

import { env } from "../config/env";

/**
 * Fail closed while a module's every query and relationship has not been
 * audited for tenant ownership. This guard is inert in the current default
 * configuration and prevents a partially migrated deployment from exposing
 * legacy global-Admin data when the workflow is enabled.
 */
export function requireAuditedTenantModule(_request: Request, response: Response, next: NextFunction): void {
  if (env.companyWorkflowEnabled) {
    response.status(503).json({
      message: "This module is temporarily unavailable while company isolation is being enabled.",
      code: "TENANT_ISOLATION_PENDING"
    });
    return;
  }

  next();
}
