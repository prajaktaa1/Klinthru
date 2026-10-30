export type SchedulerStatus = "Active" | "Failed" | "Paused";

export type ScheduleJob = {
  id: string;
  name: string;
  connector: string;
  type: string;
  frequency: string;
  nextRun: string;
  lastRun: string;
  duration: string;
  owner: string;
  status: SchedulerStatus;
  active: boolean;
};

export const schedulerJobs: ScheduleJob[] = [
  ["SCADA OPC Ingestion", "SCADA OPC", "Data Ingestion", "Every 15 minutes", "06 Oct 2026 14:30", "06 Oct 2026 14:15", "2m 14s", "System", "Active"],
  ["CP Monitoring Sync", "CP Monitoring", "Data Sync", "Hourly", "06 Oct 2026 15:00", "06 Oct 2026 14:00", "1m 32s", "A. Smith", "Active"],
  ["GIS Asset Update", "GIS System", "Data Synchronization", "Daily at 02:00", "07 Oct 2026 02:00", "06 Oct 2026 02:00", "4m 21s", "M. Chen", "Active"],
  ["SAP Maintenance Data", "SAP", "Data Ingestion", "Daily at 03:00", "07 Oct 2026 03:00", "06 Oct 2026 03:00", "3m 45s", "R. Kumar", "Active"],
  ["Laboratory Results Import", "Laboratory (LIMS)", "Data Ingestion", "Daily at 06:00", "07 Oct 2026 06:00", "06 Oct 2026 06:00", "2m 08s", "S. Patel", "Active"],
  ["ILI Vendor Data Pull", "ILI Vendor", "File Download", "Weekly (Mon 01:00)", "12 Oct 2026 01:00", "05 Oct 2026 01:00", "6m 12s", "D. Wilson", "Active"],
  ["Document Sync", "Document System", "Document Sync", "Daily at 04:00", "07 Oct 2026 04:00", "06 Oct 2026 04:00", "5m 33s", "L. Garcia", "Failed"],
  ["Weather Data Import", "Weather Data", "Data Ingestion", "Every 30 minutes", "06 Oct 2026 14:30", "06 Oct 2026 14:00", "1m 11s", "T. Brown", "Active"],
  ["Third Party Reports", "Third Party Reports", "File Ingestion", "Weekly (Sun 23:00)", "11 Oct 2026 23:00", "04 Oct 2026 23:00", "7m 02s", "K. Ito", "Active"],
  ["Manual Upload Processing", "Manual Upload", "Data Processing", "Daily at 08:00", "07 Oct 2026 08:00", "06 Oct 2026 08:00", "3m 19s", "E. Martin", "Active"]
].map((row, index) => ({ id: `schedule-${index + 1}`, name: row[0], connector: row[1], type: row[2], frequency: row[3], nextRun: row[4], lastRun: row[5], duration: row[6], owner: row[7], status: row[8] as SchedulerStatus, active: row[8] !== "Paused" }));

export const schedulerTimeline = [
  ["03:00 - 03:05", "SAP Maintenance Data", "success"], ["04:00 - 04:06", "Document Sync", "success"],
  ["06:00 - 06:02", "Laboratory Results Import", "success"], ["08:00 - 08:03", "Manual Upload Processing", "success"],
  ["Every 15 minutes", "SCADA OPC Ingestion (Recurring)", "success"], ["Every 30 minutes", "Weather Data Import (Recurring)", "failed"]
] as const;

