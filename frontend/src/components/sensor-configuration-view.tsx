import { Panel } from "@/components/ui";
import { measurementUnits } from "@/lib/sensor-assignment-options";
import type { ReactNode } from "react";

const unavailable = "Not Available";
const sensorTypes = ["Pressure", "Temperature", "Vibration", "Corrosion", "Strain"];
const channels = ["CH1 - Process", "CH2 - Temperature", "CH3 - Vibration", "CH4 - Battery", "Status"];

function DisabledAction({ children }: { children: string }) {
  return <button type="button" disabled className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">{children}</button>;
}

function ConfigRows({ rows, secondHeader }: { rows: string[]; secondHeader: string }) {
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr><th className="px-3 py-3 font-semibold">{rows[0]}</th><th className="px-3 py-3 font-semibold">{secondHeader}</th></tr></thead><tbody>{rows.slice(1).map((row) => <tr key={row} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row}</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">{unavailable}</td></tr>)}</tbody></table></div>;
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: string; children: ReactNode }) {
  return <Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>{description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}</div>{action ? <DisabledAction>{action}</DisabledAction> : null}</div>{children}</Panel>;
}

export function SensorConfigurationView() {
  const allowedUnitRows = [
    ["Pressure", measurementUnits.filter((unit) => ["bar", "kPa", "MPa", "psi"].includes(unit))],
    ["Temperature", measurementUnits.filter((unit) => ["deg C", "°C", "°F", "K"].includes(unit))],
    ["Vibration", measurementUnits.filter((unit) => ["mm/s", "in/s", "g"].includes(unit))],
    ["Corrosion Rate", measurementUnits.filter((unit) => ["mpy", "mm/y", "mm/yr", "mm/year"].includes(unit))],
    ["Strain", []],
    ["Displacement", measurementUnits.filter((unit) => ["mm", "in", "m"].includes(unit))],
    ["Voltage", measurementUnits.filter((unit) => ["mV", "V vs CSE"].includes(unit))]
  ] as const;
  const displayUnits = (category: string, units: readonly string[]) => category === "Temperature"
    ? measurementUnits.filter((unit) => unit === "deg C" || unit === "K" || (unit.length === 2 && unit.charCodeAt(0) === 176)).join(", ")
    : units.join(", ");

  return <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Sensor Type Templates" description="Manage sensor type definitions, default settings and metadata." action="Add Type"><ConfigRows rows={["Type Name", ...sensorTypes]} secondHeader="Measurement / Default Unit / Status / Actions" /></Section>
      <Section title="Channel Templates" description="Define channel configurations for multi-channel sensors." action="Add Channel"><ConfigRows rows={["Channel Name", ...channels]} secondHeader="Data Type / Default Unit / Status / Actions" /></Section>
      <Section title="Data Freshness Thresholds" action="Edit"><ConfigRows rows={["Sensor Type", ...sensorTypes]} secondHeader="Freshness Threshold" /></Section>
      <Section title="Calibration Interval Rules" description="Define default calibration intervals by sensor type." action="Edit"><ConfigRows rows={["Sensor Type", ...sensorTypes]} secondHeader="Calibration Interval" /></Section>
      <Section title="Maintenance Interval Rules" description="Define default maintenance intervals by sensor type." action="Edit"><ConfigRows rows={["Sensor Type", ...sensorTypes]} secondHeader="Maintenance Interval" /></Section>
      <Section title="Battery Warning Thresholds" description="Configure battery level thresholds for low power alerts." action="Edit"><ConfigRows rows={["Device Type", "Wireless Sensor", "Edge Gateway", "Repeater", "Mobile Unit"]} secondHeader="Warning Threshold" /></Section>
      <Section title="Health Score Rules" description="Define how sensor health score is calculated." action="Edit"><ConfigRows rows={["Rule", "Data Freshness", "Signal Quality (RSSI)", "Battery Level", "Data Quality (Outliers)", "Maintenance Status"]} secondHeader="Weight" /></Section>
      <Section title="Routing Defaults" action="Edit"><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Primary Destination", "Backup Destination", "Data Retention Period", "Routing Mode"].map((label) => <label key={label} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}<select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950"><option>{unavailable}</option></select></label>)}</div><label className="mt-4 flex items-center gap-3 text-sm text-slate-500"><input type="checkbox" disabled /> Enable Edge Caching - Cache data at edge when offline</label></Section>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Allowed Units" description="Manage permitted measurement units." action="Edit"><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr><th className="px-3 py-3 font-semibold">Measurement Category</th><th className="px-3 py-3 font-semibold">Allowed Units</th></tr></thead><tbody>{allowedUnitRows.map(([category, units]) => <tr key={category} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-3 py-2 text-slate-700 dark:text-slate-200">{category}</td><td className="px-3 py-2 text-slate-500 dark:text-slate-400">{displayUnits(category, units) || unavailable}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Approved validation dictionary units are shown; strain-specific units remain unavailable pending exact representation approval.</p></Section>
      <Section title="Gateway Templates" action="Add Template"><ConfigRows rows={["Template Name", "Standard Gateway", "High-Capacity Gateway", "Remote Solar Gateway"]} secondHeader="Model / Default Settings / Status / Actions" /></Section>
    </div>

    <Section title="User Configurable Settings" description="General settings for sensor management." action="Save Changes"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{["Default Timezone", "Default Sampling Interval", "New Sensor Status", "Health Score Alert Threshold", "Auto-generate Sensor Name", "Use template for sensor naming", "Require Location"].map((label) => <label key={label} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}<select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-950"><option>{unavailable}</option></select></label>)}<label className="flex items-center gap-3 text-sm font-normal text-slate-500"><input type="checkbox" disabled /> Auto-detect Sensor Type</label><label className="flex items-center gap-3 text-sm font-normal text-slate-500"><input type="checkbox" disabled /> Allow Manual Data Entry</label></div></Section>
  </div>;
}
