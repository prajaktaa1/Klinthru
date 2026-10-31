import { SensorsView } from "@/components/sensors-view";
import { PageHeader } from "@/components/ui";

export default function SensorsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="SENSOR MONITORING"
        title="Sensors"
        description=""
      />

      <SensorsView />
    </div>
  );
}
