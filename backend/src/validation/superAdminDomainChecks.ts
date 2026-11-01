import assert from "node:assert/strict";
import {
  annualExpiry,
  annualRenewalStart,
  assertCapacity,
  assertSingleUseReferral,
  assertTrialCanStart,
  canAccessCompany,
  canTransition,
  referralExpiry,
  trialExpiry
} from "../superAdmin/domain";
import { canAccessOwner } from "../lib/access";

function expectFailure(action: () => void, message: string) {
  assert.throws(action, new RegExp(message));
}

const start = new Date("2026-01-01T00:00:00.000Z");
assert.equal(trialExpiry(start).toISOString(), "2026-01-08T00:00:00.000Z");
assert.equal(referralExpiry(start).toISOString(), "2026-01-08T00:00:00.000Z");
assert.equal(annualExpiry(start).toISOString(), "2027-01-01T00:00:00.000Z");
const earlyRenewalNow = new Date("2026-06-01T00:00:00.000Z");
const existingExpiry = new Date("2026-12-31T00:00:00.000Z");
assert.equal(annualRenewalStart(existingExpiry, earlyRenewalNow), existingExpiry);
assert.equal(annualExpiry(annualRenewalStart(existingExpiry, earlyRenewalNow)).toISOString(), "2027-12-31T00:00:00.000Z");
assert.equal(annualRenewalStart(existingExpiry, existingExpiry), existingExpiry);
const expiredAt = new Date("2026-05-31T23:59:59.999Z");
assert.equal(annualRenewalStart(expiredAt, earlyRenewalNow), earlyRenewalNow);
assert.equal(annualExpiry(annualRenewalStart(expiredAt, earlyRenewalNow)).toISOString(), "2027-06-01T00:00:00.000Z");
assert.equal(canAccessCompany("TrialActive", trialExpiry(start), new Date("2026-01-07T23:59:59.999Z")), true);
assert.equal(canAccessCompany("TrialActive", trialExpiry(start), new Date("2026-01-08T00:00:00.000Z")), false);
assert.equal(canAccessCompany("PaidExpired", annualExpiry(start)), false);
assert.equal(canTransition("SignupPending", "Approved"), true);
assert.equal(canTransition("SignupPending", "TrialActive"), false);
assert.equal(canTransition("TrialExpired", "TrialActive"), false);
assert.equal(canTransition("TrialExpired", "PaidActive"), true);
assertTrialCanStart(true, false);
expectFailure(() => assertTrialCanStart(false, false), "approval");
expectFailure(() => assertTrialCanStart(true, true), "second trial");
assertSingleUseReferral("Available", referralExpiry(start), new Date("2026-01-07T23:59:59.999Z"));
expectFailure(() => assertSingleUseReferral("Redeemed", referralExpiry(start), start), "no longer");
expectFailure(() => assertSingleUseReferral("Available", referralExpiry(start), referralExpiry(start)), "expired");
assertCapacity(100, 20, 150, 3, 2, 5);
expectFailure(() => assertCapacity(140, 20, 150, 3, 0, 5), "kilometre");
expectFailure(() => assertCapacity(100, 20, 150, 5, 1, 5), "named-user");
assert.equal(canAccessOwner({ id: "a", name: "A", email: "a@example.test", role: "Admin", companyId: "company-a", companyRole: "CompanyAdmin" }, "b"), false);
assert.equal(canAccessOwner({ id: "a", name: "A", email: "a@example.test", role: "Admin", companyId: "company-a", companyRole: "CompanyAdmin" }, "a"), true);
console.log("PASS: Super Admin domain state, UTC expiry, single-use referral, trial, and capacity checks.");
