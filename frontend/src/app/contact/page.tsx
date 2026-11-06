import { PublicFooter } from "@/components/public-footer";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicEnquiryForm } from "@/components/public-enquiry-form";

const formFields = [
  { label: "Your name", name: "name", type: "text", placeholder: "Your full name" },
  { label: "Email to reach you", name: "email", type: "email", placeholder: "you@company.com" }
];

export default function ContactPage() {
  return (
    <main className="public-subpage public-motion min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicNavbar />

      <section className="border-b border-slate-200 bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.09),transparent_34%)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-300">
              Contact Us
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]">
              Connect with us.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg lg:text-justify">
              Use the details below or send your message through the contact form.
            </p>

            <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
                Direct details
              </p>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Reach us directly.
              </h2>
              <div className="mt-8 space-y-6 text-lg leading-7 text-slate-700 dark:text-slate-300">
                <p>
                  <span className="font-semibold text-slate-950 dark:text-white">Email:</span>{" "}
                  <a className="text-cyan-700 transition hover:text-slateblue-700 dark:text-cyan-300 dark:hover:text-cyan-200" href="mailto:support@klinthru.com">
                    support@klinthru.com
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-slate-950 dark:text-white">Phone:</span>{" "}
                  <a className="text-cyan-700 transition hover:text-slateblue-700 dark:text-cyan-300 dark:hover:text-cyan-200" href="tel:+971543900939">
                    +971 543 900 939
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-slate-950 dark:text-white">Location:</span>{" "}
                  <span>Office no. 6, PO Box 20317, Abu Dhabi, UAE</span>
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-[32px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
            <PublicEnquiryForm />
            {/* The form is implemented in the client component so this page remains a Server Component. */}
            {/*
              <div className="grid gap-4 sm:grid-cols-2">
                {formFields.map((field) => (
                  <label className="block" htmlFor={field.name} key={field.name}>
                    <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                      {field.label}
                    </span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      type={field.type}
                    />
                  </label>
                ))}
              </div>

              <label className="block" htmlFor="topic">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                  Topic
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                  id="topic"
                  name="topic"
                  placeholder="Assessment, monitoring, reporting, support request..."
                  type="text"
                />
              </label>

              <label className="block" htmlFor="platform">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                  Platform
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20 sm:max-w-xs"
                  id="platform"
                  name="platform"
                >
                  <option value="">Select a platform</option>
                  <option value="web">Klinthru web platform</option>
                  <option value="assessment">Assessment workflow</option>
                  <option value="reports">Reports and documents</option>
                  <option value="support">Support request</option>
                </select>
              </label>

              <label className="block" htmlFor="message">
                <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                  How can we help?
                </span>
                <textarea
                  className="min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
                  id="message"
                  name="message"
                  placeholder="Describe the issue or question. Include steps, screenshots, or links if helpful."
                />
              </label>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  This form is currently a UI-only contact surface.
                </p>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-slateblue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-slateblue-700 hover:shadow-md focus-visible:bg-slateblue-700 focus-visible:ring-4 focus-visible:ring-slateblue-100"
                  type="button"
                >
                  Send to support
                </button>
              </div>
            </form>*/}
          </section>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
