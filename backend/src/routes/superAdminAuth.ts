import { Router } from "express";
import { EmailDeliveryError, EmailDeliveryNotConfiguredError } from "../lib/email";
import { configured, getSession, logout, requireSuperAdminSession, resendChallenge, startPasswordChallenge, SuperAdminAuthError, verifyChallenge } from "../lib/superAdminAuth";

export const superAdminAuthRouter = Router();
function error(response: import("express").Response, reason: unknown): void { if (reason instanceof SuperAdminAuthError) { response.status(reason.status).json({ message: reason.message }); return; } if (reason instanceof EmailDeliveryNotConfiguredError) { response.status(503).json({ message: "Unable to send the verification code. Please try again later." }); return; } if (reason instanceof EmailDeliveryError) { response.status(502).json({ message: "Unable to send the verification code. Please try again later.", providerStatus: reason.providerStatus }); return; } response.status(500).json({ message: "Super Admin authentication failed." }); }

superAdminAuthRouter.post("/login", async (request, response) => { try { response.json(await startPasswordChallenge(request.body?.email, request.body?.password, response)); } catch (reason) { error(response, reason); } });
superAdminAuthRouter.post("/verify-otp", async (request, response) => { try { await verifyChallenge(request.body?.email, request.body?.otp, response); response.json({ authenticated: true }); } catch (reason) { error(response, reason); } });
superAdminAuthRouter.post("/resend-otp", async (request, response) => { try { response.json(await resendChallenge(request.body?.email)); } catch (reason) { error(response, reason); } });
superAdminAuthRouter.post("/logout", async (request, response) => { await logout(request, response); response.json({ loggedOut: true }); });
superAdminAuthRouter.get("/session", async (request, response) => { try { const session = await getSession(request); response.json({ authenticated: true, email: session.email, expiresAt: session.expiresAt }); } catch (reason) { error(response, reason); } });
superAdminAuthRouter.get("/configuration", (_request, response) => response.json({ configured }));
export { requireSuperAdminSession };
