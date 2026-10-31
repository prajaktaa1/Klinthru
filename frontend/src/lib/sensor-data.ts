import { DeviceRecord, DeviceType } from "@/lib/types";

export interface SensorSummary {
  id: string;
  type: DeviceType;
  total: number;
  active: number;
  inactive: number;
  fault: number;
}

export const deviceTypeOrder: DeviceType[] = [
  "Flow Meter",
  "Level Switch",
  "Pressure Transmitter",
  "Temperature Sensor",
  "Discharge Sensor",
  "Flow Control Valve",
  "CP Monitoring Module",
  "Pressure Relief Valve (PRV)"
];

export function buildSensorInventory(records: DeviceRecord[]): SensorSummary[] {
  const grouped = new Map<DeviceType, SensorSummary>();

  for (const type of deviceTypeOrder) {
    grouped.set(type, {
      id: type.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      type,
      total: 0,
      active: 0,
      inactive: 0,
      fault: 0
    });
  }

  for (const record of records) {
    const current = grouped.get(record.deviceType);
    if (!current) {
      continue;
    }

    current.total += 1;

    if (record.status === "Active") {
      current.active += 1;
      continue;
    }

    if (record.status === "Inactive") {
      current.inactive += 1;
      continue;
    }

    current.fault += 1;
  }

  return deviceTypeOrder
    .map((type) => grouped.get(type))
    .filter((value): value is SensorSummary => Boolean(value));
}

export function validateSensorSummary(sensor: SensorSummary) {
  return (
    sensor.total >= 0 &&
    sensor.active >= 0 &&
    sensor.inactive >= 0 &&
    sensor.fault >= 0 &&
    sensor.active <= sensor.total &&
    sensor.inactive <= sensor.total &&
    sensor.fault <= sensor.total &&
    sensor.active + sensor.inactive + sensor.fault === sensor.total
  );
}

export function getSensorAvailability(sensor: SensorSummary) {
  if (sensor.total <= 0) {
    return 0;
  }

  return (sensor.active / sensor.total) * 100;
}

export function getSensorTotals(sensors: SensorSummary[]) {
  return sensors.reduce(
    (totals, sensor) => ({
      total: totals.total + sensor.total,
      active: totals.active + sensor.active,
      inactive: totals.inactive + sensor.inactive,
      fault: totals.fault + sensor.fault
    }),
    { total: 0, active: 0, inactive: 0, fault: 0 }
  );
}

/** Inventory status never establishes live connectivity or reading quality. */
export function filterSensorRecords(records: DeviceRecord[], query: string, type: string, status: string) {
  const search = query.trim().toLowerCase();
  return records.filter(record => !record.isDemoData && (!type || record.deviceType === type) && (!status || record.status === status) && (!search || [record.deviceId, record.deviceType, record.pipelineOrLocation].some(value => value.toLowerCase().includes(search))));
}
export function sensorRegistryCsv(records: DeviceRecord[]) {
  const cell = (input: unknown) => { let value = String(input ?? "Not Available"); if (/^[\s]*[=+@-]/.test(value)) value = "'" + value; return '"' + value.replaceAll('"', '""') + '"'; };
  const columns = ["Sensor ID", "Device Type", "Stored Location", "Inventory Status", "Connectivity", "Live Reading", "Battery", "Calibration", "Maintenance", "Registry Updated"];
  return [columns, ...records.filter(record => !record.isDemoData).map(record => [record.deviceId, record.deviceType, record.pipelineOrLocation, record.status, "Not Available", "Not Available", "Not Available", "Not Available", "Not Available", record.lastUpdatedAt])].map(row => row.map(cell).join(",")).join("\r\n");
}
