import bcrypt from "bcrypt";
import { Router } from "express";

import { store } from "../data/store";
import { signToken } from "../lib/jwt";
import { requireAuth, revokeToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim() : "";
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

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    response.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const authUser = store.toAuthUser(user);
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  response.json({ token, user: authUser });
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
