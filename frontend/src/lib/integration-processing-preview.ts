export type ProcessingStatus = "Success" | "Failed" | "Warning" | "Pending";
export type ProcessingLog = {
  id: string;
  timestamp: string;
  connector: string;
  runId: string;
  messageType: string;
  status: ProcessingStatus;
  records: number;
  duration: number;
  severity: "Info" | "Warning" | "Error";
  retries: number;
  sourceSystem: string;
  targetSystem: string;
  payloadSize: string;
  message: string;
};
const sources = ["SCADA OPC", "CP Monitoring", "SAP", "GIS", "Maximo", "Laboratory (LIMS)", "ILI Vendor", "Document System", "Weather Data", "Third Party Reports"];
const messageTypes = ["Sensor Data", "CP Readings", "Asset Master", "Spatial Data", "Work Orders", "Lab Results", "ILI Data", "Documents", "Environmental", "Inspection Data"];
export function createProcessingPreviewLogs(): ProcessingLog[] {
  const reference: [string, number, ProcessingStatus, number, number][] = [
    ["14:25:12", 0, "Success", 256432, 134], ["14:22:03", 1, "Success", 48921, 68],
    ["14:18:47", 2, "Success", 6432, 48], ["14:15:26", 3, "Failed", 0, 36],
    ["14:12:11", 4, "Success", 4221, 112], ["14:08:33", 5, "Success", 2876, 76],
    ["14:05:19", 6, "Success", 1245, 58], ["14:02:07", 7, "Success", 842, 47],
    ["13:58:41", 8, "Warning", 320, 39], ["13:54:13", 9, "Success", 1334, 81]
  ];
  function make(time: string, source: number, status: ProcessingStatus, records: number, duration: number, serial: number): ProcessingLog {
    const prefix = ["SCADA", "CP", "SAP", "GIS", "MAXIMO", "LIMS", "ILI", "DOCS", "WEATHER", "REPORTS"][source];
    return {
      id: `sample-log-${serial}`, timestamp: `2026-10-06T${time}`, connector: sources[source],
      runId: `SYNC-20261006-${String(serial).padStart(4, "0")}`, messageType: messageTypes[source], status, records, duration,
      severity: status === "Failed" ? "Error" : status === "Warning" ? "Warning" : "Info", retries: status === "Failed" ? 2 : 0,
      sourceSystem: `${prefix}-PROD-01`, targetSystem: "KLINTHRU-INGEST-01", payloadSize: serial === 17 ? "12.4 MB" : `${Math.max(.1, records / 20680).toFixed(1)} MB`,
      message: status === "Success" ? "Data ingested successfully. All records processed and validated without errors." : status === "Failed" ? "Spatial data validation failed. The coordinate reference system is missing or unsupported. No records were routed. Review the source mapping before retrying." : status === "Warning" ? "Data processed with warnings. Some optional environmental readings were missing and were accepted with a quality flag." : "Payload is queued and waiting for an available processing worker."
    };
  }
  const visible = reference.map(([time, source, status, records, duration], index) => make(time, source, status, records, duration, 17 - index));
  // Additional local examples support filtering, export, and the reference totals.
  // These entries are generated deterministically and are never persisted or sent to the backend.
  const statuses: ProcessingStatus[] = [...Array<ProcessingStatus>(290).fill("Success"), ...Array<ProcessingStatus>(23).fill("Failed"), ...Array<ProcessingStatus>(15).fill("Warning"), ...Array<ProcessingStatus>(4).fill("Pending")];
  const extra = statuses.map((_, index) => {
    const status = statuses[(index * 73) % statuses.length];
    const hourlyCounts = [9, 8, 11, 8, 8, 11, 17, 36, 70, 76, 36, 18, 14, 10];
    let hour = 0, offset = index;
    while (offset >= hourlyCounts[hour]) { offset -= hourlyCounts[hour]; hour += 1; }
    const minutes = hour * 60 + Math.floor(offset * (hour === 13 ? 50 : 60) / hourlyCounts[hour]);
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(index * 17 % 60).padStart(2, "0")}`;
    return make(time, index % sources.length, status, status === "Failed" || status === "Pending" ? 0 : 100 + index * 37 % 18000, 20 + index * 11 % 150, 1000 + index);
  });
  return [...visible, ...extra];
}
export function formatProcessingDuration(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s` : `${seconds}s`;
}
export function formatProcessingTimestamp(value: string): string {
  return `${value.slice(8, 10)} Oct ${value.slice(0, 4)} ${value.slice(11)}`;
}
export function sampleProcessingPayload(log: ProcessingLog) {
  return {
    sample: true,
    notice: "Illustrative payload only. Records below are a small example, not the complete source payload.",
    syncRunId: log.runId, connector: log.connector, messageType: log.messageType,
    timestamp: `${log.timestamp}+05:30`, format: "JSON", recordCount: log.records, status: log.status,
    records: log.records ? [{ asset_id: "PIPE-001", source_system: log.sourceSystem, pressure_kpa: 101.325, temperature_c: 25.6, quality: log.status === "Warning" ? "Flagged" : "Good" }] : [],
    message: log.message
  };
}
