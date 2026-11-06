import bcrypt from "bcrypt";
import crypto from "crypto";
import { Router } from "express";

import { env } from "../config/env";
import { store } from "../data/store";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError, sendOtpEmail } from "../lib/email";
import { signToken } from "../lib/jwt";
import { createOtp, OtpCooldownError, OtpVerificationError, verifyOtp } from "../lib/otp";
import { requireAuth, revokeToken } from "../middleware/auth";
import { createPendingCompany } from "../superAdmin/service";
import { getPrismaClient } from "../lib/prisma";

export const authRouter = Router();

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function isPlatformSuperadmin(email: string, userId: string): Promise<boolean> {
  if (env.superAdminEmail && email === env.superAdminEmail) return true;
  const db = getPrismaClient();
  if (!db) return false;
  const account = await db.superAdmin.findUnique({ where: { userId }, select: { status: true } });
  return account?.status === "Active";
}

function respondWithToken(response: import("express").Response, user: Awaited<ReturnType<typeof store.findUserByEmail>>) {
  if (!user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const authUser = store.toAuthUser(user);
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  response.json({ token, user: authUser });
}

authRouter.post("/login", async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  if (!email || !password) {
    response.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = await store.findUserByEmail(email);
  if (!user) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  if (await isPlatformSuperadmin(email, user.id)) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const authUser = store.toAuthUser(user);
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  response.json({ token, user: authUser });
});

authRouter.post("/login/request-otp", async (request, response) => {
  const email = readString(request.body?.email).toLowerCase();

  if (!email || !isValidEmail(email)) {
    response.status(400).json({ message: "A valid email is required." });
    return;
  }

  const user = await store.findUserByEmail(email);
  if (!user) {
    response.status(404).json({ message: "No account exists for this email." });
    return;
  }

  if (await isPlatformSuperadmin(email, user.id)) {
    response.status(404).json({ message: "No account exists for this email." });
    return;
  }

  try {
    const otp = createOtp({ email, purpose: "login" });
    await sendOtpEmail({ email, otp: otp.otp, purpose: "login" });
    response.json({
      message: "OTP sent.",
      expiresInSeconds: otp.expiresInSeconds,
      retryAfterSeconds: otp.retryAfterSeconds
    });
  } catch (error) {
    if (error instanceof OtpCooldownError) {
      response.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
      return;
    }

    if (error instanceof EmailDeliveryNotConfiguredError) {
      response.status(503).json({ message: error.message });
      return;
    }

    if (error instanceof EmailDeliveryError) {
      response.status(502).json({ message: "The verification email could not be sent. Please try again later." });
      return;
    }

    throw error;
  }
});

authRouter.post("/login/verify-otp", async (request, response) => {
  const email = readString(request.body?.email).toLowerCase();
  const otp = readString(request.body?.otp);

  if (!email || !isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    response.status(400).json({ message: "A valid email and 6-digit OTP are required." });
    return;
  }

  try {
    verifyOtp({ email, purpose: "login", otp });
    const user = await store.findUserByEmail(email);
    respondWithToken(response, user);
  } catch (error) {
    if (error instanceof OtpVerificationError) {
      response.status(401).json({ message: error.message });
      return;
    }

    throw error;
  }
});

authRouter.post("/signup/request-otp", async (request, response) => {
  const companyName = readString(request.body?.companyName);
  const adminName = readString(request.body?.adminName);
  const mobileNumber = readString(request.body?.mobileNumber);
  const email = readString(request.body?.email).toLowerCase();

  if (!companyName || !adminName || !mobileNumber || !email || !isValidEmail(email)) {
    response.status(400).json({ message: "Company name, admin name, mobile number, and a valid email are required." });
    return;
  }

  const existing = await store.findUserByEmail(email);
  if (existing) {
    response.status(409).json({ message: "An account already exists for this email." });
    return;
  }

  try {
    const otp = createOtp({
      email,
      purpose: "signup",
      signup: { companyName, adminName, mobileNumber, email }
    });
    await sendOtpEmail({ email, otp: otp.otp, purpose: "signup" });
    response.json({
      message: "OTP sent.",
      expiresInSeconds: otp.expiresInSeconds,
      retryAfterSeconds: otp.retryAfterSeconds
    });
  } catch (error) {
    if (error instanceof OtpCooldownError) {
      response.status(429).json({ message: error.message, retryAfterSeconds: error.retryAfterSeconds });
      return;
    }

    if (error instanceof EmailDeliveryNotConfiguredError) {
      response.status(503).json({ message: error.message });
      return;
    }

    if (error instanceof EmailDeliveryError) {
      response.status(502).json({ message: "The verification email could not be sent. Please try again later." });
      return;
    }

    throw error;
  }
});

authRouter.post("/signup/verify-otp", async (request, response) => {
  const email = readString(request.body?.email).toLowerCase();
  const otp = readString(request.body?.otp);

  if (!email || !isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    response.status(400).json({ message: "A valid email and 6-digit OTP are required." });
    return;
  }

  try {
    const verified = verifyOtp({ email, purpose: "signup", otp });
    if (!verified.signup) {
      response.status(400).json({ message: "Signup verification session was not found." });
      return;
    }

    const existing = await store.findUserByEmail(email);
    if (existing) {
      respondWithToken(response, existing);
      return;
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const user = await store.createUser({
      name: verified.signup.adminName,
      email,
      passwordHash,
      role: "Admin"
    });
    if (env.companyWorkflowEnabled) {
      await createPendingCompany({ name: verified.signup.companyName, mobileNumber: verified.signup.mobileNumber, signupEmail: email, userId: user.id });
    }
    respondWithToken(response, user);
  } catch (error) {
    if (error instanceof OtpVerificationError) {
      response.status(401).json({ message: error.message });
      return;
    }

    throw error;
  }
});

authRouter.post("/logout", requireAuth, async (request, response) => {
  if (request.token) {
    revokeToken(request.token);
  }

  response.json({ message: "Logged out successfully." });
});

authRouter.get("/me", requireAuth, async (request, response) => {
  response.json(request.user);
});
