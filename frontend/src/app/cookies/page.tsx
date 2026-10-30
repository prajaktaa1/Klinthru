import { LegalPage } from "@/components/legal-page";
import { cookieSections, legalLastUpdated } from "@/lib/legal-content";

export default function CookiesPage() {
  return (
    <LegalPage
      activeHref="/cookies"
      description="Current cookie and browser storage details for the Klinthru frontend."
      eyebrow="Legal / Klinthru"
      lastUpdated={legalLastUpdated}
      sections={cookieSections}
      title="Cookie Policy"
    />
  );
}
