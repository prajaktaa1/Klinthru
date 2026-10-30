import type { AuthUser } from "@/lib/types";

export type SettingsUser = AuthUser & {
  createdAt: string;
  accountStatus: string | null;
  mfaStatus: string | null;
  employeeId: string | null;
  department: string | null;
  groups: string[] | null;
  accessScope: string[] | null;
  lastLoginAt: string | null;
  defaultTimezone: string | null;
  language: string | null;
};

export type SettingsUsersResponse = {
  users: SettingsUser[];
  contractStatus: "partial" | "complete";
  missingFields: string[];
};

export type SettingsRole = {
  name: AuthUser["role"];
  userCount: number;
};

export type SettingsRolesResponse = {
  roles: SettingsRole[];
  permissionsAvailable: false;
  missingFields: string[];
};

export type SettingsDictionariesResponse = {
  dictionaries: Array<Record<string, unknown>>;
  values: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsUnitsResponse = {
  unitSystem: string | null;
  standards: Array<Record<string, unknown>>;
  conversions: Array<Record<string, unknown>>;
  mappings: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsWorkflowsResponse = {
  workflows: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsThresholdsResponse = {
  registry: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsNotificationsResponse = {
  notifications: Array<Record<string, unknown>>;
  channels: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsSystemConfigurationResponse = {
  environment: Record<string, unknown> | null;
  services: Array<Record<string, unknown>>;
  backup: Record<string, unknown> | null;
  license: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  connectors: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};

export type SettingsAuditLogResponse = {
  events: Array<Record<string, unknown>>;
  contractStatus: "missing" | "partial" | "complete";
  missingFields: string[];
};
