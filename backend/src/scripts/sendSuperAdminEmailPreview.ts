import { renderNotification, type NotificationKind } from "../superAdmin/notifications";
import { env } from "../config/env";
import { sendTransactionalEmail } from "../lib/email";

const APPROVED_RECIPIENT = "saqron3939@gmail.com";
const PREVIEW_SENDER = "Klinthru Notifications <noreply@klinthru.com>";
const RESEND_DOMAINS_ENDPOINT = "https://api.resend.com/domains";

const templates: Array<{ kind: NotificationKind; label: string }> = [
  { kind: "CompanyWelcome", label: "registration pending approval" },
  { kind: "TrialActivated", label: "seven-day trial activation" },
  { kind: "TrialExpired", label: "trial expiry" },
  { kind: "SubscriptionActivated", label: "annual subscription activation" },
  { kind: "RenewalReminder30", label: "30-day renewal reminder" },
  { kind: "RenewalReminder10", label: "10-day renewal reminder" },
  { kind: "RenewalReminder7", label: "seven-day renewal reminder" },
  { kind: "SubscriptionExpired", label: "annual subscription expiry" },
  { kind: "SubscriptionRenewed", label: "annual renewal confirmation" }
];

const sample = {
  companyName: "TEST / PREVIEW — Northstar Pipeline Demo",
  adminName: "TEST Recipient",
  start: new Date("2027-01-15T09:30:00.000Z"),
  expiry: new Date("2028-01-15T09:30:00.000Z"),
  pipelineKmLimit: 250,
  namedUserLimit: 12
};

function senderEmail(): string | null {
  const match = env.emailFrom.match(/<([^>]+)>/);
  return (match?.[1] || env.emailFrom).trim().toLowerCase() || null;
}

function testContent(kind: NotificationKind) {
  const rendered = renderNotification(kind, sample);
  return {
    subject: `[TEST / PREVIEW] ${rendered.subject}`,
    html: rendered.html.replace("<!-- KLINTHRU_TEST_BANNER_SLOT -->", `<div style="background:#fff3cd;color:#664d03;padding:12px 18px;font:700 13px Arial,sans-serif;text-align:center">TEST / PREVIEW - No real subscription or account change</div>`),
    text: `TEST / PREVIEW — No real subscription or account change.\n\n${rendered.text}`
  };
}

async function verifySenderDomain(sender: string): Promise<"verified" | "inspection-unavailable"> {
  if (!env.resendApiKey) throw new Error("RESEND_API_KEY is not configured.");
  const domain = sender.split("@")[1];
  if (!domain) throw new Error("Configured sender email is invalid.");
  const response = await fetch(RESEND_DOMAINS_ENDPOINT, { headers: { Authorization: `Bearer ${env.resendApiKey}` }, signal: AbortSignal.timeout(10000) });
  if (response.status === 401 || response.status === 403) return "inspection-unavailable";
  if (!response.ok) throw new Error(`Resend domain verification lookup failed (${response.status}).`);
  const body = await response.json() as { data?: Array<{ name?: string; status?: string }> };
  const match = body.data?.find(item => item.name?.toLowerCase() === domain);
  if (!match || match.status !== "verified") throw new Error(`The configured sender domain '${domain}' is not verified by Resend.`);
  return "verified";
}

async function verifyLogoUrl(): Promise<void> {
  const response = await fetch(env.emailLogoUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Configured email logo URL is not accessible (${response.status}).`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) throw new Error("Configured email logo URL does not return an image.");
}

async function main() {
  const recipient = APPROVED_RECIPIENT;
  if (recipient !== "saqron3939@gmail.com") throw new Error("Recipient allowlist failure.");
  if (!env.resendApiKey || !env.emailFrom) throw new Error("Resend API key or sender configuration is missing.");
  const sender = senderEmail();
  if (!sender) throw new Error("Sender configuration is invalid.");
  await verifyLogoUrl();
  const domainStatus = await verifySenderDomain(sender);
  if (sender !== "noreply@klinthru.com") throw new Error("Preview requires the configured sender email noreply@klinthru.com.");
  console.log(`Configured sender used by OTP: ${env.emailFrom}`);
  console.log(`Explicit preview sender: ${PREVIEW_SENDER}`);
  if (domainStatus === "inspection-unavailable") console.log("Resend Domains API inspection is unavailable for this key; each send will be authorized by the Resend email endpoint.");
  console.log(`Approved test recipient: ${recipient}`);

  for (const template of templates) {
    const content = testContent(template.kind);
    try {
      const providerMessageId = await sendTransactionalEmail({ to: recipient, from: PREVIEW_SENDER, subject: content.subject, html: content.html, text: content.text });
      console.log(JSON.stringify({ template: template.label, status: "accepted", providerMessageId: providerMessageId || null }));
    } catch (error) {
      console.log(JSON.stringify({ template: template.label, status: "failed", error: error instanceof Error ? error.message : "delivery failed" }));
    }
  }
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : "Preview delivery failed.");
  process.exitCode = 1;
});

