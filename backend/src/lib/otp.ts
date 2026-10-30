import crypto from "crypto";

import { env } from "../config/env";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

type OtpPurpose = "login" | "signup";

type PendingSignup = {
  companyName: string;
  adminName: string;
  mobileNumber: string;
  email: string;
};

type OtpRecord = {
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  signup?: PendingSignup;
};

const otpRecords = new Map<string, OtpRecord>();

export class OtpCooldownError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Please wait before requesting another OTP.");
    this.name = "OtpCooldownError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class OtpVerificationError extends Error {
  constructor(message = "Invalid or expired OTP.") {
    super(message);
    this.name = "OtpVerificationError";
  }
}

function getOtpKey(email: string, purpose: OtpPurpose) {
  return `${purpose}:${email.toLowerCase()}`;
}

function hashOtp(email: string, purpose: OtpPurpose, otp: string) {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(`${purpose}:${email.toLowerCase()}:${otp}`)
    .digest("hex");
}

export function createOtp({
  email,
  purpose,
  signup
}: {
  email: string;
  purpose: OtpPurpose;
  signup?: PendingSignup;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const key = getOtpKey(normalizedEmail, purpose);
  const existing = otpRecords.get(key);
  const now = Date.now();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    throw new OtpCooldownError(Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000));
  }

  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  otpRecords.set(key, {
    email: normalizedEmail,
    purpose,
    otpHash: hashOtp(normalizedEmail, purpose, otp),
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
    signup
  });

  return {
    otp,
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    retryAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000
  };
}

export function verifyOtp({
  email,
  purpose,
  otp
}: {
  email: string;
  purpose: OtpPurpose;
  otp: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const key = getOtpKey(normalizedEmail, purpose);
  const record = otpRecords.get(key);
  const now = Date.now();

  if (!record || record.expiresAt < now) {
    otpRecords.delete(key);
    throw new OtpVerificationError();
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    otpRecords.delete(key);
    throw new OtpVerificationError("Too many invalid OTP attempts. Request a new code.");
  }

  record.attempts += 1;
  if (record.otpHash !== hashOtp(normalizedEmail, purpose, otp.trim())) {
    throw new OtpVerificationError();
  }

  otpRecords.delete(key);
  return record;
}
