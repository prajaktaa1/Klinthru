import { SensorsView } from "@/components/sensors-view";
import { PageHeader } from "@/components/ui";

export default function SensorsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="SENSOR MONITORING"
        title=""
        description="Monitor sensor devices, connectivity, data quality, calibration and maintenance status."
      />

      <SensorsView />
    </div>
  );
}
