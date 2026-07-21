import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { JwtClaims } from "../types/domain";

const TOKEN_EXPIRY = "8h";

export function signToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.jwtSecret, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtClaims {
  return jwt.verify(token, env.jwtSecret) as JwtClaims;
}
