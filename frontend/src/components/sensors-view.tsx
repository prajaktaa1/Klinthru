"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SensorsTable } from "@/components/sensors-table";
import { StatCard } from "@/components/ui";
import { fetchDeviceRecords, isBackendUnavailableError, isUnauthorizedError } from "@/lib/apiClient";
import { buildSensorInventory, getSensorTotals } from "@/lib/sensor-data";
import { DeviceRecord } from "@/lib/types";

export function SensorsView() {
  const router = useRouter();
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

  const sensorInventory = buildSensorInventory(records);
  const totals = getSensorTotals(sensorInventory);
  const hasDemoData = records.some((record) => record.isDemoData);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Devices" value={isLoading ? "..." : totals.total} tone="blue" />
        <StatCard label="Active Devices" value={isLoading ? "..." : totals.active} tone="green" />
        <StatCard label="Inactive Devices" value={isLoading ? "..." : totals.inactive} tone="red" />
        <StatCard label="Fault Devices" value={isLoading ? "..." : totals.fault} tone="amber" />
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

      <SensorsTable sensors={sensorInventory} />

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-500 shadow-sm">
        {hasDemoData
          ? "Device values are demonstration data from backend seed records. They are not live IoT readings."
          : "Live device integration is not configured yet. Device records shown here come from backend storage only."}
      </div>
    </div>
  );
}
