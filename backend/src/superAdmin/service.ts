import crypto from "crypto";
import bcrypt from "bcrypt";

import { env } from "../config/env";
import { getPrismaClient } from "../lib/prisma";
import { addUtcDays, annualExpiry, annualRenewalStart, assertCapacity, assertSingleUseReferral, assertTrialCanStart, canAccessCompany, referralExpiry, trialExpiry } from "./domain";
import { cancelPendingCompanyNotifications, queueCompanyNotification, scheduleSubscriptionNotifications } from "./notifications";

export class CompanyWorkflowError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "CompanyWorkflowError";
  }
}

function dbOrThrow() {
  const db = getPrismaClient();
  if (!db) throw new CompanyWorkflowError(503, "Company workflow database is unavailable.");
  return db as any;
}

function requireWorkflowEnabled() {
  if (!env.companyWorkflowEnabled) throw new CompanyWorkflowError(503, "Company workflow is not enabled until its migration is approved and deployed.");
}

function logDevelopmentDiagnostic(scope: string, error: unknown) {
  if (env.nodeEnv !== "development") return;
  const diagnostic = error as { name?: unknown; code?: unknown; meta?: { target?: unknown; modelName?: unknown; constraint?: unknown } };
  console.error(`[${scope}]`, {
    requestId: crypto.randomUUID(),
    name: typeof diagnostic.name === "string" ? diagnostic.name : "UnknownError",
    prismaCode: typeof diagnostic.code === "string" ? diagnostic.code : undefined,
    model: typeof diagnostic.meta?.modelName === "string" ? diagnostic.meta.modelName : undefined,
    constraint: typeof diagnostic.meta?.constraint === "string" ? diagnostic.meta.constraint : undefined,
    target: Array.isArray(diagnostic.meta?.target) ? diagnostic.meta.target : undefined
  });
}

async function recordAudit(db: any, input: { actorId?: string; companyId?: string; action: string; entityType: string; entityId?: string; before?: unknown; after?: unknown }) {
  await db.auditLog.create({ data: { id: crypto.randomUUID(), actorId: input.actorId, companyId: input.companyId, action: input.action, entityType: input.entityType, entityId: input.entityId, before: input.before, after: input.after } });
}

async function persistedActorId(db: any, actorId: string): Promise<string | undefined> {
  const actor = await db.user.findFirst({ where: { OR: [{ id: actorId }, { email: actorId }] }, select: { id: true } });
  return actor?.id;
}

async function actorAttribution(db: any, actorId: string): Promise<{ userId?: string; email: string; superAdminId?: string }> {
  const actor = await db.user.findFirst({ where: { OR: [{ id: actorId }, { email: actorId }] }, select: { id: true, email: true } });
  const superAdmin = actor ? await db.superAdmin.findUnique({ where: { userId: actor.id }, select: { id: true } }) : undefined;
  return { userId: actor?.id, email: actor?.email ?? actorId, superAdminId: superAdmin?.id };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (env.superAdminEmail && userId.toLowerCase() === env.superAdminEmail && env.superAdminPasswordHash) return true;
  const db = dbOrThrow();
  const user = await db.user.findFirst({ where: { OR: [{ id: userId }, { email: userId }] }, select: { id: true } });
  const role = user ? await db.superAdmin.findUnique({ where: { userId: user.id } }) : null;
  return role?.status === "Active";
}

export async function listSuperadmins(actorId: string) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const persisted = await db.superAdmin.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, status: true, createdAt: true, user: { select: { id: true, name: true, email: true, role: true } } } });
  const accounts = persisted.map((entry: any) => ({ ...entry, source: "Database" as const }));
  const configuredEmail = env.superAdminEmail.trim().toLowerCase();
  if (!configuredEmail || !env.superAdminPasswordHash) return accounts;
  const matchingIndex = accounts.findIndex((entry: any) => entry.user.email.trim().toLowerCase() === configuredEmail);
  const environmentEntry = { id: matchingIndex >= 0 ? accounts[matchingIndex].id : "environment-superadmin", status: "Active", createdAt: matchingIndex >= 0 ? accounts[matchingIndex].createdAt : new Date(0), source: "Environment" as const, user: { id: matchingIndex >= 0 ? accounts[matchingIndex].user.id : "environment-superadmin", name: matchingIndex >= 0 ? accounts[matchingIndex].user.name : "Configured Superadmin", email: configuredEmail, role: "Admin" } };
  if (matchingIndex >= 0) accounts[matchingIndex] = environmentEntry;
  else accounts.unshift(environmentEntry);
  return accounts;
}

function normalizeSuperadminEmail(value: string): string { return value.trim().toLowerCase(); }
const superadminCreationAttempts = new Map<string, number[]>();

function validateSuperadminPassword(password: string): void {
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new CompanyWorkflowError(400, "Password must be at least 12 characters and include upper, lower, numeric and special characters.");
}

export async function createSuperadmin(actorId: string, input: { email: string; password: string }) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const now = Date.now(); const recent = (superadminCreationAttempts.get(actorId) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 5) throw new CompanyWorkflowError(429, "Too many account creation attempts. Please try again later.");
  recent.push(now); superadminCreationAttempts.set(actorId, recent);
  const email = normalizeSuperadminEmail(input.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new CompanyWorkflowError(400, "Enter a valid operator email.");
  validateSuperadminPassword(input.password);
  if (email === env.superAdminEmail) throw new CompanyWorkflowError(409, "That operator is already authorized.");
  const hash = await bcrypt.hash(input.password, 12);
  try {
    return await db.$transaction(async (tx: any) => {
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) throw new CompanyWorkflowError(409, "That operator email is already in use.");
      const user = await tx.user.create({ data: { id: crypto.randomUUID(), name: email.split("@")[0], email, passwordHash: hash, role: "Admin" } });
      const account = await tx.superAdmin.create({ data: { id: crypto.randomUUID(), userId: user.id, status: "Active" }, select: { id: true, status: true, createdAt: true } });
      const attribution = await actorAttribution(tx, actorId);
      await recordAudit(tx, { actorId: attribution.userId, action: "superadmin.created", entityType: "SuperAdmin", entityId: account.id, after: { operatorEmail: email, actorEmail: attribution.email, actorSuperAdminId: attribution.superAdminId } });
      return { ...account, source: "Database" as const, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new CompanyWorkflowError(409, "That operator email is already authorized.");
    throw error;
  }
}

export async function requireSuperAdmin(userId: string) {
  if (!(await isSuperAdmin(userId))) throw new CompanyWorkflowError(403, "Super Admin authorization required.");
}

export async function revokeSuperadmin(actorId: string, targetId: string) {
  requireWorkflowEnabled();
  const db = dbOrThrow();
  const actor = await db.user.findFirst({ where: { OR: [{ id: actorId }, { email: actorId }] }, select: { id: true, email: true } });
  if (!actor || !(await isSuperAdmin(actor.id))) throw new CompanyWorkflowError(403, "Super Admin authorization required.");
  return db.$transaction(async (tx: any) => {
    const target = await tx.superAdmin.findUnique({ where: { id: targetId }, include: { user: { select: { id: true, email: true } } } });
    if (!target || target.status !== "Active") throw new CompanyWorkflowError(409, "Only active database Superadmins can be revoked.");
    if (target.user.email.trim().toLowerCase() === env.superAdminEmail) throw new CompanyWorkflowError(403, "The environment-configured Super Admin cannot be revoked.");
    if (target.user.id === actor.id) throw new CompanyWorkflowError(403, "You cannot revoke your own Super Admin access.");
    const activeDatabaseCount = await tx.superAdmin.count({ where: { status: "Active" } });
    const configuredDatabaseAccount = env.superAdminEmail ? await tx.superAdmin.findFirst({ where: { status: "Active", user: { email: env.superAdminEmail } }, select: { id: true } }) : null;
    const activeCount = activeDatabaseCount + (env.superAdminEmail && !configuredDatabaseAccount ? 1 : 0);
    if (activeCount <= 1) throw new CompanyWorkflowError(409, "The final active Super Admin cannot be revoked.");
    const updated = await tx.superAdmin.update({ where: { id: target.id }, data: { status: "Revoked" } });
    await tx.superAdminSession.deleteMany({ where: { email: target.user.email } });
    await tx.auditLog.create({ data: { id: crypto.randomUUID(), actorId: actor.id, action: "superadmin.access_revoked", entityType: "SuperAdmin", entityId: target.id, before: { status: target.status, operatorEmail: target.user.email }, after: { status: updated.status, operatorEmail: target.user.email, revokedAt: new Date().toISOString() } } });
    return { id: updated.id, status: updated.status };
  });
}

export async function generateReferral(actorId: string, input: { companyId?: string; purpose?: string }, now = new Date()) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const expiresAt = referralExpiry(now); const persistedActor = await persistedActorId(db, actorId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `KLIN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    try {
      return await db.$transaction(async (tx: any) => {
        const referral = await tx.referralCode.create({ data: { id: crypto.randomUUID(), code, companyId: input.companyId, purpose: input.purpose?.trim() || "Invitation", generatedAt: now, expiresAt } });
        await recordAudit(tx, { actorId: persistedActor, companyId: input.companyId, action: "referral.generated", entityType: "ReferralCode", entityId: referral.id, after: { expiresAt, actorEmail: persistedActor ? undefined : actorId } });
        return referral;
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002" || attempt === 4) throw error;
    }
  }
  throw new CompanyWorkflowError(500, "Referral code could not be generated.");
}

export async function revokeReferral(actorId: string, code: string) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const referral = await db.referralCode.findUnique({ where: { code } });
  if (!referral) throw new CompanyWorkflowError(404, "Referral code not found.");
  if (referral.status !== "Available") throw new CompanyWorkflowError(409, "Only an available referral code can be revoked.");
  const persistedActor = await persistedActorId(db, actorId);
  return db.$transaction(async (tx: any) => {
    const result = await tx.referralCode.updateMany({ where: { id: referral.id, status: "Available" }, data: { status: "Revoked" } });
    if (result.count !== 1) throw new CompanyWorkflowError(409, "Only an available referral code can be revoked.");
    const updated = await tx.referralCode.findUnique({ where: { id: referral.id } });
    await recordAudit(tx, { actorId: persistedActor, companyId: referral.companyId ?? undefined, action: "referral.revoked", entityType: "ReferralCode", entityId: referral.id, after: { actorEmail: persistedActor ? undefined : actorId } });
    return updated;
  });
}
export async function getCompanyDetails(actorId: string, companyId: string) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const company = await db.company.findUnique({ where: { id: companyId }, include: { memberships: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } }, subscriptions: { orderBy: { expiresAt: "desc" } }, referralCodes: { orderBy: { generatedAt: "desc" } } } });
  if (!company) throw new CompanyWorkflowError(404, "Company not found.");
  return company;
}

export async function listActivity(actorId: string, companyId?: string) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const where = companyId ? { companyId } : undefined;
  const [auditLogs, notifications] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true } }, company: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.notificationDelivery.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 })
  ]);
  return { auditLogs, notifications };
}

export async function createPendingCompany(input: { name: string; mobileNumber: string; signupEmail: string; userId: string }) {
  requireWorkflowEnabled();
  const db = dbOrThrow();
  const company = await db.company.create({ data: { id: crypto.randomUUID(), name: input.name, mobileNumber: input.mobileNumber, signupEmail: input.signupEmail.toLowerCase(), status: "SignupPending" } });
  await db.companyMembership.create({ data: { id: crypto.randomUUID(), companyId: company.id, userId: input.userId, role: "CompanyAdmin", status: "Active" } });
  await recordAudit(db, { actorId: input.userId, companyId: company.id, action: "company.signup_submitted", entityType: "Company", entityId: company.id });
  void queueCompanyNotification({ companyId: company.id, kind: "CompanyWelcome", recipient: input.signupEmail, data: { companyName: input.name }, dedupeKey: `${company.id}:CompanyWelcome` }).catch(() => undefined);
  return company;
}

export async function approveCompany(actorId: string, companyId: string) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company || company.status !== "SignupPending") throw new CompanyWorkflowError(409, "Company is not awaiting approval.");
  const persistedId = await persistedActorId(db, actorId);
  const updated = await db.company.update({ where: { id: companyId }, data: { status: "Approved", approvedAt: new Date(), approvedById: persistedId } });
  await recordAudit(db, { actorId: persistedId, companyId, action: "company.approved", entityType: "Company", entityId: companyId, before: { status: company.status }, after: { status: updated.status } });
  return updated;
}

export async function activateTrial(actorId: string, companyId: string, now = new Date()) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const actor = await actorAttribution(db, actorId);
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new CompanyWorkflowError(404, "Company not found.");
  if (["SignupPending", "SignupRejected", "Suspended"].includes(company.status)) throw new CompanyWorkflowError(409, "This company is not eligible for annual activation.");
  assertTrialCanStart(company.status === "Approved", company.trialUsed);
  const expiresAt = trialExpiry(now);
  const result = await db.$transaction(async (tx: any) => {
    const updated = await tx.company.update({ where: { id: companyId }, data: { status: "TrialActive", trialUsed: true, activatedAt: now, activatedById: actor.userId } });
    await tx.companySubscription.create({ data: { id: crypto.randomUUID(), companyId, plan: "Annual", status: "Trial", startedAt: now, expiresAt, pipelineKmLimit: 0, namedUserLimit: 0, actionedById: actor.userId, actionedByEmail: actor.email } });
    await tx.auditLog.create({ data: { id: crypto.randomUUID(), actorId: actor.userId, companyId, action: "company.trial_activated", entityType: "Company", entityId: companyId, after: { status: updated.status, expiresAt, actorEmail: actor.email, superAdminId: actor.superAdminId } } });
    return updated;
  });
  try {
    const contact = await db.companyMembership.findFirst({ where: { companyId, role: "CompanyAdmin", status: "Active" }, include: { user: { select: { name: true, email: true } } } });
    if (contact?.user) void queueCompanyNotification({ companyId, kind: "TrialActivated", recipient: contact.user.email, data: { companyName: result.name, adminName: contact.user.name, start: now, expiry: expiresAt }, dedupeKey: `${companyId}:TrialActivated:${now.toISOString()}` }).catch(error => logDevelopmentDiagnostic("super-admin.trial-activated-notification", error));
    if (contact?.user) void queueCompanyNotification({ companyId, kind: "TrialExpiryReminder2", recipient: contact.user.email, data: { companyName: result.name, adminName: contact.user.name, expiry: expiresAt, remainingDays: 2 }, scheduledFor: new Date(expiresAt.getTime() - 2 * 24 * 60 * 60 * 1000), dedupeKey: `${companyId}:TrialExpiryReminder2:${expiresAt.toISOString()}` }).catch(error => logDevelopmentDiagnostic("super-admin.trial-expiry-reminder-notification", error));
    if (contact?.user) void queueCompanyNotification({ companyId, kind: "TrialExpired", recipient: contact.user.email, data: { companyName: result.name, adminName: contact.user.name, expiry: expiresAt }, scheduledFor: expiresAt, dedupeKey: `${companyId}:TrialExpired:${expiresAt.toISOString()}` }).catch(error => logDevelopmentDiagnostic("super-admin.trial-expired-notification", error));
  } catch (error) {
    logDevelopmentDiagnostic("super-admin.trial-contact-lookup", error);
  }
  return result;
}

export async function activateAnnual(actorId: string, companyId: string, input: { pipelineKmLimit: number; namedUserLimit: number }, now = new Date()) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const actor = await actorAttribution(db, actorId);
  if (!Number.isFinite(input.pipelineKmLimit) || input.pipelineKmLimit <= 0 || !Number.isInteger(input.namedUserLimit) || input.namedUserLimit <= 0) throw new CompanyWorkflowError(422, "Annual capacity limits must be positive.");
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new CompanyWorkflowError(404, "Company not found.");
  const trial = await db.companySubscription.findFirst({ where: { companyId, status: "Trial" }, orderBy: { expiresAt: "desc" } });
  if (trial && trial.expiresAt.getTime() > now.getTime()) throw new CompanyWorkflowError(409, "Annual activation is available after the 7-day trial expires.");
  const expiresAt = annualExpiry(now);
  const result = await db.$transaction(async (tx: any) => {
    const updated = await tx.company.update({ where: { id: companyId }, data: { status: "PaidActive" } });
    await tx.companySubscription.create({ data: { id: crypto.randomUUID(), companyId, plan: "Annual", status: "Active", startedAt: now, expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit, actionedById: actor.userId, actionedByEmail: actor.email } });
    await tx.auditLog.create({ data: { id: crypto.randomUUID(), actorId: actor.userId, companyId, action: "subscription.annual_activated", entityType: "CompanySubscription", after: { expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit, actorEmail: actor.email, superAdminId: actor.superAdminId } } });
    return updated;
  });
  const subscription = await db.companySubscription.findFirst({ where: { companyId, expiresAt }, orderBy: { createdAt: "desc" } });
  await cancelPendingCompanyNotifications(companyId, subscription?.id);
  if (subscription) await scheduleSubscriptionNotifications({ id: subscription.id, companyId, startedAt: now, expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit });
  const contact = await db.companyMembership.findFirst({ where: { companyId, role: "CompanyAdmin", status: "Active" }, include: { user: { select: { name: true, email: true } } } });
  if (contact?.user) void queueCompanyNotification({ companyId, kind: "SubscriptionActivated", recipient: contact.user.email, data: { companyName: result.name, adminName: contact.user.name, start: now, expiry: expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit }, dedupeKey: `${companyId}:SubscriptionActivated:${expiresAt.toISOString()}` }).catch(() => undefined);
  return result;
}

export async function renewAnnual(actorId: string, companyId: string, input: { pipelineKmLimit: number; namedUserLimit: number }, now = new Date()) {
  requireWorkflowEnabled(); await requireSuperAdmin(actorId); const db = dbOrThrow();
  const actor = await actorAttribution(db, actorId);
  const current = await db.companySubscription.findFirst({ where: { companyId }, orderBy: { expiresAt: "desc" } });
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new CompanyWorkflowError(404, "Company not found.");
  if (["SignupPending", "SignupRejected", "Suspended"].includes(company.status)) throw new CompanyWorkflowError(409, "This company is not eligible for annual renewal.");
  const start = annualRenewalStart(current?.expiresAt ?? null, now);
  const expiresAt = annualExpiry(start);
  const result = await db.$transaction(async (tx: any) => {
    const updated = await tx.company.update({ where: { id: companyId }, data: { status: "PaidActive" } });
    await tx.companySubscription.create({ data: { id: crypto.randomUUID(), companyId, plan: "Annual", status: "Active", startedAt: start, expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit, actionedById: actor.userId, actionedByEmail: actor.email } });
    await tx.auditLog.create({ data: { id: crypto.randomUUID(), actorId: actor.userId, companyId, action: "subscription.renewed", entityType: "CompanySubscription", entityId: undefined, after: { expiresAt, actorEmail: actor.email, superAdminId: actor.superAdminId } } });
    return updated;
  });
  const subscription = await db.companySubscription.findFirst({ where: { companyId, expiresAt }, orderBy: { createdAt: "desc" } });
  await cancelPendingCompanyNotifications(companyId, subscription?.id);
  if (subscription) await scheduleSubscriptionNotifications({ id: subscription.id, companyId, startedAt: start, expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit });
  const contact = await db.companyMembership.findFirst({ where: { companyId, role: "CompanyAdmin", status: "Active" }, include: { user: { select: { name: true, email: true } } } });
  if (contact?.user) void queueCompanyNotification({ companyId, subscriptionId: subscription?.id, kind: "SubscriptionRenewed", recipient: contact.user.email, data: { companyName: result.name, adminName: contact.user.name, start, expiry: expiresAt, pipelineKmLimit: input.pipelineKmLimit, namedUserLimit: input.namedUserLimit }, dedupeKey: `${companyId}:SubscriptionRenewed:${expiresAt.toISOString()}` }).catch(() => undefined);
  return result;
}

export async function redeemReferral(userId: string, code: string, now = new Date()) {
  requireWorkflowEnabled(); const db = dbOrThrow();
  return db.$transaction(async (tx: any) => {
    const referral = await tx.referralCode.findUnique({ where: { code } });
    if (!referral) throw new CompanyWorkflowError(404, "Referral code not found.");
    assertSingleUseReferral(referral.status, referral.expiresAt, now);
    const updated = await tx.referralCode.updateMany({ where: { id: referral.id, status: "Available", expiresAt: { gt: now } }, data: { status: "Redeemed", redeemedAt: now, redeemedByUserId: userId } });
    if (updated.count !== 1) throw new CompanyWorkflowError(409, "Referral code was already redeemed or expired.");
    await recordAudit(tx, { actorId: userId, action: "referral.redeemed", entityType: "ReferralCode", entityId: referral.id });
    return referral;
  });
}

export async function requireCompanyAccess(userId: string, companyId: string, now = new Date()) {
  requireWorkflowEnabled(); const db = dbOrThrow();
  const membership = await db.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId } } });
  if (!membership || membership.status !== "Active") throw new CompanyWorkflowError(403, "Company membership required.");
  const company = await db.company.findUnique({ where: { id: companyId } });
  const subscription = await db.companySubscription.findFirst({ where: { companyId }, orderBy: { expiresAt: "desc" } });
  if (!company || !canAccessCompany(company.status, subscription?.expiresAt ?? null, now)) throw new CompanyWorkflowError(403, "Company access is inactive or expired.");
  return { company, membership, subscription };
}

export async function enforceCapacity(companyId: string, requestedKm: number, addingUsers: number) {
  const db = dbOrThrow(); const subscription = await db.companySubscription.findFirst({ where: { companyId, status: "Active" }, orderBy: { expiresAt: "desc" } });
  if (!subscription) throw new CompanyWorkflowError(403, "Active annual subscription required.");
  const pipelines = await db.pipeline.findMany({ where: { companyId }, select: { pipeLengthKm: true } });
  const members = await db.companyMembership.count({ where: { companyId, status: "Active" } });
  assertCapacity(pipelines.reduce((sum: number, row: any) => sum + Number(row.pipeLengthKm || 0), 0), requestedKm, Number(subscription.pipelineKmLimit), members, addingUsers, subscription.namedUserLimit);
}

export async function enforcePipelineKmCapacity(companyId: string, deltaKm: number) {
  await enforceCapacity(companyId, deltaKm, 0);
}

export async function listCompanyUsers(actorId: string, companyId: string) {
  const db = dbOrThrow();
  const membership = await db.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId: actorId } } });
  if (!membership || membership.status !== "Active" || membership.role !== "CompanyAdmin") throw new CompanyWorkflowError(403, "Company Admin authorization required.");
  return db.companyMembership.findMany({ where: { companyId }, include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } }, orderBy: { createdAt: "asc" } });
}

export async function createCompanyUser(actorId: string, companyId: string, input: { name: string; email: string; role: "Engineer" | "Viewer" }) {
  requireWorkflowEnabled(); const db = dbOrThrow();
  const actor = await db.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId: actorId } } });
  if (!actor || actor.status !== "Active" || actor.role !== "CompanyAdmin") throw new CompanyWorkflowError(403, "Only a Company Admin can create company users.");
  await enforceCapacity(companyId, 0, 1);
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email || !["Engineer", "Viewer"].includes(input.role)) throw new CompanyWorkflowError(422, "Valid user name, email, and role are required.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new CompanyWorkflowError(409, "An account already exists for this email.");
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const user = await db.user.create({ data: { id: crypto.randomUUID(), name: input.name.trim(), email, passwordHash, role: input.role === "Engineer" ? "Engineer" : "Viewer" } });
  const membership = await db.companyMembership.create({ data: { id: crypto.randomUUID(), companyId, userId: user.id, role: input.role, status: "Active" } });
  await recordAudit(db, { actorId, companyId, action: "company.user_created", entityType: "CompanyMembership", entityId: membership.id, after: { userId: user.id, role: input.role } });
  return { id: user.id, name: user.name, email: user.email, role: input.role, membershipId: membership.id };
}

export async function deactivateCompanyUser(actorId: string, companyId: string, userId: string) {
  requireWorkflowEnabled(); const db = dbOrThrow();
  const actor = await db.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId: actorId } } });
  if (!actor || actor.status !== "Active" || actor.role !== "CompanyAdmin") throw new CompanyWorkflowError(403, "Only a Company Admin can deactivate company users.");
  const target = await db.companyMembership.findUnique({ where: { companyId_userId: { companyId, userId } } });
  if (!target || target.role === "CompanyAdmin") throw new CompanyWorkflowError(409, "The Company Admin membership cannot be deactivated here.");
  const updated = await db.companyMembership.update({ where: { id: target.id }, data: { status: "Inactive" } });
  await recordAudit(db, { actorId, companyId, action: "company.user_deactivated", entityType: "CompanyMembership", entityId: target.id, before: { status: target.status }, after: { status: updated.status } });
  return updated;
}
