import { CpDashboardView } from "@/components/cp-dashboard-view";
import { PageHeader } from "@/components/ui";

export default function CpDashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="CP Monitoring"
        title="CP Dashboard"
        description="Run preliminary cathodic protection calculations for sacrificial-anode and impressed-current systems using document-supported formulas."
      />
      <CpDashboardView />
    </div>
  );
}
