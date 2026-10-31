import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalDate = z.string().datetime({ offset: true }).optional().nullable();

export const calibrationStatuses = ["Valid", "Due Soon", "Due", "Overdue", "Failed"] as const;
export const maintenanceStatuses = ["Completed", "In Progress", "Pending", "Cancelled"] as const;
export const eventSeverities = ["Critical", "Warning", "Info"] as const;
export const eventStatuses = ["Open", "Acknowledged", "Resolved"] as const;
export const eventTypes = ["Offline", "Weak Signal", "Low Battery", "Calibration", "Stale", "Hardware Fault"] as const;
export const configurationStatuses = ["Draft", "Published", "Archived"] as const;

export const lifecycleTransitions = {
  calibration: {
    Valid: ["Due Soon", "Due", "Overdue", "Failed"],
    "Due Soon": ["Due", "Overdue", "Valid", "Failed"],
    Due: ["Overdue", "Valid", "Failed"],
    Overdue: ["Valid", "Failed"],
    Failed: ["Valid"]
  },
  maintenance: {
    Pending: ["In Progress", "Cancelled"],
    "In Progress": ["Completed", "Cancelled"],
    Completed: [],
    Cancelled: []
  },
  event: {
    Open: ["Acknowledged", "Resolved"],
    Acknowledged: ["Resolved"],
    Resolved: []
  },
  configuration: {
    Draft: ["Published", "Archived"],
    Published: ["Archived"],
    Archived: []
  }
} as const;

export type LifecycleTransitionKind = keyof typeof lifecycleTransitions;

export function isValidLifecycleTransition(kind: LifecycleTransitionKind, from: string, to: string): boolean {
  return (lifecycleTransitions[kind] as Record<string, readonly string[]>)[from]?.includes(to) ?? false;
}

export function assertValidLifecycleTransition(kind: LifecycleTransitionKind, from: string, to: string): void {
  if (!isValidLifecycleTransition(kind, from, to)) {
    throw new Error(`Invalid ${kind} lifecycle transition: ${from} -> ${to}`);
  }
}

export const calibrationInputSchema = z.object({
  sensorId: z.string().min(1),
  channelId: z.string().min(1).optional().nullable(),
  calibratedAt: optionalDate,
  dueAt: optionalDate,
  status: z.enum(calibrationStatuses),
  provider: optionalText(160),
  result: optionalText(160),
  certificateDocumentId: optionalText(120),
  notes: optionalText(2000)
}).strict();

export const maintenanceInputSchema = z.object({
  sensorId: z.string().min(1).optional().nullable(),
  maintenanceType: z.string().trim().min(1).max(120),
  priority: z.string().trim().min(1).max(40),
  plannedAt: optionalDate,
  dueAt: optionalDate,
  completedAt: optionalDate,
  status: z.enum(maintenanceStatuses),
  workOrder: optionalText(120),
  assignedTo: optionalText(160),
  notes: optionalText(2000)
}).strict();

export const hardwareEventInputSchema = z.object({
  sensorId: z.string().min(1).optional().nullable(),
  gatewayId: z.string().min(1).optional().nullable(),
  eventType: z.enum(eventTypes),
  severity: z.enum(eventSeverities),
  status: z.enum(eventStatuses),
  occurredAt: z.string().datetime({ offset: true }),
  message: z.string().trim().min(1).max(2000),
  source: z.string().trim().min(1).max(120)
}).strict();

export const configurationInputSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(configurationStatuses),
  payload: z.record(z.string(), z.unknown())
}).strict();

export type LifecycleResource = "calibrations" | "maintenance" | "events" | "configuration";
