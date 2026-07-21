import Link from "next/link";

const platformLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "External Corrosion Assessment", href: "/external-corrosion-assessment" },
  { label: "Internal Corrosion Assessment", href: "/internal-corrosion-assessment" },
  { label: "Sensor Monitoring", href: "/sensors" },
  { label: "Reports", href: "/report" }
];

const capabilityLinks = [
  "Manual Data Entry",
  "IoT Sensor Integration",
  "Corrosion Assessment",
  "Risk and Remaining-Life Review",
  "Report Generation"
];

export function PublicFooter() {
  return (
    <footer className="bg-[#0B1739] text-[#C8D4E5]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_0.9fr_0.95fr_1fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-white">Klinthru</p>
          <p className="mt-3 text-sm font-medium text-[#D6E6FF]">
            Pipeline Integrity and Corrosion Assessment Platform
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#A9BCD5]">
            Enter pipeline and sensor data, assess corrosion risk, and generate engineering reports.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Platform
          </h3>
          <div className="mt-5 grid gap-3 text-sm">
            {platformLinks.map((item) => (
              <Link
                key={item.label}
                className="rounded-sm outline-none transition hover:text-[#60A5FA] focus-visible:text-[#60A5FA] focus-visible:ring-4 focus-visible:ring-blue-100/20"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Capabilities
          </h3>
          <div className="mt-5 grid gap-3 text-sm">
            {capabilityLinks.map((item) => (
              <a
                key={item}
                className="rounded-sm outline-none transition hover:text-[#22D3EE] focus-visible:text-[#22D3EE] focus-visible:ring-4 focus-visible:ring-cyan-100/20"
                href="#"
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Contact
          </h3>
          <div className="mt-5 space-y-3 text-sm">
            <p>Email: info@saqrontech.com</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs text-[#A9BCD5] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>&copy; 2026 Klinthru. All rights reserved.</p>
            <p>Built for pipeline integrity and corrosion assessment.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              className="rounded-sm outline-none transition hover:text-[#60A5FA] focus-visible:text-[#60A5FA] focus-visible:ring-4 focus-visible:ring-blue-100/20"
              href="#"
            >
              Privacy Policy
            </a>
            <Link
              className="rounded-sm outline-none transition hover:text-[#60A5FA] focus-visible:text-[#60A5FA] focus-visible:ring-4 focus-visible:ring-blue-100/20"
              href="/terms"
            >
              Terms & Conditions
            </Link>
            <a
              className="rounded-sm outline-none transition hover:text-[#22D3EE] focus-visible:text-[#22D3EE] focus-visible:ring-4 focus-visible:ring-cyan-100/20"
              href="#"
            >
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
