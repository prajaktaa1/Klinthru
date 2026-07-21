import bcrypt from "bcrypt";

import { env } from "../config/env";
import { createSeedAssessments, createSeedDevices, createSeedReports, createSeedUsers } from "./seed";
import { getPrismaClient } from "../lib/prisma";
import { createId } from "../lib/ids";
import {
  AuthUser,
  AssessmentPipeDataRecord,
  AssessmentPipeDataSummary,
  DeviceRecord,
  ReportRecord,
  StoredAssessment,
  UserRecord
} from "../types/domain";

type CreateAssessmentInput = Omit<StoredAssessment, "authorId"> & { authorId?: string };
type CreateReportInput = Omit<ReportRecord, "id" | "createdAt" | "generatedAt" | "authorId"> & {
  generatedAt?: string;
  createdAt?: string;
  authorId?: string;
};
type ReportSearch = {
  pipelineName?: string;
  reportId?: string;
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
};
type SaveExternalPipeDataInput = {
  id?: string;
  assessment: StoredAssessment;
  authorId?: string;
};
type ExternalPipeDataSearch = {
  assessmentType?: StoredAssessment["type"] | "All";
  pipelineName?: string;
  pipeId?: string;
  locationId?: string;
  savedDate?: string;
};
type DeviceSearch = {
  deviceType?: DeviceRecord["deviceType"];
  status?: DeviceRecord["status"];
};

const SEED_PASSWORDS_BY_EMAIL: Record<string, string> = {
  "admin@klinthru.local": env.seedAdminPassword,
  "engineer@klinthru.local": env.seedEngineerPassword,
  "viewer@klinthru.local": env.seedViewerPassword
};

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function toRole(role: string): "Admin" | "Engineer" | "Viewer" {
  if (role === "Admin" || role === "Engineer" || role === "Viewer") {
    return role;
  }

  return "Viewer";
}

class MemoryStore {
  private readonly users = createSeedUsers();
  private readonly assessments = createSeedAssessments();
  private readonly reports = createSeedReports();
  private readonly externalPipeData: AssessmentPipeDataRecord[] = [];
  private readonly devices = createSeedDevices();

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async listAssessments(): Promise<StoredAssessment[]> {
    return [...this.assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    const assessment: StoredAssessment = {
      ...input,
      authorId: input.authorId
    };
    this.assessments.unshift(assessment);
    return assessment;
  }

  async listReports(search: ReportSearch = {}): Promise<ReportRecord[]> {
    return [...this.reports]
      .filter((report) => matchesReportSearch(report, search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReport(input: CreateReportInput): Promise<ReportRecord> {
    const duplicate = this.reports.find(
      (report) =>
        report.assessmentId === input.assessmentId &&
        report.assessmentType === input.assessmentType &&
        report.pipelineName === input.pipelineName &&
        report.riskLevel === input.riskLevel &&
        JSON.stringify(report.input) === JSON.stringify(input.input) &&
        JSON.stringify(report.result) === JSON.stringify(input.result) &&
        (report.authorId ?? "") === (input.authorId ?? "")
    );

    if (duplicate) {
      return duplicate;
    }

    const timestamp = new Date().toISOString();
    const user = input.authorId
      ? this.users.find((candidate) => candidate.id === input.authorId) ?? null
      : null;
    const report: ReportRecord = {
      id: createId("report"),
      assessmentId: input.assessmentId,
      assessmentType: input.assessmentType,
      pipelineName: input.pipelineName,
      riskLevel: input.riskLevel,
      input: input.input,
      result: input.result,
      generatedAt: input.generatedAt ?? timestamp,
      createdAt: input.createdAt ?? timestamp,
      authorId: input.authorId,
      createdByName: user?.name ?? "Unknown User",
      createdByEmail: user?.email ?? ""
    };
    this.reports.unshift(report);
    return report;
  }

  async findReportById(id: string, search: ReportSearch = {}): Promise<ReportRecord | null> {
    const record = this.reports.find((report) => report.id === id) ?? null;
    if (!record) {
      return null;
    }

    return matchesReportSearch(record, search) ? record : null;
  }

  async listExternalPipeData(search: ExternalPipeDataSearch): Promise<AssessmentPipeDataSummary[]> {
    return this.externalPipeData
      .filter((record) => matchesExternalPipeDataSearch(record, search))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .map(toExternalPipeDataSummary);
  }

  async findExternalPipeDataById(id: string): Promise<AssessmentPipeDataRecord | null> {
    return this.externalPipeData.find((record) => record.id === id) ?? null;
  }

  async saveExternalPipeData(input: SaveExternalPipeDataInput): Promise<AssessmentPipeDataRecord> {
    const timestamp = new Date().toISOString();
    const pipeLocationId = String(input.assessment.input.pipeLocationId ?? "").trim();
    const user = input.authorId
      ? this.users.find((candidate) => candidate.id === input.authorId) ?? null
      : null;

    const record: AssessmentPipeDataRecord = {
      id: input.id ?? createId("pipe"),
      assessmentType: input.assessment.type,
      pipelineName: input.assessment.pipelineName,
      pipeId: pipeLocationId,
      locationId: pipeLocationId,
      savedAt: timestamp,
      savedByName: user?.name ?? "Unknown User",
      savedByEmail: user?.email ?? "",
      assessment: {
        ...input.assessment,
        id: input.assessment.id || createId("assessment"),
        authorId: input.authorId
      }
    };

    const index = this.externalPipeData.findIndex((candidate) => candidate.id === record.id);
    if (index >= 0) {
      this.externalPipeData[index] = record;
    } else {
      this.externalPipeData.unshift(record);
    }

    return record;
  }

  async listDevices(search: DeviceSearch = {}): Promise<DeviceRecord[]> {
    return this.devices
      .filter((device) => matchesDeviceSearch(device, search))
      .sort((a, b) => {
        const typeOrder = a.deviceType.localeCompare(b.deviceType);
        if (typeOrder !== 0) {
          return typeOrder;
        }

        return a.deviceId.localeCompare(b.deviceId);
      });
  }
}

function getSavedDateRange(savedDate: string): { start: Date; end: Date } | null {
  const trimmed = savedDate.trim();
  if (!trimmed) {
    return null;
  }

  const start = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function containsIgnoreCase(value: string, search: string | undefined) {
  if (!search?.trim()) {
    return true;
  }

  return value.toLowerCase().includes(search.trim().toLowerCase());
}

function matchesViewerScope(authorId: string | undefined, search: ReportSearch) {
  if (!search.viewerUserId || search.viewerRole === "Admin") {
    return true;
  }

  return authorId === search.viewerUserId;
}

function matchesReportSearch(record: ReportRecord, search: ReportSearch) {
  if (!matchesViewerScope(record.authorId, search)) {
    return false;
  }

  if (!containsIgnoreCase(record.pipelineName, search.pipelineName)) {
    return false;
  }

  if (!containsIgnoreCase(record.id, search.reportId)) {
    return false;
  }

  return true;
}

function matchesExternalPipeDataSearch(record: AssessmentPipeDataSummary, search: ExternalPipeDataSearch) {
  if (search.assessmentType && search.assessmentType !== "All" && record.assessmentType !== search.assessmentType) {
    return false;
  }

  if (!containsIgnoreCase(record.pipelineName, search.pipelineName)) {
    return false;
  }

  if (!containsIgnoreCase(record.pipeId, search.pipeId)) {
    return false;
  }

  if (!containsIgnoreCase(record.locationId, search.locationId)) {
    return false;
  }

  const dateRange = search.savedDate ? getSavedDateRange(search.savedDate) : null;
  if (!dateRange) {
    return true;
  }

  const savedAt = new Date(record.savedAt);
  return savedAt >= dateRange.start && savedAt < dateRange.end;
}

function matchesDeviceSearch(record: DeviceRecord, search: DeviceSearch) {
  if (search.deviceType && record.deviceType !== search.deviceType) {
    return false;
  }

  if (search.status && record.status !== search.status) {
    return false;
  }

  return true;
}

function toExternalPipeDataSummary(record: AssessmentPipeDataRecord): AssessmentPipeDataSummary {
  return {
    id: record.id,
    assessmentType: record.assessmentType,
    pipelineName: record.pipelineName,
    pipeId: record.pipeId,
    locationId: record.locationId,
    savedAt: record.savedAt,
    savedByName: record.savedByName,
    savedByEmail: record.savedByEmail
  };
}

class PrismaStore {
  async ensureSeeded(): Promise<void> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return;
    }

    for (const user of createSeedUsers()) {
      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            role: toRole(user.role)
          }
        });
      } else {
        const seedPassword = SEED_PASSWORDS_BY_EMAIL[user.email];
        if (!seedPassword) {
          throw new Error(`Missing seed password for ${user.email}.`);
        }

        const matches = await bcrypt.compare(
          seedPassword,
          existing.passwordHash
        );

        if (!matches) {
          await prisma.user.update({
            where: { email: user.email },
            data: { passwordHash: user.passwordHash, name: user.name, role: toRole(user.role) }
          });
        }
      }
    }

    for (const device of createSeedDevices()) {
      const existing = await prisma.deviceRecord.findUnique({ where: { deviceId: device.deviceId } });
      if (!existing) {
        await prisma.deviceRecord.create({
          data: {
            id: device.id,
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            pipelineOrLocation: device.pipelineOrLocation,
            status: device.status,
            latestReadingOrState: device.latestReadingOrState,
            unit: device.unit,
            lastUpdatedAt: new Date(device.lastUpdatedAt),
            isDemoData: device.isDemoData
          }
        });
      } else {
        await prisma.deviceRecord.update({
          where: { deviceId: device.deviceId },
          data: {
            deviceType: device.deviceType,
            pipelineOrLocation: device.pipelineOrLocation,
            status: device.status,
            latestReadingOrState: device.latestReadingOrState,
            unit: device.unit,
            lastUpdatedAt: new Date(device.lastUpdatedAt),
            isDemoData: device.isDemoData
          }
        });
      }
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    };
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    };
  }

  async listAssessments(): Promise<StoredAssessment[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.assessment.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((record: any) => ({
      id: record.id,
      type: record.type as StoredAssessment["type"],
      pipelineName: record.pipelineName,
      createdAt: record.createdAt.toISOString(),
      riskLevel: record.riskLevel as StoredAssessment["riskLevel"],
      riskScore: record.riskScore,
      input: record.input as StoredAssessment["input"],
      result: record.result as StoredAssessment["result"],
      authorId: record.authorId ?? undefined
    }));
  }

  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return input;
    }

    const record = await prisma.assessment.create({
      data: {
        id: input.id,
        type: input.type,
        pipelineName: input.pipelineName,
        riskLevel: input.riskLevel,
        riskScore: input.riskScore,
        input: input.input ?? {},
        result: input.result ?? {},
        createdAt: new Date(input.createdAt),
        authorId: input.authorId
      }
    });

    return {
      id: record.id,
      type: record.type as StoredAssessment["type"],
      pipelineName: record.pipelineName,
      createdAt: record.createdAt.toISOString(),
      riskLevel: record.riskLevel as StoredAssessment["riskLevel"],
      riskScore: record.riskScore,
      input: record.input as StoredAssessment["input"],
      result: record.result as StoredAssessment["result"],
      authorId: record.authorId ?? undefined
    };
  }

  async listReports(search: ReportSearch = {}): Promise<ReportRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.report.findMany({
      where: {
        pipelineName: search.pipelineName
          ? { contains: search.pipelineName.trim(), mode: "insensitive" }
          : undefined,
        id: search.reportId ? { contains: search.reportId.trim(), mode: "insensitive" } : undefined,
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });
    return records.map((record: any) => ({
      id: record.id,
      assessmentId: record.assessmentId,
      assessmentType: record.assessmentType as ReportRecord["assessmentType"],
      pipelineName: record.pipelineName,
      riskLevel: record.riskLevel as ReportRecord["riskLevel"],
      input: record.input as ReportRecord["input"],
      result: record.result as ReportRecord["result"],
      generatedAt: record.generatedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
      authorId: record.authorId ?? undefined,
      createdByName: record.author?.name ?? "Unknown User",
      createdByEmail: record.author?.email ?? ""
    }));
  }

  async createReport(input: CreateReportInput): Promise<ReportRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      const timestamp = new Date().toISOString();
      return {
        id: createId("report"),
        assessmentId: input.assessmentId,
        assessmentType: input.assessmentType,
        pipelineName: input.pipelineName,
        riskLevel: input.riskLevel,
        input: input.input,
        result: input.result,
        generatedAt: input.generatedAt ?? timestamp,
        createdAt: input.createdAt ?? timestamp,
        authorId: input.authorId
      };
    }

    const duplicate = await prisma.report.findFirst({
      where: {
        assessmentId: input.assessmentId,
        assessmentType: input.assessmentType,
        pipelineName: input.pipelineName,
        riskLevel: input.riskLevel,
        authorId: input.authorId,
        input: { equals: input.input ?? {} },
        result: { equals: input.result ?? {} }
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });

    if (duplicate) {
      return {
        id: duplicate.id,
        assessmentId: duplicate.assessmentId,
        assessmentType: duplicate.assessmentType as ReportRecord["assessmentType"],
        pipelineName: duplicate.pipelineName,
        riskLevel: duplicate.riskLevel as ReportRecord["riskLevel"],
        input: duplicate.input as ReportRecord["input"],
        result: duplicate.result as ReportRecord["result"],
        generatedAt: duplicate.generatedAt.toISOString(),
        createdAt: duplicate.createdAt.toISOString(),
        authorId: duplicate.authorId ?? undefined,
        createdByName: duplicate.author?.name ?? "Unknown User",
        createdByEmail: duplicate.author?.email ?? ""
      };
    }

    const record = await prisma.report.create({
      data: {
        assessmentId: input.assessmentId,
        assessmentType: input.assessmentType,
        pipelineName: input.pipelineName,
        riskLevel: input.riskLevel,
        input: input.input ?? {},
        result: input.result ?? {},
        generatedAt: new Date(input.generatedAt ?? new Date().toISOString()),
        createdAt: new Date(input.createdAt ?? new Date().toISOString()),
        authorId: input.authorId
      },
      include: { author: true }
    });

    return {
      id: record.id,
      assessmentId: record.assessmentId,
      assessmentType: record.assessmentType as ReportRecord["assessmentType"],
      pipelineName: record.pipelineName,
      riskLevel: record.riskLevel as ReportRecord["riskLevel"],
      input: record.input as ReportRecord["input"],
      result: record.result as ReportRecord["result"],
      generatedAt: record.generatedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
      authorId: record.authorId ?? undefined,
      createdByName: record.author?.name ?? "Unknown User",
      createdByEmail: record.author?.email ?? ""
    };
  }

  async findReportById(id: string, search: ReportSearch = {}): Promise<ReportRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.report.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!record) {
      return null;
    }

    const normalized: ReportRecord = {
      id: record.id,
      assessmentId: record.assessmentId,
      assessmentType: record.assessmentType as ReportRecord["assessmentType"],
      pipelineName: record.pipelineName,
      riskLevel: record.riskLevel as ReportRecord["riskLevel"],
      input: record.input as ReportRecord["input"],
      result: record.result as ReportRecord["result"],
      generatedAt: record.generatedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
      authorId: record.authorId ?? undefined,
      createdByName: record.author?.name ?? "Unknown User",
      createdByEmail: record.author?.email ?? ""
    };

    return matchesReportSearch(normalized, search) ? normalized : null;
  }

  async listExternalPipeData(search: ExternalPipeDataSearch): Promise<AssessmentPipeDataSummary[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const dateRange = search.savedDate ? getSavedDateRange(search.savedDate) : null;
    const records = await prisma.externalPipeData.findMany({
      where: {
        type:
          search.assessmentType && search.assessmentType !== "All"
            ? search.assessmentType
            : undefined,
        pipelineName: search.pipelineName
          ? { contains: search.pipelineName.trim(), mode: "insensitive" }
          : undefined,
        pipeId: search.pipeId ? { contains: search.pipeId.trim(), mode: "insensitive" } : undefined,
        locationId: search.locationId
          ? { contains: search.locationId.trim(), mode: "insensitive" }
          : undefined,
        createdAt: dateRange
          ? {
              gte: dateRange.start,
              lt: dateRange.end
            }
          : undefined
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });

    return records.map((record: any) =>
      toExternalPipeDataSummary({
        id: record.id,
        assessmentType: record.type as StoredAssessment["type"],
        pipelineName: record.pipelineName,
        pipeId: record.pipeId ?? "",
        locationId: record.locationId ?? "",
        savedAt: record.createdAt.toISOString(),
        savedByName: record.author?.name ?? "Unknown User",
        savedByEmail: record.author?.email ?? "",
        assessment: {
          id: record.id,
          type: record.type as StoredAssessment["type"],
          pipelineName: record.pipelineName,
          createdAt: record.createdAt.toISOString(),
          riskLevel: record.result.riskLevel as StoredAssessment["riskLevel"],
          riskScore: Number(record.result.riskScore ?? 0),
          input: record.input as StoredAssessment["input"],
          result: record.result as StoredAssessment["result"],
          authorId: record.authorId ?? undefined
        }
      })
    );
  }

  async findExternalPipeDataById(id: string): Promise<AssessmentPipeDataRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.externalPipeData.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      assessmentType: record.type as StoredAssessment["type"],
      pipelineName: record.pipelineName,
      pipeId: record.pipeId ?? "",
      locationId: record.locationId ?? "",
      savedAt: record.createdAt.toISOString(),
      savedByName: record.author?.name ?? "Unknown User",
      savedByEmail: record.author?.email ?? "",
      assessment: {
        id: record.id,
        type: record.type as StoredAssessment["type"],
        pipelineName: record.pipelineName,
        createdAt: record.createdAt.toISOString(),
        riskLevel: record.result.riskLevel as StoredAssessment["riskLevel"],
        riskScore: Number(record.result.riskScore ?? 0),
        input: record.input as StoredAssessment["input"],
        result: record.result as StoredAssessment["result"],
        authorId: record.authorId ?? undefined
      }
    };
  }

  async saveExternalPipeData(input: SaveExternalPipeDataInput): Promise<AssessmentPipeDataRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return {
        id: input.id ?? createId("pipe"),
        assessmentType: input.assessment.type,
        pipelineName: input.assessment.pipelineName,
        pipeId: String(input.assessment.input.pipeLocationId ?? "").trim(),
        locationId: String(input.assessment.input.pipeLocationId ?? "").trim(),
        savedAt: new Date().toISOString(),
        savedByName: "Unknown User",
        savedByEmail: "",
        assessment: input.assessment
      };
    }

    const pipeLocationId = String(input.assessment.input.pipeLocationId ?? "").trim();
    const savedAt = new Date().toISOString();
    const record =
      input.id
        ? await prisma.externalPipeData.update({
            where: { id: input.id },
            data: {
              type: input.assessment.type,
              pipelineName: input.assessment.pipelineName,
              pipeId: pipeLocationId,
              locationId: pipeLocationId,
              input: input.assessment.input ?? {},
              result: input.assessment.result ?? {},
              authorId: input.authorId
            },
            include: { author: true }
          })
        : await prisma.externalPipeData.create({
            data: {
              type: input.assessment.type,
              pipelineName: input.assessment.pipelineName,
              pipeId: pipeLocationId,
              locationId: pipeLocationId,
              input: input.assessment.input ?? {},
              result: input.assessment.result ?? {},
              authorId: input.authorId
            },
            include: { author: true }
          });

    return {
      id: record.id,
      assessmentType: record.type as StoredAssessment["type"],
      pipelineName: record.pipelineName,
      pipeId: record.pipeId ?? "",
      locationId: record.locationId ?? "",
      savedAt: record.createdAt?.toISOString?.() ?? savedAt,
      savedByName: record.author?.name ?? "Unknown User",
      savedByEmail: record.author?.email ?? "",
      assessment: {
        id: record.id,
        type: record.type as StoredAssessment["type"],
        pipelineName: record.pipelineName,
        createdAt: record.createdAt?.toISOString?.() ?? savedAt,
        riskLevel: record.result.riskLevel as StoredAssessment["riskLevel"],
        riskScore: Number(record.result.riskScore ?? 0),
        input: record.input as StoredAssessment["input"],
        result: record.result as StoredAssessment["result"],
        authorId: record.authorId ?? undefined
      }
    };
  }

  async listDevices(search: DeviceSearch = {}): Promise<DeviceRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.deviceRecord.findMany({
      where: {
        deviceType: search.deviceType,
        status: search.status
      },
      orderBy: [{ deviceType: "asc" }, { deviceId: "asc" }]
    });

    return records.map((record: any) => ({
      id: record.id,
      deviceId: record.deviceId,
      deviceType: record.deviceType as DeviceRecord["deviceType"],
      pipelineOrLocation: record.pipelineOrLocation,
      status: record.status as DeviceRecord["status"],
      latestReadingOrState: record.latestReadingOrState,
      unit: record.unit ?? undefined,
      lastUpdatedAt: record.lastUpdatedAt.toISOString(),
      isDemoData: Boolean(record.isDemoData)
    }));
  }
}

const memoryStore = new MemoryStore();
const prismaStore = env.databaseUrl ? new PrismaStore() : null;

async function usePrisma(): Promise<boolean> {
  if (!prismaStore) {
    return false;
  }

  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.$connect();
    await prismaStore.ensureSeeded();
    return true;
  } catch (error) {
    console.warn("Prisma unavailable, falling back to in-memory storage.", error);
    return false;
  }
}

export const store = {
  toAuthUser,
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findUserByEmail(email);
    }

    return memoryStore.findUserByEmail(email);
  },
  async findUserById(id: string): Promise<UserRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findUserById(id);
    }

    return memoryStore.findUserById(id);
  },
  async listAssessments(): Promise<StoredAssessment[]> {
    if (await usePrisma()) {
      return prismaStore!.listAssessments();
    }

    return memoryStore.listAssessments();
  },
  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    if (await usePrisma()) {
      return prismaStore!.createAssessment(input);
    }

    return memoryStore.createAssessment(input);
  },
  async listReports(search: ReportSearch = {}): Promise<ReportRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listReports(search);
    }

    return memoryStore.listReports(search);
  },
  async createReport(input: CreateReportInput): Promise<ReportRecord> {
    if (await usePrisma()) {
      return prismaStore!.createReport(input);
    }

    return memoryStore.createReport(input);
  },
  async findReportById(id: string, search: ReportSearch = {}): Promise<ReportRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findReportById(id, search);
    }

    return memoryStore.findReportById(id, search);
  },
  async listExternalPipeData(search: ExternalPipeDataSearch): Promise<AssessmentPipeDataSummary[]> {
    if (await usePrisma()) {
      return prismaStore!.listExternalPipeData(search);
    }

    return memoryStore.listExternalPipeData(search);
  },
  async findExternalPipeDataById(id: string): Promise<AssessmentPipeDataRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findExternalPipeDataById(id);
    }

    return memoryStore.findExternalPipeDataById(id);
  },
  async saveExternalPipeData(input: SaveExternalPipeDataInput): Promise<AssessmentPipeDataRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveExternalPipeData(input);
    }

    return memoryStore.saveExternalPipeData(input);
  },
  async listDevices(search: DeviceSearch = {}): Promise<DeviceRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listDevices(search);
    }

    return memoryStore.listDevices(search);
  }
};
