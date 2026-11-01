export type CompanyAccessState = "SignupPending" | "SignupRejected" | "Approved" | "TrialActive" | "TrialExpired" | "PaidActive" | "PaidExpired" | "Suspended";

export type CompanyPlan = "Annual";

export const TRIAL_DAYS = 7;
export const ANNUAL_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export function addUtcDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

export function trialExpiry(startedAt: Date): Date {
  return addUtcDays(startedAt, TRIAL_DAYS);
}

export function annualExpiry(startedAt: Date): Date {
  return addUtcDays(startedAt, ANNUAL_DAYS);
}

export function annualRenewalStart(currentExpiry: Date | null, now = new Date()): Date {
  return currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
}

export function referralExpiry(generatedAt: Date): Date {
  return addUtcDays(generatedAt, TRIAL_DAYS);
}

export function effectiveAccessState(state: CompanyAccessState, expiresAt: Date | null, now = new Date()): CompanyAccessState {
  if (state === "TrialActive" && expiresAt && now.getTime() >= expiresAt.getTime()) return "TrialExpired";
  if (state === "PaidActive" && expiresAt && now.getTime() >= expiresAt.getTime()) return "PaidExpired";
  return state;
}

export function canAccessCompany(state: CompanyAccessState, expiresAt: Date | null, now = new Date()): boolean {
  const effective = effectiveAccessState(state, expiresAt, now);
  return effective === "TrialActive" || effective === "PaidActive";
}

export function canTransition(from: CompanyAccessState, to: CompanyAccessState): boolean {
  return (
    (from === "SignupPending" && to === "Approved") ||
    (from === "Approved" && to === "TrialActive") ||
    (from === "TrialActive" && to === "TrialExpired") ||
    (from === "TrialActive" && to === "PaidActive") ||
    (from === "TrialExpired" && to === "PaidActive") ||
    (from === "PaidActive" && to === "PaidExpired") ||
    (from === "PaidExpired" && to === "PaidActive") ||
    (to === "Suspended" && from !== "Suspended") ||
    (from === "Suspended" && (to === "Approved" || to === "TrialActive" || to === "PaidActive"))
  );
}

export function assertCapacity(currentKm: number, requestedKm: number, limitKm: number, currentUsers: number, addingUsers: number, userLimit: number): void {
  if (!Number.isFinite(requestedKm) || currentKm + requestedKm < 0 || currentKm + requestedKm > limitKm) {
    throw new Error("Purchased pipeline kilometre limit exceeded.");
  }
  if (!Number.isInteger(addingUsers) || addingUsers < 0 || currentUsers + addingUsers > userLimit) {
    throw new Error("Purchased named-user limit exceeded.");
  }
}

export function assertSingleUseReferral(status: "Available" | "Redeemed" | "Expired" | "Revoked", expiresAt: Date, now = new Date()): void {
  if (status !== "Available") throw new Error("Referral code is no longer available.");
  if (now.getTime() >= expiresAt.getTime()) throw new Error("Referral code has expired.");
}

export function assertTrialCanStart(approved: boolean, trialUsed: boolean): void {
  if (!approved) throw new Error("Company approval is required before trial activation.");
  if (trialUsed) throw new Error("A second trial is not allowed.");
}
