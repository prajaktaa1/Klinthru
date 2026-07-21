import { SensorsView } from "@/components/sensors-view";
import { PageHeader } from "@/components/ui";

export default function SensorsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="SENSOR MONITORING"
        title="Sensors & Field Equipment"
        description="Monitor the availability and operating status of pipeline field instruments."
      />

      <SensorsView />
    </div>
  );
}
