import { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/jwt";
import { store } from "../data/store";
import { AuthUser } from "../types/domain";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

function getBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim() || null;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(request.header("Authorization"));

  if (!token || revokedTokens.has(token)) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await store.findUserById(payload.sub);

    if (!user) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    request.user = store.toAuthUser(user);
    request.token = token;
    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}
