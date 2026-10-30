"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SensorDataQualityView } from "@/components/sensor-data-quality-view";
import { SensorCalibrationView } from "@/components/sensor-calibration-view";
import { SensorMaintenanceView } from "@/components/sensor-maintenance-view";
import { SensorAlertsEventsView } from "@/components/sensor-alerts-events-view";
import { SensorConfigurationView } from "@/components/sensor-configuration-view";
import { SensorsTable } from "@/components/sensors-table";
import { SensorCreateAssignment } from "@/components/sensor-create-assignment";
import { SensorRegistrationForm } from "@/components/sensor-registration-form";
import { StatCard } from "@/components/ui";
import { fetchDeviceRecords, isBackendUnavailableError, isUnauthorizedError } from "@/lib/apiClient";
import { buildSensorInventory, getSensorTotals } from "@/lib/sensor-data";
import { DeviceRecord } from "@/lib/types";

export function SensorsView() {
  const router = useRouter();
  const [activeView, setActiveView] = useState("All Sensors");
  const [records, setRecords] = useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const fetched = await fetchDeviceRecords();
        if (!isMounted) {
          return;
        }

        setRecords(fetched);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorizedError(error)) {
          router.replace("/login");
          return;
        }

        if (isBackendUnavailableError(error)) {
          setErrorMessage("Device records are unavailable because the backend could not be reached.");
        } else {
          setErrorMessage("Device records could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const realRecords = records.filter((record) => !record.isDemoData);
  const demoRecordCount = records.length - realRecords.length;
  const sensorInventory = buildSensorInventory(realRecords);
  const totals = getSensorTotals(sensorInventory);
  const inventoryValue = (value: number) => isLoading ? "..." : errorMessage ? "Unavailable" : value;

  return (
    <div className="space-y-6">
      <nav aria-label="Sensors views" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-panel dark:border-slate-700 dark:bg-slate-900">
        {["All Sensors", "By Type", "By Pipeline / Segment", "By Asset", "Health & Connectivity", "Data Quality", "Calibration", "Maintenance", "Alerts & Events", "Configuration"].map((tab) => {
          const enabled = tab === "All Sensors" || tab === "Data Quality" || tab === "Calibration" || tab === "Maintenance" || tab === "Alerts & Events" || tab === "Configuration";
          return <button key={tab} type="button" disabled={!enabled} aria-selected={activeView === tab} onClick={() => enabled && setActiveView(tab)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeView === tab ? "bg-slateblue-600 text-white" : enabled ? "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" : "cursor-not-allowed text-slate-400"}`} title={enabled ? undefined : "This Sensors view is not available yet."}>{tab}</button>;
        })}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Devices" value={inventoryValue(totals.total)} tone="blue" />
        <StatCard label="Active Devices" value={inventoryValue(totals.active)} tone="green" />
        <StatCard label="Inactive Devices" value={inventoryValue(totals.inactive)} tone="red" />
        <StatCard label="Fault Devices" value={inventoryValue(totals.fault)} tone="amber" />
      </div>

      {errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-6 text-sm leading-6 text-slate-500 shadow-sm">
          Loading device records...
        </div>
      ) : null}

      {activeView === "Data Quality" ? <SensorDataQualityView /> : null}
      {activeView === "Calibration" ? <SensorCalibrationView /> : null}
      {activeView === "Maintenance" ? <SensorMaintenanceView /> : null}
      {activeView === "Alerts & Events" ? <SensorAlertsEventsView /> : null}
      {activeView === "Configuration" ? <SensorConfigurationView /> : null}
      {activeView === "All Sensors" && !isLoading && !errorMessage ? <SensorsTable records={realRecords} sensors={realRecords.length ? sensorInventory : []} /> : null}

      {activeView === "All Sensors" ? <SensorRegistrationForm
        onRegistered={(device) => setRecords((current) => [...current, device])}
        onUnauthorized={() => router.replace("/login")}
      /> : null}

      {activeView === "All Sensors" ? <SensorCreateAssignment records={realRecords} isLoading={isLoading} errorMessage={errorMessage} /> : null}

      {activeView === "All Sensors" ? <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-500 shadow-sm">
        {demoRecordCount
          ? `${demoRecordCount} demo device record${demoRecordCount === 1 ? "" : "s"} isolated from the REAL inventory view. Live device integration is not configured yet.`
          : "Live device integration is not configured yet. Device records shown here come from backend storage only."}
      </div> : null}
    </div>
  );
}
