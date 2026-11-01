import crypto from "crypto";

import { env } from "../config/env";
import { EmailDeliveryError, sendTransactionalEmail } from "../lib/email";
import { getPrismaClient } from "../lib/prisma";
import { addUtcDays } from "./domain";

export type NotificationKind = "CompanyWelcome" | "TrialActivated" | "TrialExpiryReminder2" | "TrialExpired" | "SubscriptionActivated" | "RenewalReminder30" | "RenewalReminder10" | "RenewalReminder7" | "SubscriptionExpired" | "SubscriptionRenewed" | "EnquiryAcknowledgement" | "EnquiryNotification" | "SupportAcknowledgement" | "SupportNotification";
export const NOTIFICATION_CLAIM_LEASE_MS = 5 * 60 * 1000;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character] as string));
}

function dateText(value: Date): string { return value.toISOString().replace("T", " ").replace(".000Z", " UTC"); }

export function renderNotification(kind: NotificationKind, input: { companyName: string; adminName?: string; start?: Date; expiry?: Date; pipelineKmLimit?: number; namedUserLimit?: number; remainingDays?: number }) {
  const companyName = escapeHtml(input.companyName); const adminName = escapeHtml(input.adminName || "Company Admin");
  const start = input.start ? dateText(input.start) : ""; const expiry = input.expiry ? dateText(input.expiry) : "";
  let subject = "Klinthru company update"; let title = "Klinthru update"; let body = ""; let text = "";
  if (kind === "CompanyWelcome") { subject = "Klinthru registration received"; title = "Registration received"; body = `<p>Hello ${adminName},</p><p>We received the registration for <strong>${companyName}</strong>. Your company request is pending Super Admin approval. The trial has not started.</p>`; text = `Hello ${input.adminName || "Company Admin"},\n\nWe received the registration for ${input.companyName}. It is pending Super Admin approval. The trial has not started.`; }
  if (kind === "TrialActivated") { subject = "Your Klinthru trial is active"; title = "Seven-day trial activated"; body = `<p>Hello ${adminName},</p><p>The trial for <strong>${companyName}</strong> started on <strong>${escapeHtml(start)}</strong> and expires on <strong>${escapeHtml(expiry)}</strong>.</p><p>Access will be blocked after expiry unless a Super Admin activates the annual plan.</p>`; text = `The trial for ${input.companyName} started on ${start} and expires on ${expiry}. Access will be blocked after expiry unless a Super Admin activates the annual plan.`; }
  if (kind === "TrialExpiryReminder2") { subject = "Klinthru trial expires in 2 days"; title = "Trial expiry reminder"; body = `<p>Hello ${adminName},</p><p>The seven-day trial for <strong>${companyName}</strong> expires on <strong>${escapeHtml(expiry)}</strong>, in two days.</p><p>Access will be blocked after expiry unless a Super Admin activates the annual plan.</p>`; text = `The seven-day trial for ${input.companyName} expires on ${expiry}, in two days. Access will be blocked after expiry unless a Super Admin activates the annual plan.`; }
  if (kind === "TrialExpired") { subject = "Klinthru trial expired"; title = "Trial access is blocked"; body = `<p>The seven-day trial for <strong>${companyName}</strong> has expired. Application access is blocked, but your company data remains preserved. Paid access requires manual Super Admin activation.</p>`; text = `The seven-day trial for ${input.companyName} has expired. Application access is blocked, but company data remains preserved. Paid access requires manual Super Admin activation.`; }
  if (kind === "SubscriptionActivated" || kind === "SubscriptionRenewed") { subject = kind === "SubscriptionRenewed" ? "Klinthru annual subscription renewed" : "Klinthru annual subscription activated"; title = kind === "SubscriptionRenewed" ? "Annual subscription renewed" : "Annual subscription activated"; body = `<p>Hello ${adminName},</p><p>The annual plan for <strong>${companyName}</strong> is valid from <strong>${escapeHtml(start)}</strong> through <strong>${escapeHtml(expiry)}</strong>.</p><p>Purchased capacity: ${escapeHtml(input.pipelineKmLimit)} pipeline km and ${escapeHtml(input.namedUserLimit)} named users.</p>`; text = `The annual plan for ${input.companyName} is valid from ${start} through ${expiry}. Purchased capacity: ${input.pipelineKmLimit} pipeline km and ${input.namedUserLimit} named users.`; }
  if (kind.startsWith("RenewalReminder")) { subject = `Klinthru renewal reminder: ${input.remainingDays} days remaining`; title = "Annual renewal reminder"; body = `<p>Hello ${adminName},</p><p>The annual subscription for <strong>${companyName}</strong> expires on <strong>${escapeHtml(expiry)}</strong>, with ${escapeHtml(input.remainingDays)} days remaining.</p><p>Please contact Klinthru support or your Super Admin to renew. Renewal is manually controlled by Super Admin.</p>`; text = `The annual subscription for ${input.companyName} expires on ${expiry}, with ${input.remainingDays} days remaining. Contact Klinthru support or your Super Admin to renew.`; }
  if (kind === "SubscriptionExpired") { subject = "Klinthru subscription expired"; title = "Subscription access is blocked"; body = `<p>The annual subscription for <strong>${companyName}</strong> has expired. Application access is blocked while your data remains preserved. A Super Admin must renew the subscription.</p>`; text = `The annual subscription for ${input.companyName} has expired. Application access is blocked while data remains preserved. A Super Admin must renew the subscription.`; }
  const logoUrl = escapeHtml(env.emailLogoUrl);
  const details: Array<[string, string]> = [["Company", companyName]];
  if (start) details.push([kind === "TrialActivated" ? "Trial started" : "Plan started", start]);
  if (expiry) details.push([kind === "TrialActivated" || kind === "TrialExpiryReminder2" || kind === "TrialExpired" ? "Trial expiry" : "Subscription expiry", expiry]);
  if (input.remainingDays !== undefined) details.push(["Days remaining", escapeHtml(input.remainingDays)]);
  if (input.pipelineKmLimit !== undefined) details.push(["Pipeline capacity", `${escapeHtml(input.pipelineKmLimit)} km`]);
  if (input.namedUserLimit !== undefined) details.push(["Named-user capacity", escapeHtml(input.namedUserLimit)]);
  const detailRows = details.map(([label, value]) => `<tr><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#59717b;font-size:13px;width:42%">${label}</td><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#15313d;font-weight:700;font-size:14px">${value}</td></tr>`).join("");
  const actionLabel = kind === "CompanyWelcome" ? "Review registration" : "Open Klinthru";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f3f7f8;color:#15313d;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f7f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dce8eb;border-radius:14px;overflow:hidden"><tr><td style="background:#123441;padding:25px 30px"><img src="${logoUrl}" alt="Klinthru" width="190" style="display:block;width:190px;max-width:100%;height:auto;border:0"><div style="color:#9bd9d4;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;margin-top:20px">Pipeline integrity intelligence</div></td></tr><tr><td style="padding:34px 34px 10px"><div style="color:#087e7c;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">${escapeHtml(kind.replace(/([A-Z])/g, " $1").trim())}</div><h1 style="margin:0;color:#123441;font-size:28px;line-height:1.2;font-weight:700">${title}</h1></td></tr><tr><td style="padding:8px 34px 24px;font-size:16px;line-height:1.65;color:#39525d">${body}</td></tr><tr><td style="padding:0 34px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f7f8;border:1px solid #dce8eb;border-radius:10px;padding:4px 16px"><tr><td colspan="2" style="padding:15px 0 5px;color:#123441;font-size:14px;font-weight:700">Account details</td></tr>${detailRows}</table></td></tr><tr><td style="padding:0 34px 34px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:7px;background:#087e7c"><a href="${escapeHtml("https://klinthru.com/login")}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${actionLabel}</a></td></tr></table></td></tr><tr><td style="background:#eef5f6;padding:22px 34px;color:#59717b;font-size:12px;line-height:1.6"><strong style="color:#123441">Klinthru</strong> · Pipeline Integrity Intelligence<br>Please contact your Klinthru support team for renewal assistance.<br><a href="https://klinthru.com" style="color:#087e7c;text-decoration:none">klinthru.com</a></td></tr></table></td></tr></table><!-- KLINTHRU_TEST_BANNER_SLOT --></body></html>`;
  return { subject, html, text };
}

export function renderPublicSubmissionNotification(kind: Extract<NotificationKind, "EnquiryAcknowledgement" | "EnquiryNotification" | "SupportAcknowledgement" | "SupportNotification">, input: { name: string; email: string; topic?: string; platform?: string; message: string }) {
  const name = escapeHtml(input.name); const email = escapeHtml(input.email); const topic = escapeHtml(input.topic || "Not provided"); const platform = escapeHtml(input.platform || "Not provided"); const message = escapeHtml(input.message);
  const isSupport = kind.startsWith("Support"); const isCustomer = kind.endsWith("Acknowledgement");
  const subject = isCustomer ? `Klinthru ${isSupport ? "support" : "enquiry"} received` : `New Klinthru ${isSupport ? "support request" : "business enquiry"}`;
  const title = isCustomer ? "Message received" : `New ${isSupport ? "support request" : "business enquiry"}`;
  const body = isCustomer ? `<p>Hello ${name},</p><p>We received your ${isSupport ? "support request" : "enquiry"}. A Klinthru team member will review it and respond using this email address.</p>` : `<p>A new ${isSupport ? "support request" : "business enquiry"} was submitted through the Klinthru public website.</p>`;
  const text = isCustomer ? `Hello ${input.name},\n\nWe received your ${isSupport ? "support request" : "enquiry"}. A Klinthru team member will review it and respond using this email address.` : `New ${isSupport ? "support request" : "business enquiry"} from ${input.name} (${input.email}).\nTopic: ${input.topic || "Not provided"}\nPlatform: ${input.platform || "Not provided"}\n\n${input.message}`;
  const details = `<tr><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#59717b;font-size:13px;width:32%">Name</td><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#15313d;font-weight:700;font-size:14px">${name}</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#59717b;font-size:13px">Email</td><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#15313d;font-weight:700;font-size:14px">${email}</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#59717b;font-size:13px">Topic</td><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#15313d;font-weight:700;font-size:14px">${topic}</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#59717b;font-size:13px">Platform</td><td style="padding:11px 0;border-bottom:1px solid #dce8eb;color:#15313d;font-weight:700;font-size:14px">${platform}</td></tr><tr><td style="padding:11px 0;color:#59717b;font-size:13px;vertical-align:top">Message</td><td style="padding:11px 0;color:#15313d;font-size:14px;white-space:pre-wrap">${message}</td></tr>`;
  const logoUrl = escapeHtml(env.emailLogoUrl);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f3f7f8;color:#15313d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f7f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dce8eb;border-radius:14px;overflow:hidden"><tr><td style="background:#123441;padding:25px 30px"><img src="${logoUrl}" alt="Klinthru" width="190" style="display:block;width:190px;max-width:100%;height:auto;border:0"><div style="color:#9bd9d4;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;margin-top:20px">Pipeline integrity intelligence</div></td></tr><tr><td style="padding:34px 34px 10px"><div style="color:#087e7c;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">${isSupport ? "Support" : "Enquiry"}</div><h1 style="margin:0;color:#123441;font-size:28px;line-height:1.2;font-weight:700">${title}</h1></td></tr><tr><td style="padding:8px 34px 24px;font-size:16px;line-height:1.65;color:#39525d">${body}</td></tr><tr><td style="padding:0 34px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f3f7f8;border:1px solid #dce8eb;border-radius:10px;padding:4px 16px">${details}</table></td></tr><tr><td style="background:#eef5f6;padding:22px 34px;color:#59717b;font-size:12px;line-height:1.6"><strong style="color:#123441">Klinthru</strong> · Pipeline Integrity Intelligence<br>Please contact the Klinthru support team for assistance.<br><a href="https://klinthru.com" style="color:#087e7c;text-decoration:none">klinthru.com</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export function subscriptionReminderSchedule(expiresAt: Date) {
  return ([30, 10, 7] as const).map(days => ({ days, kind: `RenewalReminder${days}` as "RenewalReminder30" | "RenewalReminder10" | "RenewalReminder7", scheduledFor: new Date(expiresAt.getTime() - days * 24 * 60 * 60 * 1000) }));
}

function dbOrThrow() { const db = getPrismaClient(); if (!db) throw new Error("Notification database unavailable."); return db as any; }

export async function queueCompanyNotification(input: { companyId?: string; publicSubmissionId?: string; subscriptionId?: string; kind: NotificationKind; recipient: string; data: Parameters<typeof renderNotification>[1] | Parameters<typeof renderPublicSubmissionNotification>[1]; scheduledFor?: Date; dedupeKey?: string; content?: { subject: string; html: string; text: string } }) {
  const db = dbOrThrow(); const scheduledFor = input.scheduledFor || new Date();
  const dedupeKey = input.dedupeKey || `${input.companyId}:${input.subscriptionId || "company"}:${input.kind}:${scheduledFor.toISOString()}`;
  const content = input.content || (input.kind === "EnquiryAcknowledgement" || input.kind === "EnquiryNotification" || input.kind === "SupportAcknowledgement" || input.kind === "SupportNotification" ? renderPublicSubmissionNotification(input.kind, input.data as Parameters<typeof renderPublicSubmissionNotification>[1]) : renderNotification(input.kind, input.data as Parameters<typeof renderNotification>[1]));
  const existing = await db.notificationDelivery.findUnique({ where: { dedupeKey } });
  if (existing) return existing;
  let delivery;
  try {
    delivery = await db.notificationDelivery.create({ data: { id: crypto.randomUUID(), dedupeKey, companyId: input.companyId, publicSubmissionId: input.publicSubmissionId, subscriptionId: input.subscriptionId, type: input.kind, recipient: input.recipient, payload: content, scheduledFor, status: "Pending" } });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    delivery = await db.notificationDelivery.findUnique({ where: { dedupeKey } });
    if (!delivery) throw error;
  }
  if (scheduledFor.getTime() <= Date.now()) await deliverNotification(delivery.id, content);
  return delivery;
}

export async function deliverNotification(id: string, content?: { subject: string; html: string; text: string }) {
  const db = dbOrThrow(); const delivery = await db.notificationDelivery.findUnique({ where: { id } }); if (!delivery || delivery.status === "Sent" || delivery.status === "Cancelled") return delivery;
  const now = new Date();
  const locked = await db.notificationDelivery.updateMany({ where: { id, scheduledFor: { lte: now }, OR: [{ status: { in: ["Pending", "Failed"] } }, { status: "Sending", claimExpiresAt: { lte: now } }] }, data: { status: "Sending", claimExpiresAt: new Date(now.getTime() + NOTIFICATION_CLAIM_LEASE_MS), attempts: { increment: 1 } } });
  if (locked.count !== 1) return delivery;
  try {
    const message = content || delivery.payload as { subject: string; html: string; text: string };
    const providerMessageId = await sendTransactionalEmail({ to: delivery.recipient, subject: message.subject, html: message.html, text: message.text });
    return db.notificationDelivery.update({ where: { id }, data: { status: "Sent", claimExpiresAt: null, providerMessageId, sentAt: new Date(), lastError: null } });
  } catch (error) {
    const attempts = Number(delivery.attempts || 0) + 1; const nextAttemptAt = addUtcDays(new Date(), 0); nextAttemptAt.setMinutes(nextAttemptAt.getMinutes() + Math.min(60, attempts * 5));
    return db.notificationDelivery.update({ where: { id }, data: { status: "Failed", claimExpiresAt: null, lastError: error instanceof Error ? error.message : "Delivery failed", nextAttemptAt } });
  }
}

async function companyAdminContact(db: any, companyId: string) {
  const membership = await db.companyMembership.findFirst({ where: { companyId, role: "CompanyAdmin", status: "Active" }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } });
  return membership?.user ? { name: membership.user.name, email: membership.user.email } : null;
}

export async function scheduleSubscriptionNotifications(subscription: { id: string; companyId: string; startedAt: Date; expiresAt: Date; pipelineKmLimit: unknown; namedUserLimit: number }) {
  const db = dbOrThrow(); const contact = await companyAdminContact(db, subscription.companyId); if (!contact) return;
  const company = await db.company.findUnique({ where: { id: subscription.companyId }, select: { name: true } }); if (!company) return;
  for (const reminder of subscriptionReminderSchedule(subscription.expiresAt)) {
    await queueCompanyNotification({ companyId: subscription.companyId, subscriptionId: subscription.id, kind: reminder.kind, recipient: contact.email, data: { companyName: company.name, adminName: contact.name, expiry: subscription.expiresAt, remainingDays: reminder.days }, scheduledFor: reminder.scheduledFor, dedupeKey: `${subscription.id}:${reminder.kind}` });
  }
  await queueCompanyNotification({ companyId: subscription.companyId, subscriptionId: subscription.id, kind: "SubscriptionExpired", recipient: contact.email, data: { companyName: company.name, adminName: contact.name, expiry: subscription.expiresAt }, scheduledFor: subscription.expiresAt, dedupeKey: `${subscription.id}:SubscriptionExpired` });
}

export async function cancelPendingCompanyNotifications(companyId: string, exceptSubscriptionId?: string) {
  const db = dbOrThrow();
  await db.notificationDelivery.updateMany({ where: { companyId, status: { in: ["Pending", "Failed"] }, ...(exceptSubscriptionId ? { subscriptionId: { not: exceptSubscriptionId } } : {}) }, data: { status: "Cancelled", claimExpiresAt: null } });
}

export async function runNotificationScheduler(now = new Date(), limit = 100) {
  const db = dbOrThrow();
  const due = await db.notificationDelivery.findMany({ where: { scheduledFor: { lte: now }, OR: [{ status: { in: ["Pending", "Failed"] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] }, { status: "Sending", claimExpiresAt: { lte: now } }] }, orderBy: { scheduledFor: "asc" }, take: limit });
  for (const delivery of due) await deliverNotification(delivery.id);
  return due.length;
}
