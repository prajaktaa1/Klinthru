import type { CompanyDetail, LegacySuperAdminData, NotificationDelivery, SuperAdminActivity, SuperAdminApi, SuperAdminCompany, SuperAdminConfiguration, SuperAdminReferral, SuperAdminRegistryEntry } from "./super-admin-api";

type MockState = { companies: SuperAdminCompany[]; referrals: SuperAdminReferral[]; notifications: NotificationDelivery[] };

const now = new Date("2026-10-31T10:00:00.000Z");
const state: MockState = {
  companies: [
    { id: "mock-company-pending", name: "Northstar Integrity Demo", mobileNumber: "+971500001001", signupEmail: "admin@northstar.demo", status: "SignupPending", trialUsed: false, approvedAt: null, activatedAt: null, createdAt: "2026-10-30T09:00:00.000Z" },
    { id: "mock-company-active", name: "Klinthru Energy Demo", mobileNumber: "+971500001002", signupEmail: "sandeep@klinthru.demo", status: "PaidActive", trialUsed: true, approvedAt: "2026-10-01T09:00:00.000Z", activatedAt: "2026-10-01T10:00:00.000Z", createdAt: "2026-09-28T09:00:00.000Z" }
  ], referrals: [], notifications: []
};

function company(id: string): SuperAdminCompany { const found = state.companies.find(item => item.id === id); if (!found) throw new Error("Mock company not found."); return found; }
function detail(id: string): CompanyDetail { const item = company(id); return { ...item, memberships: [{ id: "mock-membership-admin", role: "CompanyAdmin", status: "Active", user: { id: "mock-user-sandeep", name: "Sandeep Patil", email: "sandeep@klinthru.demo", role: "Admin" } }], subscriptions: item.id === "mock-company-active" ? [{ id: "mock-subscription-annual", status: "Active", startedAt: "2026-10-01T10:00:00.000Z", expiresAt: "2027-10-01T10:00:00.000Z", pipelineKmLimit: 420, namedUserLimit: 12 }] : [], referralCodes: state.referrals.filter(referral => referral.companyId === id) }; }
function activity(): SuperAdminActivity { return { auditLogs: [], notifications: state.notifications }; }

export function createSuperAdminMockApi(): SuperAdminApi {
  return {
    async listCompanies() { return state.companies.map(item => ({ ...item })); },
    async getCompany(id) { return detail(id); },
    async getConfiguration(): Promise<SuperAdminConfiguration> { return { plan: "Annual", currency: "USD", price: null, trialDays: 7, paidDays: 365 }; },
    async listSuperadmins(): Promise<SuperAdminRegistryEntry[]> { return []; },
    async createSuperadmin(): Promise<SuperAdminRegistryEntry> { throw new Error("Superadmin provisioning is unavailable in mock mode."); },
    async revokeSuperadmin(): Promise<{ id: string; status: string }> { throw new Error("Superadmin revocation is unavailable in mock mode."); },
    async getLegacyData(): Promise<LegacySuperAdminData> { return { status: "available", companyMapping: "Company not yet mapped", mappedCompanyId: null, mappedPipelineIds: [], legacyAdmins: [{ id: "mock-legacy-admin", name: "Sandeep Patil", email: "sandeep@klinthru.demo", role: "Admin", createdAt: "2026-07-28T10:15:39.336Z" }], pipelines: [] }; },
    async listActivity() { return activity(); },
    async generateReferral(input) { const generatedAt = now.toISOString(); const referral: SuperAdminReferral = { id: `mock-referral-${state.referrals.length + 1}`, code: `KLIN-MOCK-${state.referrals.length + 1}`, companyId: input.companyId || null, purpose: input.purpose || "Invitation", status: "Available", generatedAt, expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(), redeemedAt: null }; state.referrals.push(referral); return referral; },
    async revokeReferral(code) { const referral = state.referrals.find(item => item.code === code); if (!referral) throw new Error("Mock referral not found."); referral.status = "Revoked"; return referral; },
    async approveCompany(id) { const item = company(id); if (item.status !== "SignupPending") throw new Error("Only pending companies can be approved."); item.status = "Approved"; item.approvedAt = now.toISOString(); return item; },
    async activateTrial(id) { const item = company(id); if (item.status !== "Approved" || item.trialUsed) throw new Error("Mock trial activation is not allowed in the current state."); item.status = "TrialActive"; item.trialUsed = true; item.activatedAt = now.toISOString(); return item; },
    async activateAnnual(id) { const item = company(id); item.status = "PaidActive"; item.activatedAt = now.toISOString(); return item; },
    async renewAnnual(id) { const item = company(id); item.status = "PaidActive"; item.activatedAt = now.toISOString(); return item; }
  };
}
