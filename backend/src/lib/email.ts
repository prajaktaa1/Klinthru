import { env } from "../config/env";

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured.");
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message = "Email delivery failed.") {
    super(message);
    this.name = "EmailDeliveryError";
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

  const response = await fetch("https://api.resend.com/emails", {
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
    })
  });

  if (!response.ok) {
    throw new EmailDeliveryError();
  }
}
