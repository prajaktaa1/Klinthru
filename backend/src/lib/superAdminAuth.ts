import crypto from "crypto";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { env, isProduction } from "../config/env";
import { sendOtpEmail } from "./email";
import { getPrismaClient } from "./prisma";

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const MAX_PASSWORD_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_REQUESTS = 5;
const SESSION_COOKIE = "klinthru_super_admin_session";
const CSRF_COOKIE = "klinthru_super_admin_csrf";

type Challenge = { email: string; otpHash: string; expiresAt: number; attempts: number; otp?: string };
type Session = { email: string; expiresAt: number; csrf: string };
const challenges = new Map<string, Challenge>();
const passwordAttempts = new Map<string, number[]>();
const otpRequests = new Map<string, number[]>();

export class SuperAdminAuthError extends Error { constructor(public status: number, message: string) { super(message); } }

function normalizeEmail(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function validEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function hashOtp(email: string, otp: string): string { return crypto.createHmac("sha256", env.jwtSecret).update(`super-admin:${email}:${otp}`).digest("hex"); }
function readCookie(request: Request, name: string): string | null { const value = request.header("Cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`)); return value ? decodeURIComponent(value.slice(name.length + 1)) : null; }
function setCookie(response: Response, name: string, value: string, maxAge: number, httpOnly = true): void { response.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAge / 1000)}; Path=/;${httpOnly ? " HttpOnly;" : ""} SameSite=Strict${isProduction ? "; Secure" : ""}`); }
function clearCookie(response: Response, name: string): void { response.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${isProduction ? "; Secure" : ""}`); }
function consumeWindow(map: Map<string, number[]>, key: string, windowMs: number, limit: number): boolean { const now = Date.now(); const entries = (map.get(key) || []).filter(timestamp => now - timestamp < windowMs); if (entries.length >= limit) { map.set(key, entries); return false; } entries.push(now); map.set(key, entries); return true; }

export function configured(): boolean { return Boolean(env.superAdminEmail && env.superAdminPasswordHash); }

export async function startPasswordChallenge(emailInput: unknown, password: unknown, response: Response): Promise<{ expiresInSeconds: number; devOtp?: string }> {
  const email = normalizeEmail(emailInput);
  const secret = typeof password === "string" ? password : "";
  if (!validEmail(email) || !secret) throw new SuperAdminAuthError(401, "Invalid credentials.");
  if (!consumeWindow(passwordAttempts, email, PASSWORD_WINDOW_MS, MAX_PASSWORD_ATTEMPTS)) throw new SuperAdminAuthError(401, "Invalid credentials.");
  let passwordHash = email === env.superAdminEmail ? env.superAdminPasswordHash : "";
  if (!passwordHash) {
    const db = getPrismaClient();
    const account = db ? await db.superAdmin.findFirst({ where: { status: "Active", user: { email } }, select: { user: { select: { passwordHash: true } } } }) : null;
    passwordHash = account?.user.passwordHash || "";
  }
  if (!passwordHash || !(await bcrypt.compare(secret, passwordHash))) throw new SuperAdminAuthError(401, "Invalid credentials.");
  if (!consumeWindow(otpRequests, email, OTP_REQUEST_WINDOW_MS, MAX_OTP_REQUESTS)) throw new SuperAdminAuthError(429, "Too many OTP requests. Please try again later.");
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  challenges.set(email, { email, otpHash: hashOtp(email, otp), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, otp: env.superAdminDevShowOtp ? otp : undefined });
  await sendOtpEmail({ email, otp, purpose: "login" });
  return { expiresInSeconds: OTP_TTL_MS / 1000, ...(env.superAdminDevShowOtp ? { devOtp: otp } : {}) };
}

export async function resendChallenge(emailInput: unknown): Promise<{ expiresInSeconds: number; devOtp?: string }> {
  const email = normalizeEmail(emailInput); const existing = challenges.get(email);
  if (!existing || existing.expiresAt < Date.now()) throw new SuperAdminAuthError(400, "Request a new sign-in code.");
  if (!consumeWindow(otpRequests, email, OTP_REQUEST_WINDOW_MS, MAX_OTP_REQUESTS)) throw new SuperAdminAuthError(429, "Too many OTP requests. Please try again later.");
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  challenges.set(email, { email, otpHash: hashOtp(email, otp), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, otp: env.superAdminDevShowOtp ? otp : undefined });
  await sendOtpEmail({ email, otp, purpose: "login" });
  return { expiresInSeconds: OTP_TTL_MS / 1000, ...(env.superAdminDevShowOtp ? { devOtp: otp } : {}) };
}

export async function verifyChallenge(emailInput: unknown, otpInput: unknown, response: Response): Promise<void> {
  const email = normalizeEmail(emailInput); const otp = typeof otpInput === "string" ? otpInput.trim() : ""; const challenge = challenges.get(email);
  if (!challenge || challenge.expiresAt < Date.now()) { challenges.delete(email); throw new SuperAdminAuthError(401, "Invalid or expired OTP."); }
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) { challenges.delete(email); throw new SuperAdminAuthError(401, "Too many invalid OTP attempts. Request a new code."); }
  challenge.attempts += 1;
  if (!/^\d{6}$/.test(otp) || !crypto.timingSafeEqual(Buffer.from(challenge.otpHash), Buffer.from(hashOtp(email, otp)))) throw new SuperAdminAuthError(401, "Invalid or expired OTP.");
  const db = getPrismaClient();
  if (db) {
    const account = await db.superAdmin.findFirst({ where: { status: "Active", user: { email } }, select: { id: true } });
    if (!account && email !== env.superAdminEmail) throw new SuperAdminAuthError(403, "Super Admin access has been revoked.");
  }
  challenges.delete(email);
  const sessionId = crypto.randomBytes(32).toString("base64url"); const csrf = crypto.randomBytes(24).toString("base64url");
  if (!db) throw new SuperAdminAuthError(503, "Session storage is unavailable.");
  await db.superAdminSession.create({ data: { id: sessionId, email, expiresAt: new Date(Date.now() + SESSION_TTL_MS), csrf } });
  setCookie(response, SESSION_COOKIE, sessionId, SESSION_TTL_MS); setCookie(response, CSRF_COOKIE, csrf, SESSION_TTL_MS, false);
}

export async function requireSuperAdminSession(request: Request, response: Response, mutation = false): Promise<string> {
  const sessionId = readCookie(request, SESSION_COOKIE); const db = getPrismaClient(); const session = sessionId && db ? await db.superAdminSession.findUnique({ where: { id: sessionId } }) : undefined;
  if (!session || session.expiresAt.getTime() < Date.now()) { if (sessionId && db) await db.superAdminSession.deleteMany({ where: { id: sessionId } }); throw new SuperAdminAuthError(401, "Super Admin authentication required."); }
  if (mutation && request.header("X-CSRF-Token") !== session.csrf) throw new SuperAdminAuthError(403, "CSRF validation failed.");
  return session.email;
}

export async function logout(request: Request, response: Response): Promise<void> { const sessionId = readCookie(request, SESSION_COOKIE); const db = getPrismaClient(); if (sessionId && db) await db.superAdminSession.deleteMany({ where: { id: sessionId } }); clearCookie(response, SESSION_COOKIE); clearCookie(response, CSRF_COOKIE); }
export async function getSession(request: Request): Promise<{ email: string; expiresAt: number }> { const sessionId = readCookie(request, SESSION_COOKIE); const db = getPrismaClient(); const session = sessionId && db ? await db.superAdminSession.findUnique({ where: { id: sessionId } }) : undefined; if (!session || session.expiresAt.getTime() < Date.now()) throw new SuperAdminAuthError(401, "Super Admin authentication required."); return { email: session.email, expiresAt: session.expiresAt.getTime() }; }
export const superAdminCookieNames = { session: SESSION_COOKIE, csrf: CSRF_COOKIE };
