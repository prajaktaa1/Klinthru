import Link from "next/link";

const productLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Modules", href: "/modules" },
  { label: "Reports", href: "/report" }
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Disclaimer", href: "/disclaimer" }
];

const supportLinks = [
  { label: "Help Center", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Start Now", href: "/login" }
];

const capabilityLinks = [
  { label: "External Corrosion Assessment", href: "/external-corrosion-assessment" },
  { label: "Internal Corrosion Assessment", href: "/internal-corrosion-assessment" },
  { label: "Sensor Monitoring", href: "/sensors" }
];

const linkClass = "group inline-flex items-center gap-2 rounded-sm text-[14px] leading-[1.5] text-[#D3E8F4] outline-none transition duration-200 hover:translate-x-0.5 hover:text-[#55D7DF] focus-visible:text-[#55D7DF] focus-visible:ring-4 focus-visible:ring-cyan-400/20";
const contactRowClass = "group flex items-start gap-2 rounded-sm text-[14px] leading-[1.5] text-[#D3E8F4] outline-none transition hover:translate-x-0.5 hover:text-[#55D7DF] focus-visible:text-[#55D7DF] focus-visible:ring-4 focus-visible:ring-cyan-400/20";

function ArrowIcon() {
  return <svg aria-hidden="true" className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function EmailIcon() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><rect height="14" rx="2" width="18" x="3" y="5" /><path d="m3 7 9 6 9-6" /></svg>;
}

function PhoneIcon() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M6.5 3.5 9 3l2 5-2.5 1.5a13 13 0 0 0 6 6L16 13l5 2 .5 2.5A3 3 0 0 1 18.5 21C10 20.5 3.5 14 3 5.5A3 3 0 0 1 6.5 3.5Z" /></svg>;
}

function LocationIcon() {
  return <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[#285263] bg-[linear-gradient(115deg,#102B40_0%,#10283B_40%,#103D46_75%,#123D39_100%)] text-[#E2EDF5]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(85,215,223,0.11),transparent_30%),radial-gradient(circle_at_88%_100%,rgba(54,181,74,0.08),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(240px,1.35fr)_0.82fr_0.92fr_0.82fr_1fr_1.1fr] lg:gap-x-3">
          <div className="max-w-sm">
            <Link className="inline-flex rounded-sm outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-400/20" href="/">
              <img
                alt="Klinthru"
                className="h-12 w-auto"
                src="/klinthru-logo.png"
              />
            </Link>
            <p className="mt-4 text-sm font-medium text-[#55D7DF]">Pipeline integrity management</p>
            <p className="mt-3 text-[14px] leading-[1.5] text-[#B9CBD8]">A focused workspace for pipeline integrity data, engineering assessment, monitoring context, and traceable reporting.</p>
          </div>

          {[
            { title: "Platform", links: productLinks },
            { title: "Company", links: companyLinks },
            { title: "Support", links: supportLinks },
            { title: "Capabilities", links: capabilityLinks }
          ].map((group) => (
            <div key={group.title}>
              <h2 className="min-h-6 !text-[16px] font-semibold !leading-6 text-[#F5FAFF]">{group.title}</h2>
              <nav aria-label={`${group.title} links`} className="mt-3 grid gap-2">
                {group.links.map((link) => <Link className={linkClass} href={link.href} key={link.href}>{link.label}<ArrowIcon /></Link>)}
              </nav>
            </div>
          ))}

          <div>
            <h2 className="min-h-6 !text-[16px] font-semibold !leading-6 text-[#F5FAFF]">Contact</h2>
            <div className="mt-3 grid gap-2">
              <a className={contactRowClass} href="mailto:info@klinthru.com">
                <EmailIcon />
                <span>info@klinthru.com</span>
              </a>
              <a className={contactRowClass} href="tel:+971543900939">
                <PhoneIcon />
                <span>+971 543 900 939</span>
              </a>
              <div className="flex min-w-0 items-start gap-2 break-words text-[14px] leading-[1.5] text-[#B9CBD8]">
                <LocationIcon />
                <span>Office no. 6, PO Box 20317, Abu Dhabi, UAE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/15 pt-5 text-[13px] leading-[1.5] text-[#B9CBD8] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} Klinthru. All rights reserved.</p>
          <Link className="rounded-sm transition hover:text-[#55D7DF] focus-visible:text-[#55D7DF] focus-visible:ring-4 focus-visible:ring-cyan-400/20" href="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
