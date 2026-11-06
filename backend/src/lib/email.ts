import { env } from "../config/env";

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured.");
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message = "Email delivery failed.", public readonly providerStatus?: number) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_REQUEST_TIMEOUT_MS = 10_000;

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string; text: string; replyTo?: string; from?: string }): Promise<string | null> {
  if (!env.resendApiKey || !env.emailFrom) throw new EmailDeliveryNotConfiguredError();
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: input.from || env.emailFrom, to: input.to, subject: input.subject, html: input.html, text: input.text, reply_to: input.replyTo || env.emailReplyTo || undefined }),
      signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw new EmailDeliveryError("Email delivery failed.", response.status);
    const body = await response.json().catch(() => ({})) as { id?: string };
    return body.id || null;
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    throw new EmailDeliveryError();
  }
}

export async function sendOtpEmail({
  email,
  otp,
  purpose
}: {
  email: string;
  otp: string;
  purpose: "login" | "signup";
}): Promise<void> {
  if (!env.resendApiKey || !env.emailFrom) {
    throw new EmailDeliveryNotConfiguredError();
  }

  const subject = purpose === "login" ? "Your Klinthru sign-in code" : "Verify your Klinthru account";
  const text = [
    `Your Klinthru verification code is ${otp}.`,
    "This code expires in 5 minutes.",
    "If you did not request this code, you can ignore this email."
  ].join("\n\n");

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: email,
        subject,
        text
      }),
      signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new EmailDeliveryError("Email delivery failed.", response.status);
    }
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      throw error;
    }

    throw new EmailDeliveryError();
  }
}
