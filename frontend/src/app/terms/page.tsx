import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";

const termsSections = [
  {
    title: "1. Introduction",
    body: "These Terms & Conditions describe the rules for accessing and using Klinthru, a pipeline integrity and corrosion-assessment support platform."
  },
  {
    title: "2. Acceptance of Terms",
    body: "By accessing or using Klinthru, you agree to follow these Terms. If you do not agree, you should not use the platform."
  },
  {
    title: "3. Permitted Use of the Platform",
    body: "Klinthru may be used to enter pipeline-related data, run corrosion-assessment workflows, review risk outputs, and generate reports for internal engineering review and operational planning."
  },
  {
    title: "4. User Accounts and Responsibilities",
    body: "Users are responsible for maintaining account confidentiality, using appropriate access controls, and ensuring that account activity is authorized, accurate, and compliant with internal policies."
  },
  {
    title: "5. Pipeline Data and Assessment Inputs",
    body: "Users are responsible for the completeness, quality, and accuracy of pipeline, soil, water, operating, inspection, and related assessment inputs submitted to Klinthru."
  },
  {
    title: "6. Corrosion Assessment Results",
    body: "Assessment outputs may include risk levels, scores, remaining-life indicators, report summaries, and related recommendations based on the data entered and the platform logic available at the time of use."
  },
  {
    title: "7. Accuracy and Engineering Limitations",
    body: "Klinthru provides pipeline integrity and corrosion-assessment support tools only. Its calculations, risk scores, reports, predictions, and recommendations must not be treated as a substitute for inspection, testing, regulatory compliance, or advice from a qualified pipeline, corrosion, integrity, or professional engineer."
  },
  {
    title: "8. No Professional Engineering Advice",
    body: "Klinthru does not provide professional engineering advice, certification, regulatory approval, or fitness-for-service determinations. Users must obtain appropriate expert review before relying on outputs for operational, safety, compliance, or engineering decisions."
  },
  {
    title: "9. User Data and Privacy",
    body: "Users should submit only data they are authorized to provide. Handling of user data, account information, and assessment inputs should be reviewed together with applicable privacy and data-protection commitments made available for the platform."
  },
  {
    title: "10. Intellectual Property Rights",
    body: "Klinthru, including its interface, workflows, software, text, branding, and platform design, is protected by intellectual property rights. Users may not copy, reverse engineer, or redistribute platform materials except as expressly permitted."
  },
  {
    title: "11. Prohibited Activities",
    body: "Users must not misuse Klinthru, attempt unauthorized access, disrupt platform operations, submit unlawful or harmful content, interfere with security controls, or use outputs in a misleading or unsafe manner."
  },
  {
    title: "12. Third-Party Services",
    body: "Klinthru may rely on hosting, infrastructure, analytics, authentication, or other third-party services. Use of those services may be subject to additional terms and operational limitations."
  },
  {
    title: "13. Platform Availability and Modifications",
    body: "Klinthru may be updated, modified, interrupted, or discontinued as needed for maintenance, security, product improvement, or operational reasons. Availability is not guaranteed at all times."
  },
  {
    title: "14. Limitation of Liability",
    body: "To the maximum extent permitted by applicable law, Klinthru is not liable for indirect, incidental, consequential, special, punitive, or operational losses arising from platform use, assessment outputs, data errors, downtime, or reliance on reports."
  },
  {
    title: "15. Indemnification",
    body: "Users agree to defend and hold harmless the Klinthru platform providers from claims, damages, losses, and expenses arising from misuse of the platform, inaccurate inputs, unauthorized use, or violation of these Terms."
  },
  {
    title: "16. Suspension or Termination",
    body: "Access to Klinthru may be suspended or terminated if a user violates these Terms, creates security or operational risk, misuses the platform, or otherwise acts in a way that may harm the platform or other users."
  },
  {
    title: "17. Governing Law",
    body: "These Terms are governed by the laws applicable to the Klinthru operating entity or customer agreement, unless a separate written agreement specifies another governing law."
  },
  {
    title: "18. Changes to These Terms",
    body: "Klinthru may revise these Terms as the platform evolves. Continued use of the platform after changes are made available means you accept the updated Terms."
  },
  {
    title: "19. Contact Information",
    body: "For questions about these Terms, contact the Klinthru team using the contact email listed on the public Klinthru website footer."
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-950">
            Klinthru
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-slateblue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slateblue-700"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slateblue-700">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            These terms explain how Klinthru may be used for pipeline integrity workflows, corrosion assessment support, and engineering report preparation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
