import bcrypt from "bcrypt";

import { env } from "../config/env";
import { DeviceRecord, ReportRecord, StoredAssessment, UserRecord } from "../types/domain";

function getSeedUserPasswords() {
  const passwords = {
    admin: env.seedAdminPassword,
    engineer: env.seedEngineerPassword,
    viewer: env.seedViewerPassword
  };

  const missing = Object.entries(passwords)
    .filter(([, value]) => !value)
    .map(([role]) => role);

  if (missing.length > 0) {
    throw new Error(
      `Missing required seed-user password environment variables for: ${missing.join(", ")}.`
    );
  }

  return passwords as {
    admin: string;
    engineer: string;
    viewer: string;
  };
}

export function createSeedUsers(): UserRecord[] {
  const createdAt = new Date().toISOString();
  const passwords = getSeedUserPasswords();

  return [
    {
      id: "user-admin",
      name: "Klinthru Admin",
      email: "admin@klinthru.local",
      role: "Admin",
      passwordHash: bcrypt.hashSync(passwords.admin, 10),
      createdAt
    },
    {
      id: "user-engineer",
      name: "Klinthru Engineer",
      email: "engineer@klinthru.local",
      role: "Engineer",
      passwordHash: bcrypt.hashSync(passwords.engineer, 10),
      createdAt
    },
    {
      id: "user-viewer",
      name: "Klinthru Viewer",
      email: "viewer@klinthru.local",
      role: "Viewer",
      passwordHash: bcrypt.hashSync(passwords.viewer, 10),
      createdAt
    }
  ];
}

export function createSeedAssessments(): StoredAssessment[] {
  return [];
}

export function createSeedReports(): ReportRecord[] {
  return [];
}

export function createSeedDevices(): DeviceRecord[] {
  const lastUpdatedAt = "2026-07-18T08:00:00.000Z";

  return [
    {
      id: "device-flow-meter-demo-1",
      deviceId: "DEV-FM-001",
      deviceType: "Flow Meter",
      pipelineOrLocation: "Demonstration Loop A",
      status: "Active",
      latestReadingOrState: "128.4",
      unit: "m3/h",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-level-switch-demo-1",
      deviceId: "DEV-LS-001",
      deviceType: "Level Switch",
      pipelineOrLocation: "Demonstration Tank North",
      status: "Inactive",
      latestReadingOrState: "Standby",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-pressure-transmitter-demo-1",
      deviceId: "DEV-PT-001",
      deviceType: "Pressure Transmitter",
      pipelineOrLocation: "Demonstration Line 12",
      status: "Active",
      latestReadingOrState: "18.6",
      unit: "bar",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-temperature-sensor-demo-1",
      deviceId: "DEV-TS-001",
      deviceType: "Temperature Sensor",
      pipelineOrLocation: "Demonstration Line 12",
      status: "Active",
      latestReadingOrState: "29.5",
      unit: "deg C",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-discharge-sensor-demo-1",
      deviceId: "DEV-DS-001",
      deviceType: "Discharge Sensor",
      pipelineOrLocation: "Demonstration Outlet East",
      status: "Fault",
      latestReadingOrState: "Signal fault",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-flow-control-valve-demo-1",
      deviceId: "DEV-FCV-001",
      deviceType: "Flow Control Valve",
      pipelineOrLocation: "Demonstration Valve Station 3",
      status: "Active",
      latestReadingOrState: "45% open",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-cp-module-demo-1",
      deviceId: "DEV-CPM-001",
      deviceType: "CP Monitoring Module",
      pipelineOrLocation: "Demonstration CP Cabinet West",
      status: "Active",
      latestReadingOrState: "-0.92",
      unit: "V vs CSE",
      lastUpdatedAt,
      isDemoData: true
    },
    {
      id: "device-prv-demo-1",
      deviceId: "DEV-PRV-001",
      deviceType: "Pressure Relief Valve (PRV)",
      pipelineOrLocation: "Demonstration Relief Header",
      status: "Inactive",
      latestReadingOrState: "Closed",
      lastUpdatedAt,
      isDemoData: true
    }
  ];
}
