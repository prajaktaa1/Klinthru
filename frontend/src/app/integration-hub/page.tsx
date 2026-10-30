import { IntegrationHubWorkspace } from "@/components/integration-hub-workspace";
import { PageHeader } from "@/components/ui";
import { IntegrationIcon } from "@/components/sidebar";

export default function IntegrationHubPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 [&>div]:mb-0"><span aria-hidden="true" className="mt-1 shrink-0 text-cyan-600"><IntegrationIcon /></span><PageHeader
        eyebrow=""
        title="Integration Hub"
        description="Connect, validate and manage data from external systems. The Integration Hub ensures reliable, standardized and secure data flow across KLINTHRU."
      /></div>
      <IntegrationHubWorkspace mode="real" />
    </div>
  );
}
