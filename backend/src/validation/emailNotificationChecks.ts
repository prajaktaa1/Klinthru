import assert from "node:assert/strict";
import { NOTIFICATION_CLAIM_LEASE_MS, renderNotification, subscriptionReminderSchedule } from "../superAdmin/notifications";

const start = new Date("2026-11-01T00:00:00.000Z");
const expiry = new Date("2026-11-08T00:00:00.000Z");
const welcome = renderNotification("CompanyWelcome", { companyName: "A & <Company>", adminName: "Admin <Test>" });
assert.match(welcome.html, /A &amp; &lt;Company&gt;/);
assert.doesNotMatch(welcome.html, /A & <Company>/);
assert.match(welcome.text, /pending Super Admin approval/);
assert.match(welcome.text, /trial has not started/);

const trial = renderNotification("TrialActivated", { companyName: "Klinthru Test", start, expiry });
assert.match(trial.html, /2026-11-01 00:00:00 UTC/);
assert.match(trial.html, /2026-11-08 00:00:00 UTC/);

const reminder = renderNotification("RenewalReminder30", { companyName: "Klinthru Test", expiry, remainingDays: 30 });
assert.match(reminder.subject, /30/);
assert.match(reminder.text, /your Super Admin to renew/);

const renewal = renderNotification("SubscriptionRenewed", { companyName: "Klinthru Test", start, expiry, pipelineKmLimit: 125.5, namedUserLimit: 8 });
assert.match(renewal.text, /125.5 pipeline km/);
assert.match(renewal.text, /8 named users/);

const annualExpiry = new Date("2027-11-01T12:34:56.000Z");
const schedule = subscriptionReminderSchedule(annualExpiry);
assert.deepEqual(schedule.map(item => item.days), [30, 10, 7]);
assert.deepEqual(schedule.map(item => item.scheduledFor.toISOString()), [
  "2027-10-02T12:34:56.000Z",
  "2027-10-22T12:34:56.000Z",
  "2027-10-25T12:34:56.000Z"
]);
assert.equal(NOTIFICATION_CLAIM_LEASE_MS, 300000);

console.log("PASS: Transactional notification templates, escaping, lifecycle copy, and capacity substitution.");
