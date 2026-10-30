import { LegalPage } from "@/components/legal-page";
import { legalLastUpdated, privacySections } from "@/lib/legal-content";

export default function PrivacyPage() {
  return (
    <LegalPage
      activeHref="/privacy"
      description="How Klinthru handles information used in its pipeline integrity support workflows."
      eyebrow="Legal / Klinthru"
      lastUpdated={legalLastUpdated}
      sections={privacySections}
      title="Privacy Policy"
    />
  );
}
