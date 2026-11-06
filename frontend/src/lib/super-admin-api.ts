import { getStoredAuthToken } from "@/lib/authStorage";

export type SuperAdminCompanyStatus = "SignupPending" | "SignupRejected" | "Approved" | "TrialActive" | "TrialExpired" | "PaidActive" | "PaidExpired" | "Suspended";
export type SuperAdminCompany = {
  id: string;
  name: string;
  mobileNumber: string;
  signupEmail: string;
  status: SuperAdminCompanyStatus;
  trialUsed: boolean;
  approvedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
};
export type SuperAdminReferral = {
  id: string;
  code: string;
  companyId: string | null;
  purpose: string | null;
  status: "Available" | "Redeemed" | "Expired" | "Revoked";
  generatedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
};
export type SuperAdminConfiguration = { plan: "Annual"; currency: string; price: string | null; trialDays: 7; paidDays: 365 };
export type SuperAdminRegistryEntry = { id: string; status: string; createdAt: string; source: "Environment" | "Database"; user: { id: string; name: string; email: string; role: string } };
export type CompanySubscription = { id: string; status: "Trial" | "Active" | "Expired" | "Cancelled"; startedAt: string; expiresAt: string; pipelineKmLimit: number; namedUserLimit: number };
export type CompanyDetail = SuperAdminCompany & { memberships: Array<{ id: string; role: string; status: string; user: { id: string; name: string; email: string; role: string } }>; subscriptions: CompanySubscription[]; referralCodes: SuperAdminReferral[] };
export type NotificationDelivery = { id: string; dedupeKey: string; companyId: string; subscriptionId: string | null; type: string; recipient: string; scheduledFor: string; status: string; attempts: number; providerMessageId: string | null; lastError: string | null; sentAt: string | null };
export type SuperAdminAuditLog = { id: string; action: string; companyId: string | null; before: unknown; after: unknown; createdAt: string; actor?: { name: string; email: string } | null; company?: { name: string } | null };
export type SuperAdminActivity = { auditLogs: SuperAdminAuditLog[]; notifications: NotificationDelivery[] };
export type LegacySuperAdminData = { status: "available"; companyMapping: string; mappedCompanyId: string | null; mappedPipelineIds: string[]; legacyAdmins: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>; pipelines: Array<{ id: string; pipelineCode: string; pipelineName: string; pipeLengthKm: number | null; createdById: string | null; companyId: string | null }> };
export type SuperAdminApi = {
  listCompanies(): Promise<SuperAdminCompany[]>;
  getCompany(companyId: string): Promise<CompanyDetail>;
  getConfiguration(): Promise<SuperAdminConfiguration>;
  listSuperadmins(): Promise<SuperAdminRegistryEntry[]>;
  createSuperadmin(input: { email: string; password: string }): Promise<SuperAdminRegistryEntry>;
  revokeSuperadmin(id: string): Promise<{ id: string; status: string }>;
  getLegacyData(): Promise<LegacySuperAdminData>;
  listActivity(companyId?: string): Promise<SuperAdminActivity>;
  generateReferral(input: { companyId?: string; purpose?: string }): Promise<SuperAdminReferral>;
  revokeReferral(code: string): Promise<SuperAdminReferral>;
  approveCompany(companyId: string): Promise<SuperAdminCompany>;
  activateTrial(companyId: string): Promise<SuperAdminCompany>;
  activateAnnual(companyId: string, input: { pipelineKmLimit: number; namedUserLimit: number }): Promise<SuperAdminCompany>;
  renewAnnual(companyId: string, input: { pipelineKmLimit: number; namedUserLimit: number }): Promise<SuperAdminCompany>;
};
export class SuperAdminApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "SuperAdminApiError";
  }
}

const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4002").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAuthToken();
  const csrf = typeof document === "undefined" ? "" : document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("klinthru_super_admin_csrf="))?.split("=")[1] || "";
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.method && init.method !== "GET" ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {}), ...(init?.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; code?: string };
    throw new SuperAdminApiError(body.message || `Super Admin request failed (${response.status}).`, response.status, body.code);
  }
  return response.json() as Promise<T>;
}

export const superAdminApi: SuperAdminApi = {
  listCompanies: () => request("/api/super-admin/companies"),
  getCompany: (companyId) => request(`/api/super-admin/companies/${encodeURIComponent(companyId)}`),
  getConfiguration: () => request("/api/super-admin/configuration"),
  listSuperadmins: () => request("/api/super-admin/superadmins"),
  createSuperadmin: (input) => request("/api/super-admin/superadmins", { method: "POST", body: JSON.stringify(input) }),
  revokeSuperadmin: (id) => request(`/api/super-admin/superadmins/${encodeURIComponent(id)}/revoke`, { method: "POST" }),
  getLegacyData: () => request("/api/super-admin/legacy-data"),
  listActivity: (companyId) => request(`/api/super-admin/activity${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`),
  generateReferral: (input) => request("/api/super-admin/referrals", { method: "POST", body: JSON.stringify(input) }),
  revokeReferral: (code) => request(`/api/super-admin/referrals/${encodeURIComponent(code)}/revoke`, { method: "POST" }),
  approveCompany: (companyId) => request(`/api/super-admin/companies/${encodeURIComponent(companyId)}/approve`, { method: "POST" }),
  activateTrial: (companyId) => request(`/api/super-admin/companies/${encodeURIComponent(companyId)}/activate-trial`, { method: "POST" }),
  activateAnnual: (companyId, input) => request(`/api/super-admin/companies/${encodeURIComponent(companyId)}/activate-annual`, { method: "POST", body: JSON.stringify(input) }),
  renewAnnual: (companyId, input) => request(`/api/super-admin/companies/${encodeURIComponent(companyId)}/renew`, { method: "POST", body: JSON.stringify(input) })
};
