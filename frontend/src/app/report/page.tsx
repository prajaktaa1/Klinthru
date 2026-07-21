import { ReportView } from "@/components/report-view";
import { PageHeader } from "@/components/ui";

export default function ReportPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Report"
        title="Assessment Report Page"
        description="Review all captured inputs, all generated outputs, and export a printable PDF snapshot for early stakeholder demos."
      />
      <ReportView />
    </div>
  );
}
