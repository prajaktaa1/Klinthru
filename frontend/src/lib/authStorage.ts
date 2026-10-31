const AUTH_TOKEN_KEY = "klinthru-auth-token";

type JwtPayload = { exp?: unknown };

function readJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as unknown;
    return payload && typeof payload === "object" ? payload as JwtPayload : null;
  } catch {
    return null;
  }
}

function isUsableToken(token: string): boolean {
  const payload = readJwtPayload(token);
  return payload?.exp === undefined || (typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000));
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const candidates = [
    window.localStorage.getItem(AUTH_TOKEN_KEY),
    window.sessionStorage.getItem(AUTH_TOKEN_KEY)
  ].filter((token): token is string => Boolean(token));
  const usable = candidates.find(isUsableToken);
  if (usable) return usable;

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  return null;
}

export function setStoredAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
