import { LegalPage } from "@/components/legal-page";
import { disclaimerSections, legalLastUpdated } from "@/lib/legal-content";

export default function DisclaimerPage() {
  return (
    <LegalPage
      activeHref="/disclaimer"
      description="Important limits for Klinthru's pipeline integrity support and decision-support outputs."
      eyebrow="Legal / Klinthru"
      lastUpdated={legalLastUpdated}
      sections={disclaimerSections}
      title="Disclaimer"
    />
  );
}
