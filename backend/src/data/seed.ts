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
  return [];
}
