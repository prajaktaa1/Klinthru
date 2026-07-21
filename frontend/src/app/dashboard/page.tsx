import { DashboardView } from "@/components/dashboard";
import { PageHeader } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Pipeline Integrity Dashboard"
        description="Klinthru Phase 1 gives teams a focused corrosion screening workspace with responsive cards, recent assessments, simple charting, and report generation."
      />
      <DashboardView />
    </div>
  );
}
