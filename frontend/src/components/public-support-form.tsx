"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

type FormValues = { name: string; email: string; topic: string; message: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = { name: "", email: "", topic: "", message: "" };

export function PublicSupportForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "sent">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Enter your name.";
    if (!values.email.trim()) next.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!values.message.trim()) next.message = "Tell us how we can help.";
    return next;
  }

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus("idle");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true); setStatus("sending");
    void fetch(`${(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4002").replace(/\/$/, "")}/api/public-submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, type: "support" }) }).then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "Unable to submit your support request."); setStatus("sent"); setValues(initialValues); }).catch((error: unknown) => setStatus("error")).finally(() => setIsSubmitting(false));
  }

  const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0879C8] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20";
  const labelClass = "mb-2 block text-[15px] font-medium text-slate-900 dark:text-white";

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950" aria-label="Homepage support form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block" htmlFor="support-name"><span className={labelClass}>Your Name</span><input className={fieldClass} id="support-name" name="name" placeholder="Your full name" value={values.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "support-name-error" : undefined} />{errors.name ? <span id="support-name-error" className="mt-1 block text-sm text-red-600 dark:text-red-300">{errors.name}</span> : null}</label>
        <label className="block" htmlFor="support-email"><span className={labelClass}>Email to Reach You</span><input className={fieldClass} id="support-email" name="email" type="email" placeholder="you@company.com" value={values.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "support-email-error" : undefined} />{errors.email ? <span id="support-email-error" className="mt-1 block text-sm text-red-600 dark:text-red-300">{errors.email}</span> : null}</label>
      </div>
      <label className="block" htmlFor="support-topic"><span className={labelClass}>Topic <span className="font-normal text-slate-500">(Optional)</span></span><input className={fieldClass} id="support-topic" name="topic" placeholder="Assessment, monitoring, reporting, support request..." value={values.topic} onChange={(event) => update("topic", event.target.value)} /></label>
      <label className="block" htmlFor="support-message"><span className={labelClass}>How Can We Help?</span><textarea className={`${fieldClass} min-h-32 resize-y leading-7`} id="support-message" name="message" placeholder="Describe the issue or question. Include relevant details if helpful." value={values.message} onChange={(event) => update("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "support-message-error" : undefined} />{errors.message ? <span id="support-message-error" className="mt-1 block text-sm text-red-600 dark:text-red-300">{errors.message}</span> : null}</label>
      {status === "error" ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">Unable to submit your support request. Please try again later.</p> : null}{status === "sent" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">Your support request was received. We will respond by email.</p> : null}
      <button disabled={isSubmitting} className="group inline-flex w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0879C8] to-[#00A8B5] px-6 py-3 text-base font-semibold text-white shadow-sm outline-none transition duration-300 hover:shadow-[0_8px_20px_rgba(8,121,200,0.22)] focus-visible:ring-4 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-70" type="submit"><span>{isSubmitting ? "Sending..." : "Send to Support"}</span><Send size={17} className="transition-transform duration-300 group-hover:translate-x-0.5" /></button>
    </form>
  );
}
