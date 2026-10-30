export type DemoDefectStatus = "Open" | "Planned" | "In-Repair" | "Verification" | "Closed";
export type DemoDefectSeverity = "Critical" | "High" | "Medium" | "Low";
export type DemoDefectType = "External Corrosion" | "Internal Corrosion" | "Crack" | "Dent" | "Mechanical Damage";

export type DemoDefectRecord = {
  id: string;
  title: string;
  severity: DemoDefectSeverity;
  status: DemoDefectStatus;
  threatType: DemoDefectType;
  kp: number;
  segment: string;
  depthRatio: string;
  rsf: string;
  failurePressure: string;
  rul: string;
  dueDate: string;
  startMonth: number;
  durationMonths: number;
  owner: string;
  action: string;
  description: string;
  workflowProgress: number;
};

export const defectStatusOrder: DemoDefectStatus[] = ["Open", "Planned", "In-Repair", "Verification", "Closed"];
export const defectSeverityOrder: DemoDefectSeverity[] = ["Critical", "High", "Medium", "Low"];
export const defectTypeOrder: DemoDefectType[] = ["External Corrosion", "Internal Corrosion", "Crack", "Dent", "Mechanical Damage"];

export const demoDefects: DemoDefectRecord[] = [
  {
    id: "F-001",
    title: "External metal loss cluster",
    severity: "Critical",
    status: "Open",
    threatType: "External Corrosion",
    kp: 12.4,
    segment: "SEG-01",
    depthRatio: "68%",
    rsf: "0.72",
    failurePressure: "42.5 bar",
    rul: "8 months",
    dueDate: "2026-10-04",
    startMonth: 0,
    durationMonths: 2,
    owner: "Integrity Eng.",
    action: "Immediate excavation",
    description: "High-depth external corrosion feature near coating holiday. Prioritize field verification and sleeve repair planning.",
    workflowProgress: 12
  },
  {
    id: "F-002",
    title: "Internal corrosion at low point",
    severity: "High",
    status: "Planned",
    threatType: "Internal Corrosion",
    kp: 18.9,
    segment: "SEG-02",
    depthRatio: "54%",
    rsf: "0.81",
    failurePressure: "51.2 bar",
    rul: "16 months",
    dueDate: "2026-10-18",
    startMonth: 1,
    durationMonths: 2,
    owner: "Corrosion Team",
    action: "UT confirmation",
    description: "Internal metal loss indicated around a water hold-up area. Confirm depth and review inhibitor performance.",
    workflowProgress: 28
  },
  {
    id: "F-003",
    title: "Dent with metal loss",
    severity: "High",
    status: "In-Repair",
    threatType: "Dent",
    kp: 27.6,
    segment: "SEG-03",
    depthRatio: "41%",
    rsf: "0.86",
    failurePressure: "58.0 bar",
    rul: "22 months",
    dueDate: "2026-11-08",
    startMonth: 1,
    durationMonths: 3,
    owner: "Repair Crew",
    action: "Composite repair",
    description: "Mechanical dent feature with coincident metal loss. Repair package is active and awaiting coating reinstatement.",
    workflowProgress: 55
  },
  {
    id: "F-004",
    title: "Axial crack-like indication",
    severity: "Critical",
    status: "Verification",
    threatType: "Crack",
    kp: 33.2,
    segment: "SEG-04",
    depthRatio: "N/A",
    rsf: "Review",
    failurePressure: "Pending",
    rul: "Pending",
    dueDate: "2026-09-26",
    startMonth: 0,
    durationMonths: 1,
    owner: "NDE Lead",
    action: "Crack sizing review",
    description: "Crack-like ILI call requires specialist NDE confirmation before accepting or escalating the repair decision.",
    workflowProgress: 78
  },
  {
    id: "F-005",
    title: "Coating anomaly with corrosion",
    severity: "Medium",
    status: "Planned",
    threatType: "External Corrosion",
    kp: 45.7,
    segment: "SEG-05",
    depthRatio: "35%",
    rsf: "0.91",
    failurePressure: "64.8 bar",
    rul: "36 months",
    dueDate: "2026-12-14",
    startMonth: 2,
    durationMonths: 2,
    owner: "CP Technician",
    action: "DCVG survey",
    description: "Moderate external corrosion associated with coating damage. Schedule coating survey and local repair.",
    workflowProgress: 32
  },
  {
    id: "F-006",
    title: "Gouge near road crossing",
    severity: "High",
    status: "In-Repair",
    threatType: "Mechanical Damage",
    kp: 58.3,
    segment: "SEG-06",
    depthRatio: "46%",
    rsf: "0.84",
    failurePressure: "55.6 bar",
    rul: "18 months",
    dueDate: "2026-11-20",
    startMonth: 2,
    durationMonths: 3,
    owner: "ROW Team",
    action: "Expose and grind",
    description: "Mechanical damage feature near road crossing. Work pack includes exposure, inspection, and repair decision.",
    workflowProgress: 61
  },
  {
    id: "F-007",
    title: "Shallow internal pit group",
    severity: "Low",
    status: "Closed",
    threatType: "Internal Corrosion",
    kp: 71.1,
    segment: "SEG-07",
    depthRatio: "18%",
    rsf: "0.97",
    failurePressure: "79.4 bar",
    rul: "> 60 months",
    dueDate: "2026-08-30",
    startMonth: 0,
    durationMonths: 1,
    owner: "Integrity Eng.",
    action: "Monitor next ILI",
    description: "Low-depth pit group reviewed and accepted for monitoring. Closure is based on demo workflow state only.",
    workflowProgress: 100
  },
  {
    id: "F-008",
    title: "External corrosion at support",
    severity: "Medium",
    status: "Open",
    threatType: "External Corrosion",
    kp: 86.5,
    segment: "SEG-08",
    depthRatio: "29%",
    rsf: "0.93",
    failurePressure: "68.7 bar",
    rul: "44 months",
    dueDate: "2027-01-12",
    startMonth: 4,
    durationMonths: 2,
    owner: "Maintenance",
    action: "Support inspection",
    description: "Support-zone corrosion indication. Verify contact condition and improve coating/drainage around support.",
    workflowProgress: 18
  }
];
