import { Request, Router } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { getPrismaClient } from "../lib/prisma";
import { queueCompanyNotification } from "../superAdmin/notifications";

export const publicSubmissionsRouter = Router();

const submissionSchema = z.object({
  type: z.enum(["enquiry", "support"]), name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), topic: z.string().trim().max(180).optional().default(""), platform: z.string().trim().max(80).optional().default(""), message: z.string().trim().min(1).max(5000)
});
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000; const MAX_ATTEMPTS = 5;
function requestKey(request: Request): string { const forwarded = request.headers["x-forwarded-for"]; return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || request.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function rateLimited(key: string): boolean { const now = Date.now(); const current = attempts.get(key); if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return false; } current.count += 1; return current.count > MAX_ATTEMPTS; }

publicSubmissionsRouter.post("/", async (request, response, next) => {
  try {
    if (rateLimited(requestKey(request))) { response.status(429).json({ message: "Too many submissions. Please try again later." }); return; }
    const parsed = submissionSchema.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ message: "Please check the submitted fields." }); return; }
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Submission service is unavailable." }); return; }
    const value = parsed.data; const isSupport = value.type === "support"; const companyRecipient = isSupport ? env.supportEmailTo : env.enquiryEmailTo;
    if (!companyRecipient) { response.status(503).json({ message: "Submission service is not configured." }); return; }
    const submission = await db.publicSubmission.create({ data: { type: isSupport ? "Support" : "Enquiry", name: value.name, email: value.email.toLowerCase(), topic: value.topic || null, platform: value.platform || null, message: value.message } });
    const data = { name: submission.name, email: submission.email, topic: submission.topic || undefined, platform: submission.platform || undefined, message: submission.message };
    const customerKind = isSupport ? "SupportAcknowledgement" : "EnquiryAcknowledgement"; const companyKind = isSupport ? "SupportNotification" : "EnquiryNotification";
    await Promise.all([queueCompanyNotification({ publicSubmissionId: submission.id, kind: customerKind, recipient: submission.email, data, dedupeKey: `${submission.id}:${customerKind}` }), queueCompanyNotification({ publicSubmissionId: submission.id, kind: companyKind, recipient: companyRecipient, data, dedupeKey: `${submission.id}:${companyKind}` })]);
    response.status(201).json({ message: "Your message was received." });
  } catch (error) { next(error); }
});
