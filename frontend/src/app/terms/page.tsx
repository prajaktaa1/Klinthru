import { LegalPage } from "@/components/legal-page";
import { legalLastUpdated, termsSections } from "@/lib/legal-content";

export default function TermsPage() {
  return (
    <LegalPage
      activeHref="/terms"
      description="The terms governing use of Klinthru's pipeline integrity support and decision-support platform."
      eyebrow="Legal / Klinthru"
      lastUpdated={legalLastUpdated}
      sections={termsSections}
      title="Terms & Conditions"
    />
  );
}
