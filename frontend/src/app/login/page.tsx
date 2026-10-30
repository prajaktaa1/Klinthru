"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { PublicNavbar } from "@/components/public-navbar";
import { Panel } from "@/components/ui";
import { ApiError, isBackendUnavailableError, requestLoginOtp } from "@/lib/apiClient";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main className="public-motion flex min-h-[calc(100vh-74px)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[420px]">{children}</div>
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
    <div className="grid grid-cols-6 gap-2" aria-label="6-digit OTP">
      {digits.map((digit, index) => (
        <input
          key={index}
          className="h-12 rounded-xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 disabled:cursor-not-allowed disabled:opacity-60"
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

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
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

  async function handleOtpRequest() {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await requestLoginOtp(email);
      setDigits(Array(6).fill(""));
      setIsOtpRequested(true);
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
      await loginWithOtp(email, otp);
      router.replace("/dashboard");
    } catch (error) {
      setError(getErrorMessage(error, "OTP verification failed."));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsPasswordSubmitting(true);
    setError("");

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (error) {
      setError(getErrorMessage(error, "Login failed. Check your email and password."));
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Panel className="overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-panel dark:border-slate-800 dark:bg-slate-950/95">
        <div className="px-6 pb-4 pt-7 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">Klinthru</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        </div>

        <div className="space-y-4 px-6 pb-7 sm:px-8">
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="name@company.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                type="password"
                value={password}
              />
            </label>

            <button
              className="w-full rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slateblue-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!email.trim() || !password || isPasswordSubmitting}
              type="submit"
            >
              {isPasswordSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email OTP</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slateblue-500 hover:text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!email.trim() || isSending || cooldownSeconds > 0}
            onClick={handleOtpRequest}
            type="button"
          >
            {isSending ? "Sending..." : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Send OTP"}
          </button>

          {isOtpRequested ? (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">6-digit OTP verification</span>
                  <button
                    className="text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSending || cooldownSeconds > 0}
                    onClick={handleOtpRequest}
                    type="button"
                  >
                    Resend OTP
                  </button>
                </div>
                <OtpInputs digits={digits} disabled={isVerifying} onChange={setDigits} />
              </div>

              <button
                className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slateblue-500 hover:text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={otp.length !== 6 || isVerifying}
                onClick={handleVerify}
                type="button"
              >
                {isVerifying ? "Verifying..." : "Verify & Sign In"}
              </button>
            </div>
          ) : null}

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link className="font-semibold text-slateblue-700" href="/signup">
              Sign Up
            </Link>
          </p>
        </div>
      </Panel>
    </AuthShell>
  );
}
