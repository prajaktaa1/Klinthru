import { lookup } from "node:dns/promises";

import { env } from "../config/env";

const SENSITIVE_KEY = /authorization|token|secret|password|api[-_]?key|credential/i;
const MAX_RESPONSE_BYTES = 256 * 1024;
const TEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export class IntegrationSecurityError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "IntegrationSecurityError";
  }
}

export type ResolveHostname = (hostname: string) => Promise<string[]>;

export type RestAdapterOptions = {
  fetchImpl?: typeof fetch;
  resolveHostname?: ResolveHostname;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

export type RestTestResult = {
  ok: boolean;
  statusCode: number | null;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
};

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19));
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.") || normalized.startsWith("::ffff:169.254.");
}

function isIpAddress(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":");
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(child)
  ]));
}

export function redactText(value: string): string {
  return value.replace(/(authorization|token|secret|password|api[-_]?key|credential)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_KEY.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return url.toString();
  } catch {
    return "[INVALID_URL]";
  }
}

export function validateRestUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationSecurityError("INVALID_URL", "A valid HTTPS or HTTP endpoint is required.");
  }

  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || !url.hostname) {
    throw new IntegrationSecurityError("INVALID_URL", "Endpoint must use HTTP(S) without embedded credentials.");
  }

  return url;
}

export function isDevelopmentPrivateNetworkAllowed(): boolean {
  return env.nodeEnv === "development" && process.env.INTEGRATION_ALLOW_PRIVATE_NETWORKS === "true";
}

export async function assertSafeRestUrl(url: URL, resolveHostname: ResolveHostname): Promise<void> {
  if (isDevelopmentPrivateNetworkAllowed()) return;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost" || hostname.toLowerCase().endsWith(".localhost")) {
    throw new IntegrationSecurityError("SSRF_BLOCKED", "Endpoint resolves to a blocked network address.");
  }
  const addresses = isIpAddress(hostname) ? [hostname] : await resolveHostname(hostname);
  if (!addresses.length || addresses.some((address) => isBlockedIpv4(address) || isBlockedIpv6(address))) {
    throw new IntegrationSecurityError("SSRF_BLOCKED", "Endpoint resolves to a blocked network address.");
  }
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

async function readLimitedBody(response: Response, maxResponseBytes: number): Promise<void> {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > maxResponseBytes) throw new IntegrationSecurityError("RESPONSE_TOO_LARGE", "Connector response exceeds the size limit.");
  if (!response.body) return;

  const reader = response.body.getReader();
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      received += value.byteLength;
      if (received > maxResponseBytes) throw new IntegrationSecurityError("RESPONSE_TOO_LARGE", "Connector response exceeds the size limit.");
    }
  } finally {
    reader.releaseLock();
  }
}

export async function testRestConnector(endpoint: string, options: RestAdapterOptions = {}): Promise<RestTestResult> {
  const startedAt = Date.now();
  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? TEST_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;

  try {
    let url = validateRestUrl(endpoint);
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      await assertSafeRestUrl(url, resolveHostname);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.1" } });
      } finally {
        clearTimeout(timer);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new IntegrationSecurityError("INVALID_REDIRECT", "Connector redirect has no location.");
        url = new URL(location, url);
        continue;
      }

      await readLimitedBody(response, maxResponseBytes);
      return { ok: response.ok, statusCode: response.status, durationMs: Date.now() - startedAt, ...(response.ok ? {} : { errorCode: "HTTP_ERROR", errorMessage: `Endpoint returned HTTP ${response.status}.` }) };
    }
    throw new IntegrationSecurityError("TOO_MANY_REDIRECTS", "Connector exceeded the redirect limit.");
  } catch (error) {
    const securityError = error as IntegrationSecurityError;
    const timeout = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      statusCode: null,
      durationMs: Date.now() - startedAt,
      errorCode: securityError.code || (timeout ? "TIMEOUT" : "CONNECTION_ERROR"),
      errorMessage: securityError.message || "Connector test could not reach the endpoint."
    };
  }
}
