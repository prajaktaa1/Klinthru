"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { PublicNavbar } from "@/components/public-navbar";
import { Panel } from "@/components/ui";
import { ApiError, isBackendUnavailableError, requestSignupOtp } from "@/lib/apiClient";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main className="public-motion flex min-h-[calc(100vh-74px)] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || isBackendUnavailableError(error)) {
    if (error.message === "Email delivery is not configured.") {
      return "Email OTP delivery is not configured yet. Please contact the administrator.";
    }

    return error.message;
  }

  return fallback;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function OtpInputs({
  digits,
  onChange,
  disabled = false
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5" aria-label="6-digit OTP">
      {digits.map((digit, index) => (
        <input
          key={index}
          className="h-10 rounded-xl border border-slate-200 bg-white text-center text-base font-semibold text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => {
            const next = [...digits];
            next[index] = event.target.value.replace(/\D/g, "").slice(0, 1);
            onChange(next);
          }}
          pattern="[0-9]*"
          type="text"
          value={digit}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signupWithOtp } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [step, setStep] = useState<"details" | "otp">("details");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const otp = digits.join("");

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCooldownSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  async function handleContinue(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await requestSignupOtp({ companyName, adminName: companyName, mobileNumber, email });
      setDigits(Array(6).fill(""));
      setStep("otp");
      setCooldownSeconds(response.retryAfterSeconds);
    } catch (error) {
      setError(getErrorMessage(error, "OTP could not be sent."));
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify() {
    setIsVerifying(true);
    setError("");

    try {
      await signupWithOtp(email, otp);
      router.replace("/dashboard");
    } catch (error) {
      setError(getErrorMessage(error, "Email verification failed."));
    } finally {
      setIsVerifying(false);
    }
  }

  const canContinue = Boolean(companyName.trim() && mobileNumber.trim() && email.trim());

  return (
    <AuthShell>
      <Panel className="overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-panel dark:border-slate-800 dark:bg-slate-950/95">
        <div className="px-5 pb-3 pt-6 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">Klinthru</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {step === "details" ? "Create account" : "Verify email"}
          </h1>
        </div>

        {step === "details" ? (
          <form className="space-y-3 px-5 pb-5 sm:px-6" onSubmit={handleContinue}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Company Name</span>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" onChange={(event) => { setCompanyName(event.target.value); setError(""); }} type="text" value={companyName} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Mobile Number</span>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" inputMode="tel" onChange={(event) => { setMobileNumber(event.target.value); setError(""); }} type="tel" value={mobileNumber} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="admin@company.com" type="email" value={email} />
            </label>

            <button className="w-full rounded-full bg-slateblue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={!canContinue || isSending} type="submit">
              {isSending ? "Sending..." : "Continue"}
            </button>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link className="font-semibold text-slateblue-700" href="/login">
                Login
              </Link>
            </p>
          </form>
        ) : (
          <div className="space-y-4 px-5 pb-5 sm:px-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Email OTP verification</span>
                <button
                  className="text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSending || cooldownSeconds > 0}
                  onClick={() => void handleContinue()}
                  type="button"
                >
                  {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend OTP"}
                </button>
              </div>
              <OtpInputs digits={digits} disabled={isVerifying} onChange={setDigits} />
            </div>

            <button
              className="w-full rounded-full bg-slateblue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={otp.length !== 6 || isVerifying}
              onClick={handleVerify}
              type="button"
            >
              {isVerifying ? "Verifying..." : "Verify Email"}
            </button>

            <button className="w-full text-sm font-semibold text-slate-500" onClick={() => setStep("details")} type="button">
              Edit details
            </button>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link className="font-semibold text-slateblue-700" href="/login">
                Login
              </Link>
            </p>
          </div>
        )}
      </Panel>
    </AuthShell>
  );
}
