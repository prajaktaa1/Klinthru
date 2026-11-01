import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { requireSuperAdminSession, SuperAdminAuthError } from "../lib/superAdminAuth";
import { getPrismaClient } from "../lib/prisma";
import { CompanyWorkflowError, activateAnnual, activateTrial, approveCompany, createCompanyUser, createSuperadmin, deactivateCompanyUser, generateReferral, getCompanyDetails, isSuperAdmin, listActivity, listCompanyUsers, listSuperadmins, redeemReferral, renewAnnual, revokeReferral, revokeSuperadmin } from "../superAdmin/service";
import { env } from "../config/env";

export const superAdminRouter = Router();
superAdminRouter.use((request, response, next) => {
  void requireSuperAdminSession(request, response, request.method !== "GET").then(email => { request.user = { id: email, email, name: "Super Admin", role: "Admin" }; next(); }).catch(error => { if (error instanceof SuperAdminAuthError) { response.status(error.status).json({ message: error.message }); return; } response.status(401).json({ message: "Super Admin authentication required." }); });
});

async function requirePlatformAdmin(request: import("express").Request) {
  const userId = request.user?.id;
  if (!userId || !(await isSuperAdmin(userId))) throw new CompanyWorkflowError(403, "Super Admin authorization required.");
  return userId;
}

function sendError(response: import("express").Response, error: unknown) {
  if (error instanceof CompanyWorkflowError) {
    const code = error.status === 503 ? (env.companyWorkflowEnabled ? "DATABASE_UNAVAILABLE" : "COMPANY_WORKFLOW_DISABLED") : error.status === 403 ? "SUPER_ADMIN_FORBIDDEN" : undefined;
    response.status(error.status).json({ message: error.message, ...(code ? { code } : {}) });
    return;
  }
  const prismaCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (["P2021", "P2022"].includes(prismaCode)) { response.status(503).json({ message: "Company workflow database schema is unavailable until the approved migration is deployed.", code: "DATABASE_SCHEMA_UNAVAILABLE" }); return; }
  response.status(500).json({ message: "Super Admin operation failed." });
}

superAdminRouter.get("/companies", async (request, response) => {
  try { await requirePlatformAdmin(request); if (!env.companyWorkflowEnabled) throw new CompanyWorkflowError(503, "Company workflow is not enabled until its migration is approved and deployed."); const db = getPrismaClient(); if (!db) throw new CompanyWorkflowError(503, "Database unavailable."); response.json(await db.company.findMany({ orderBy: { createdAt: "desc" } })); } catch (error) { sendError(response, error); }
});

superAdminRouter.get("/configuration", async (request, response) => {
  try { await requirePlatformAdmin(request); response.json({ plan: "Annual", currency: env.annualPlanCurrency, price: env.annualPlanPrice || null, trialDays: 7, paidDays: 365 }); } catch (error) { sendError(response, error); }
});

superAdminRouter.get("/superadmins", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await listSuperadmins(actorId)); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/superadmins", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.status(201).json(await createSuperadmin(actorId, { email: typeof request.body?.email === "string" ? request.body.email : "", password: typeof request.body?.password === "string" ? request.body.password : "" })); } catch (error) { sendError(response, error); }
});
superAdminRouter.post("/superadmins/:id/revoke", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await revokeSuperadmin(actorId, request.params.id)); } catch (error) { sendError(response, error); }
});

superAdminRouter.get("/legacy-data", async (request, response) => {
  try {
    await requirePlatformAdmin(request);
    const db = getPrismaClient();
    if (!db) throw new CompanyWorkflowError(503, "Database unavailable.");
    const legacyAdmins = await db.user.findMany({ where: { role: "Admin" }, select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    const pipelines = await db.pipeline.findMany({ select: { id: true, pipelineCode: true, pipelineName: true, pipeLengthKm: true, createdById: true, companyId: true }, orderBy: { createdAt: "asc" } });
    const mappedCompanies = legacyAdmins.length ? await db.company.findMany({ where: { memberships: { some: { userId: { in: legacyAdmins.map((admin: { id: string }) => admin.id) } } } }, select: { id: true, name: true, status: true, memberships: { where: { userId: { in: legacyAdmins.map((admin: { id: string }) => admin.id) } }, select: { userId: true, role: true, status: true } } } }) : [];
    const mappedCompany = mappedCompanies[0];
    response.json({ status: "available", companyMapping: mappedCompany ? `${mappedCompany.name} (${mappedCompany.status})` : "Company not yet mapped", mappedCompanyId: mappedCompany?.id ?? null, mappedPipelineIds: pipelines.filter((item: { companyId?: string | null }) => item.companyId === mappedCompany?.id).map((item: { id: string }) => item.id), legacyAdmins, pipelines: pipelines.map(item => ({ ...item, pipeLengthKm: item.pipeLengthKm === null ? null : Number(item.pipeLengthKm) })) });
  } catch (error) { sendError(response, error); }
});

superAdminRouter.get("/companies/:companyId", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await getCompanyDetails(actorId, request.params.companyId)); } catch (error) { sendError(response, error); }
});

superAdminRouter.get("/activity", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await listActivity(actorId, typeof request.query.companyId === "string" ? request.query.companyId : undefined)); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/referrals", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.status(201).json(await generateReferral(actorId, { companyId: typeof request.body?.companyId === "string" ? request.body.companyId : undefined, purpose: typeof request.body?.purpose === "string" ? request.body.purpose : undefined })); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/referrals/:code/revoke", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await revokeReferral(actorId, request.params.code)); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/companies/:companyId/approve", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await approveCompany(actorId, request.params.companyId)); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/companies/:companyId/activate-trial", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await activateTrial(actorId, request.params.companyId)); } catch (error) {
    if (env.nodeEnv === "development") {
      const diagnostic = error as { name?: unknown; code?: unknown; meta?: { target?: unknown; modelName?: unknown; constraint?: unknown } };
      const requestId = (request as import("express").Request & { id?: string }).id || crypto.randomUUID();
      console.error("[super-admin.activate-trial]", {
        requestId,
        name: typeof diagnostic.name === "string" ? diagnostic.name : "UnknownError",
        prismaCode: typeof diagnostic.code === "string" ? diagnostic.code : undefined,
        model: typeof diagnostic.meta?.modelName === "string" ? diagnostic.meta.modelName : undefined,
        constraint: typeof diagnostic.meta?.constraint === "string" ? diagnostic.meta.constraint : undefined,
        target: Array.isArray(diagnostic.meta?.target) ? diagnostic.meta.target : undefined
      });
    }
    sendError(response, error);
  }
});

superAdminRouter.post("/companies/:companyId/activate-annual", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await activateAnnual(actorId, request.params.companyId, { pipelineKmLimit: Number(request.body?.pipelineKmLimit), namedUserLimit: Number(request.body?.namedUserLimit) })); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/companies/:companyId/renew", async (request, response) => {
  try { const actorId = await requirePlatformAdmin(request); response.json(await renewAnnual(actorId, request.params.companyId, { pipelineKmLimit: Number(request.body?.pipelineKmLimit), namedUserLimit: Number(request.body?.namedUserLimit) })); } catch (error) { sendError(response, error); }
});

superAdminRouter.post("/referrals/:code/redeem", async (request, response) => {
  try { if (!request.user?.id) throw new CompanyWorkflowError(401, "Authentication required."); response.json(await redeemReferral(request.user.id, request.params.code)); } catch (error) { sendError(response, error); }
});

export const companyUsersRouter = Router();
companyUsersRouter.use(requireAuth);
companyUsersRouter.get("/:companyId/users", async (request, response) => {
  try { if (!request.user?.id) throw new CompanyWorkflowError(401, "Authentication required."); response.json(await listCompanyUsers(request.user.id, request.params.companyId)); } catch (error) { sendError(response, error); }
});
companyUsersRouter.post("/:companyId/users", async (request, response) => {
  try { if (!request.user?.id) throw new CompanyWorkflowError(401, "Authentication required."); response.status(201).json(await createCompanyUser(request.user.id, request.params.companyId, { name: String(request.body?.name || ""), email: String(request.body?.email || ""), role: request.body?.role })); } catch (error) { sendError(response, error); }
});
companyUsersRouter.post("/:companyId/users/:userId/deactivate", async (request, response) => {
  try { if (!request.user?.id) throw new CompanyWorkflowError(401, "Authentication required."); response.json(await deactivateCompanyUser(request.user.id, request.params.companyId, request.params.userId)); } catch (error) { sendError(response, error); }
});
