import { masterSnapshot, recordMasterChange } from "./masterChangeEvents";
import { readAssetMetadata, saveAssetMetadata } from "./assetMetadataPersistence";
import { readCommissioningDate, saveCommissioningDate } from "./pipelineDatesPersistence";
import { validateSegmentOverlap } from "../validation/segmentOverlapValidation";
import { readChainageSettings, saveChainageSettings, saveNumericChainage } from "./chainagePersistence";
import bcrypt from "bcrypt";

import { allowMemoryStorage, env, isProduction } from "../config/env";
import { createSeedAssessments, createSeedDevices, createSeedReports, createSeedUsers } from "./seed";
import { getPrismaClient } from "../lib/prisma";
import { createId } from "../lib/ids";
import { updateSaveDiagnostics } from "../middleware/saveDiagnostics";
import {
  AuthUser,
  AssessmentPipeDataRecord,
  AssessmentPipeDataSummary,
  AssetInput,
  AssetRecord,
  CpCalculationInput,
  CpCalculationRecord,
  CpPotentialReadingSummary,
  CpRectifierInput,
  CpRectifierRecord,
  CpRectifierUpdateInput,
  CpTestPointLatestReadings,
  CpTestPointInput,
  CpTestPointRecord,
  CpTestPointUpdateInput,
  DeviceRecord,
  PipelineHistory,
  PipelineHistoryRecord,
  PipelineInput,
  PipelineRecord,
  ReportRecord,
  SensorAssignmentInput,
  SensorAssignmentRecord,
  SegmentInput,
  SegmentRecord,
  StoredAssessment,
  UserRecord
} from "../types/domain";
import { normalizePipelineCode } from "../validation/pipelineValidation";
import { createValidationError } from "../validation/validationErrors";

type CreateAssessmentInput = Omit<StoredAssessment, "authorId"> & { authorId?: string };
type CreateReportInput = Omit<ReportRecord, "id" | "createdAt" | "generatedAt" | "authorId"> & {
  generatedAt?: string;
  createdAt?: string;
  authorId?: string;
};
type ReportSearch = {
  pipelineId?: string;
  pipelineName?: string;
  reportId?: string;
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
};
type OwnershipScope = {
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
  viewerCompanyId?: string;
};
type PipelineSearch = OwnershipScope & {
  search?: string;
  archivedOnly?: boolean;
};
type SavePipelineInput = {
  auditUserId?: string;
  pipeline: PipelineInput;
  createdById?: string;
  companyId?: string;
};
type SegmentSearch = OwnershipScope & {
  pipelineId?: string;
};
type SaveSegmentInput = {
  auditUserId?: string;
  id?: string;
  segment: SegmentInput;
  companyId?: string;
};
type AssetSearch = OwnershipScope & {
  pipelineId?: string;
  segmentId?: string;
  assetType?: AssetRecord["assetType"];
  physicalStatus?: AssetRecord["physicalStatus"];
};
type SaveAssetInput = {
  auditUserId?: string;
  id?: string;
  asset: AssetInput;
  companyId?: string;
};
type CpAssetSearch = OwnershipScope & {
  pipelineId?: string;
};
type SaveCpTestPointInput = {
  id?: string;
  testPoint: CpTestPointInput | CpTestPointUpdateInput;
  companyId?: string;
};
type SaveCpRectifierInput = {
  id?: string;
  rectifier: CpRectifierInput | CpRectifierUpdateInput;
  companyId?: string;
};
type CpCalculationSearch = OwnershipScope & {
  pipelineId?: string;
};
type SaveCpCalculationInput = OwnershipScope & {
  calculation: CpCalculationInput;
  authorId?: string;
};
type SaveExternalPipeDataInput = {
  id?: string;
  assessment: StoredAssessment;
  authorId?: string;
};
type ExternalPipeDataSearch = {
  assessmentType?: StoredAssessment["type"] | "All";
  pipelineId?: string;
  pipelineName?: string;
  pipeId?: string;
  locationId?: string;
  inspectionYear?: string;
  savedDate?: string;
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
};
type DeviceSearch = {
  deviceType?: DeviceRecord["deviceType"];
  status?: DeviceRecord["status"];
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
};
type CreateDeviceInput = {
  device: Omit<DeviceRecord, "id" | "lastUpdatedAt" | "isDemoData" | "authorId">;
  isDemoData?: boolean;
  authorId?: string;
};
type UpdateDeviceLocationInput = {
  pipelineOrLocation: string;
};
type SensorAssignmentSearch = {
  search?: string;
  sensorCategory?: SensorAssignmentRecord["sensorCategory"];
  sensorDeviceType?: string;
  assignmentStatus?: SensorAssignmentRecord["assignmentStatus"];
  dataSource?: SensorAssignmentRecord["dataSource"];
  pipelineOrAsset?: string;
  viewerUserId?: string;
  viewerRole?: AuthUser["role"];
};
type SaveSensorAssignmentInput = {
  id?: string;
  assignment: SensorAssignmentInput;
  authorId?: string;
};
type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: AuthUser["role"];
  companyName?: string;
};

const SEED_PASSWORDS_BY_EMAIL: Record<string, string> = {
  "admin@klinthru.local": env.seedAdminPassword,
  "engineer@klinthru.local": env.seedEngineerPassword,
  "viewer@klinthru.local": env.seedViewerPassword
};

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is unavailable. Permanent storage could not be reached.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export type StorageMode = "postgresql" | "memory";

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId
  };
}

function readCompanyId(user: unknown): string | undefined {
  const companyId = (user as { companyId?: unknown } | null)?.companyId;
  return typeof companyId === "string" && companyId.trim() ? companyId : undefined;
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
  private readonly pipelines: PipelineRecord[] = [];
  private readonly segments: SegmentRecord[] = [];
  private readonly assets: AssetRecord[] = [];
  private readonly cpTestPoints: CpTestPointRecord[] = [];
  private readonly cpRectifiers: CpRectifierRecord[] = [];
  private readonly cpCalculations: CpCalculationRecord[] = [];
  private readonly devices = createSeedDevices();
  private readonly sensorAssignments: SensorAssignmentRecord[] = [];

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async listUsers(): Promise<UserRecord[]> {
    return [...this.users].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const duplicate = await this.findUserByEmail(input.email);
    if (duplicate) {
      const error = new Error("User email already exists.") as Error & { code?: string };
      error.code = "USER_EMAIL_DUPLICATE";
      throw error;
    }

    const user: UserRecord = {
      id: createId("user"),
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  async listAssessments(search: OwnershipScope = {}): Promise<StoredAssessment[]> {
    return [...this.assessments]
      .filter((assessment) => matchesOwnerScope(assessment.authorId, search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listPipelines(search: PipelineSearch = {}): Promise<PipelineRecord[]> {
    const query = search.search?.trim().toLowerCase();
    return this.pipelines
      .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
      .filter((pipeline) => search.archivedOnly ? pipeline.status === "Inactive" : pipeline.status !== "Inactive")
      .filter((pipeline) =>
        query
          ? [pipeline.pipelineCode, pipeline.pipelineName, pipeline.location ?? ""].some((value) =>
              value.toLowerCase().includes(query)
            )
          : true
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createPipeline(input: SavePipelineInput): Promise<PipelineRecord> {
    const normalizedPipelineCode = normalizePipelineCode(input.pipeline.pipelineCode);
    const duplicate = this.pipelines.find(
      (pipeline) =>
        (pipeline.createdById ?? "") === (input.createdById ?? "") &&
        normalizePipelineCode(pipeline.pipelineCode) === normalizedPipelineCode
    );

    if (duplicate) {
      const error = new Error("Pipeline code already exists for this owner.") as Error & { code?: string };
      error.code = "PIPELINE_DUPLICATE";
      throw error;
    }

    const timestamp = new Date().toISOString();
    const user = input.createdById
      ? this.users.find((candidate) => candidate.id === input.createdById) ?? null
      : null;
    const pipeline: PipelineRecord = {
      ...toStoredPipelineInput(input.pipeline),
      routeGeometry: input.pipeline.routeGeometry ?? undefined,
      id: createId("pipeline"),
      createdById: input.createdById,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdByName: user?.name ?? "Unknown User",
      createdByEmail: user?.email ?? ""
    };
    this.pipelines.unshift(pipeline);
    return pipeline;
  }

  async updatePipeline(id: string, input: SavePipelineInput): Promise<PipelineRecord | null> {
    const index = this.pipelines.findIndex((pipeline) => pipeline.id === id);
    if (index < 0) {
      return null;
    }

    const normalizedPipelineCode = normalizePipelineCode(input.pipeline.pipelineCode);
    const duplicate = this.pipelines.find(
      (pipeline) =>
        pipeline.id !== id &&
        (pipeline.createdById ?? "") === (input.createdById ?? "") &&
        normalizePipelineCode(pipeline.pipelineCode) === normalizedPipelineCode
    );

    if (duplicate) {
      const error = new Error("Pipeline code already exists for this owner.") as Error & { code?: string };
      error.code = "PIPELINE_DUPLICATE";
      throw error;
    }

    this.pipelines[index] = {
      ...this.pipelines[index],
      ...toStoredPipelineInput(input.pipeline),
      routeGeometry: input.pipeline.routeGeometry === undefined ? this.pipelines[index].routeGeometry : input.pipeline.routeGeometry ?? undefined,
      updatedAt: new Date().toISOString()
    };
    return this.pipelines[index];
  }

  async deletePipeline(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const pipeline = await this.findPipelineById(id, search);
    if (!pipeline) return false;
    const linkedCount = this.segments.filter((record) => record.pipelineId === id).length + this.assets.filter((record) => record.pipelineId === id).length;
    if (linkedCount > 0) {
      const error = new Error("Pipeline cannot be deleted while linked segments or assets exist.") as Error & { code?: string };
      error.code = "PIPELINE_LINKED_RECORDS";
      throw error;
    }
    for (let index = this.pipelines.length - 1; index >= 0; index -= 1) if (this.pipelines[index].id === id) this.pipelines.splice(index, 1);
    for (let index = this.segments.length - 1; index >= 0; index -= 1) if (this.segments[index].pipelineId === id) this.segments.splice(index, 1);
    for (let index = this.assets.length - 1; index >= 0; index -= 1) if (this.assets[index].pipelineId === id) this.assets.splice(index, 1);
    return true;
  }

  async deleteSegment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findSegmentById(id, search);
    if (!existing) return false;
    const linked = this.assets.filter((asset) => asset.segmentId === id).length;
    if (linked > 0) {
      const error = new Error("Segment cannot be deleted while linked assets exist.") as Error & { code?: string };
      error.code = "SEGMENT_LINKED_RECORDS";
      throw error;
    }
    const index = this.segments.findIndex((segment) => segment.id === id);
    if (index >= 0) this.segments.splice(index, 1);
    return true;
  }

  async deleteAsset(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findAssetById(id, search);
    if (!existing) return false;
    if (this.assets.some((asset) => asset.parentAssetId === id)) {
      const error = new Error("Asset cannot be deleted while child assets exist.") as Error & { code?: string };
      error.code = "ASSET_LINKED_RECORDS";
      throw error;
    }
    const index = this.assets.findIndex((asset) => asset.id === id);
    if (index >= 0) this.assets.splice(index, 1);
    return true;
  }

  async findPipelineById(id: string, search: OwnershipScope = {}): Promise<PipelineRecord | null> {
    const pipeline = this.pipelines.find((candidate) => candidate.id === id) ?? null;
    return pipeline && matchesOwnerScope(pipeline.createdById, search) ? pipeline : null;
  }

  async listSegments(search: SegmentSearch = {}): Promise<SegmentRecord[]> {
    const allowedPipelineIds = new Set(
      this.pipelines
        .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
        .map((pipeline) => pipeline.id)
    );

    return this.segments
      .filter((segment) => allowedPipelineIds.has(segment.pipelineId))
      .filter((segment) => (search.pipelineId ? segment.pipelineId === search.pipelineId : true))
      .sort((a, b) => a.segmentId.localeCompare(b.segmentId));
  }

  async findSegmentById(id: string, search: OwnershipScope = {}): Promise<SegmentRecord | null> {
    const segment = this.segments.find((candidate) => candidate.id === id) ?? null;
    if (!segment) {
      return null;
    }

    const pipeline = await this.findPipelineById(segment.pipelineId, search);
    return pipeline ? segment : null;
  }

  async saveSegment(input: SaveSegmentInput): Promise<SegmentRecord> {
    const pipeline = await this.findPipelineById(input.segment.pipelineId, { viewerCompanyId: input.companyId });
    if (!pipeline) {
      throw new Error("Pipeline not found.");
    }

    const duplicate = this.segments.find(
      (segment) =>
        segment.id !== input.id &&
        segment.pipelineId === input.segment.pipelineId &&
        segment.segmentId.toLowerCase() === input.segment.segmentId.toLowerCase()
    );

    if (duplicate) {
      const error = new Error("Segment ID already exists for this pipeline.") as Error & { code?: string };
      error.code = "SEGMENT_DUPLICATE";
      throw error;
    }

    validateSegmentOverlap(input.segment, this.segments, input.id);

    const timestamp = new Date().toISOString();
    const existingIndex = input.id
      ? this.segments.findIndex((segment) => segment.id === input.id)
      : -1;
    const record: SegmentRecord = {
      id: input.id ?? createId("segment"),
      pipelineId: input.segment.pipelineId,
      segmentId: input.segment.segmentId,
      name: input.segment.name,
      description: input.segment.description,
      startKp: input.segment.startKp,
      endKp: input.segment.endKp,
      coatingType: input.segment.coatingType,
      cpType: input.segment.cpType,
      terrain: input.segment.terrain,
      status: input.segment.status,
      routeGeometry: input.segment.routeGeometry,
      createdAt: existingIndex >= 0 ? this.segments[existingIndex].createdAt : timestamp,
      updatedAt: timestamp
    };

    if (existingIndex >= 0) {
      this.segments[existingIndex] = record;
    } else {
      this.segments.unshift(record);
    }

    return record;
  }

  async listAssets(search: AssetSearch = {}): Promise<AssetRecord[]> {
    const allowedPipelineIds = new Set(
      this.pipelines
        .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
        .map((pipeline) => pipeline.id)
    );

    return this.assets
      .filter((asset) => allowedPipelineIds.has(asset.pipelineId))
      .filter((asset) => (search.pipelineId ? asset.pipelineId === search.pipelineId : true))
      .filter((asset) => (search.segmentId ? asset.segmentId === search.segmentId : true))
      .filter((asset) => (search.assetType ? asset.assetType === search.assetType : true))
      .filter((asset) => (search.physicalStatus ? asset.physicalStatus === search.physicalStatus : true))
      .sort((a, b) => a.assetId.localeCompare(b.assetId));
  }

  async findAssetById(id: string, search: OwnershipScope = {}): Promise<AssetRecord | null> {
    const asset = this.assets.find((candidate) => candidate.id === id) ?? null;
    if (!asset) {
      return null;
    }

    const pipeline = await this.findPipelineById(asset.pipelineId, search);
    return pipeline ? asset : null;
  }

  async saveAsset(input: SaveAssetInput): Promise<AssetRecord> {
    const pipeline = await this.findPipelineById(input.asset.pipelineId, { viewerCompanyId: input.companyId });
    if (!pipeline) {
      throw new Error("Pipeline not found.");
    }

    if (input.asset.segmentId) {
      const segment = this.segments.find((candidate) => candidate.id === input.asset.segmentId);
      if (!segment || segment.pipelineId !== input.asset.pipelineId) {
        throw new Error("Segment not found for this pipeline.");
      }
    }

    if (input.asset.parentAssetId) {
      const parent = this.assets.find((candidate) => candidate.id === input.asset.parentAssetId);
      if (!parent || parent.pipelineId !== input.asset.pipelineId || parent.id === input.id) {
        throw new Error("Parent asset not found for this pipeline.");
      }
    }

    const duplicate = this.assets.find(
      (asset) =>
        asset.id !== input.id &&
        asset.pipelineId === input.asset.pipelineId &&
        asset.assetId.toLowerCase() === input.asset.assetId.toLowerCase()
    );

    if (duplicate) {
      const error = new Error("Asset ID already exists for this pipeline.") as Error & { code?: string };
      error.code = "ASSET_DUPLICATE";
      throw error;
    }

    const timestamp = new Date().toISOString();
    const existingIndex = input.id ? this.assets.findIndex((asset) => asset.id === input.id) : -1;
    const record: AssetRecord = {
      ...input.asset,
      id: input.id ?? createId("asset"),
      physicalStatus: input.asset.physicalStatus ?? "Unknown",
      createdAt: existingIndex >= 0 ? this.assets[existingIndex].createdAt : timestamp,
      updatedAt: timestamp
    };

    if (existingIndex >= 0) {
      this.assets[existingIndex] = record;
    } else {
      this.assets.unshift(record);
    }

    return record;
  }

  async listCpTestPoints(search: CpAssetSearch = {}): Promise<CpTestPointRecord[]> {
    const allowedPipelineIds = new Set(
      this.pipelines
        .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
        .map((pipeline) => pipeline.id)
    );

    return this.cpTestPoints
      .filter((point) => allowedPipelineIds.has(point.pipelineId))
      .filter((point) => (search.pipelineId ? point.pipelineId === search.pipelineId : true))
      .map((point) => ({
        ...point,
        asset: this.assets.find((asset) => asset.id === point.assetMasterId),
        latestReadings: emptyCpTestPointLatestReadings()
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async findCpTestPointById(id: string, search: OwnershipScope = {}): Promise<CpTestPointRecord | null> {
    const point = this.cpTestPoints.find((candidate) => candidate.id === id) ?? null;
    if (!point) {
      return null;
    }

    const pipeline = await this.findPipelineById(point.pipelineId, search);
    if (!pipeline) {
      return null;
    }

    return {
      ...point,
      asset: this.assets.find((asset) => asset.id === point.assetMasterId),
      latestReadings: emptyCpTestPointLatestReadings()
    };
  }

  async saveCpTestPoint(input: SaveCpTestPointInput): Promise<CpTestPointRecord> {
    const existing = input.id ? this.cpTestPoints.find((point) => point.id === input.id) : null;
    if (input.id && !existing) {
      throw new Error("CP test point not found.");
    }

    const pipelineId = "pipelineId" in input.testPoint ? input.testPoint.pipelineId : existing!.pipelineId;
    const assetMasterId = "assetMasterId" in input.testPoint ? input.testPoint.assetMasterId : existing!.assetMasterId;
    const asset = this.assets.find((candidate) => candidate.id === assetMasterId);
    validateCpAssetLink(asset, pipelineId, "TEST_POST", "CpTestPoint");

    const duplicate = this.cpTestPoints.find((point) => point.id !== input.id && point.assetMasterId === assetMasterId);
    if (duplicate) {
      throwCpAssetLinkConflict("Asset is already linked to another CP test point.");
    }

    const timestamp = new Date().toISOString();
    const existingIndex = input.id ? this.cpTestPoints.findIndex((point) => point.id === input.id) : -1;
    const record: CpTestPointRecord = {
      id: input.id ?? createId("cp-test-point"),
      pipelineId,
      assetMasterId,
      code: existing?.code ?? asset!.assetId,
      name: input.testPoint.name ?? existing?.name,
      location: existing?.location,
      kp: existing?.kp,
      assetStatus: input.testPoint.assetStatus ?? existing?.assetStatus ?? "Active",
      notes: input.testPoint.notes ?? existing?.notes,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    if (existingIndex >= 0) {
      this.cpTestPoints[existingIndex] = record;
    } else {
      this.cpTestPoints.unshift(record);
    }

    return { ...record, asset, latestReadings: emptyCpTestPointLatestReadings() };
  }

  async listCpRectifiers(search: CpAssetSearch = {}): Promise<CpRectifierRecord[]> {
    const allowedPipelineIds = new Set(
      this.pipelines
        .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
        .map((pipeline) => pipeline.id)
    );

    return this.cpRectifiers
      .filter((rectifier) => allowedPipelineIds.has(rectifier.pipelineId))
      .filter((rectifier) => (search.pipelineId ? rectifier.pipelineId === search.pipelineId : true))
      .map((rectifier) => ({
        ...rectifier,
        asset: this.assets.find((asset) => asset.id === rectifier.assetMasterId)
      }))
      .sort((a, b) => a.rectifierCode.localeCompare(b.rectifierCode));
  }

  async findCpRectifierById(id: string, search: OwnershipScope = {}): Promise<CpRectifierRecord | null> {
    const rectifier = this.cpRectifiers.find((candidate) => candidate.id === id) ?? null;
    if (!rectifier) {
      return null;
    }

    const pipeline = await this.findPipelineById(rectifier.pipelineId, search);
    if (!pipeline) {
      return null;
    }

    return {
      ...rectifier,
      asset: this.assets.find((asset) => asset.id === rectifier.assetMasterId)
    };
  }

  async saveCpRectifier(input: SaveCpRectifierInput): Promise<CpRectifierRecord> {
    const existing = input.id ? this.cpRectifiers.find((rectifier) => rectifier.id === input.id) : null;
    if (input.id && !existing) {
      throw new Error("CP rectifier not found.");
    }

    const pipelineId = "pipelineId" in input.rectifier ? input.rectifier.pipelineId : existing!.pipelineId;
    const assetMasterId = "assetMasterId" in input.rectifier ? input.rectifier.assetMasterId : existing!.assetMasterId;
    const asset = this.assets.find((candidate) => candidate.id === assetMasterId);
    validateCpAssetLink(asset, pipelineId, "RECTIFIER", "CpRectifier");

    const duplicate = this.cpRectifiers.find((rectifier) => rectifier.id !== input.id && rectifier.assetMasterId === assetMasterId);
    if (duplicate) {
      throwCpAssetLinkConflict("Asset is already linked to another CP rectifier.");
    }

    const timestamp = new Date().toISOString();
    const existingIndex = input.id ? this.cpRectifiers.findIndex((rectifier) => rectifier.id === input.id) : -1;
    const record: CpRectifierRecord = {
      id: input.id ?? createId("cp-rectifier"),
      pipelineId,
      assetMasterId,
      rectifierCode: existing?.rectifierCode ?? asset!.assetId,
      name: input.rectifier.name ?? existing?.name,
      location: existing?.location,
      kp: existing?.kp,
      status: input.rectifier.status ?? existing?.status ?? "Active",
      notes: input.rectifier.notes ?? existing?.notes,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    if (existingIndex >= 0) {
      this.cpRectifiers[existingIndex] = record;
    } else {
      this.cpRectifiers.unshift(record);
    }

    return { ...record, asset };
  }

  async listCpCalculations(search: CpCalculationSearch = {}): Promise<CpCalculationRecord[]> {
    const allowedPipelineIds = new Set(
      this.pipelines
        .filter((pipeline) => matchesOwnerScope(pipeline.createdById, search))
        .map((pipeline) => pipeline.id)
    );
    return this.cpCalculations
      .filter((record) => allowedPipelineIds.has(record.pipelineId))
      .filter((record) => (search.pipelineId ? record.pipelineId === search.pipelineId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createCpCalculation(input: SaveCpCalculationInput): Promise<CpCalculationRecord> {
    const pipeline = await this.findPipelineById(input.calculation.pipelineId, input);
    if (!pipeline) {
      return Promise.reject(new Error("Pipeline not found."));
    }

    const user = input.authorId
      ? this.users.find((candidate) => candidate.id === input.authorId) ?? null
      : null;
    const record: CpCalculationRecord = {
      ...input.calculation,
      id: createId("cp-calculation"),
      createdAt: new Date().toISOString(),
      authorId: input.authorId,
      createdByName: user?.name ?? "Unknown User",
      createdByEmail: user?.email ?? ""
    };
    this.cpCalculations.unshift(record);
    return record;
  }

  async findCpCalculationById(id: string, search: OwnershipScope = {}): Promise<CpCalculationRecord | null> {
    const record = this.cpCalculations.find((candidate) => candidate.id === id) ?? null;
    if (!record) {
      return null;
    }

    const pipeline = await this.findPipelineById(record.pipelineId, search);
    return pipeline ? record : null;
  }

  async getPipelineHistory(id: string, search: OwnershipScope = {}): Promise<PipelineHistory | null> {
    const pipeline = await this.findPipelineById(id, search);
    if (!pipeline) {
      return null;
    }

    return buildPipelineHistory(
      pipeline,
      this.assessments.filter((assessment) => assessment.pipelineId === id),
      this.reports.filter((report) => report.pipelineId === id),
      this.cpCalculations.filter((record) => record.pipelineId === id)
    );
  }

  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    const existing = this.assessments.find((assessment) => assessment.id === input.id);
    if (existing) {
      if (existing.authorId !== input.authorId || existing.pipelineId !== input.pipelineId || existing.type !== input.type) {
        throw createValidationError({ id: "Assessment ID is not available for this owner and pipeline." });
      }
      return existing;
    }

    const assessment: StoredAssessment = {
      ...input,
      authorId: input.authorId
    };
    this.assessments.unshift(assessment);
    return assessment;
  }

  async findAssessmentById(id: string, search: OwnershipScope = {}): Promise<StoredAssessment | null> {
    const assessment = this.assessments.find((candidate) => candidate.id === id) ?? null;
    return assessment && matchesOwnerScope(assessment.authorId, search) ? assessment : null;
  }

  async deleteAssessment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const index = this.assessments.findIndex((candidate) => candidate.id === id);
    if (index < 0 || !matchesOwnerScope(this.assessments[index].authorId, search)) {
      return false;
    }

    this.assessments.splice(index, 1);
    return true;
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
      inspectionId: input.inspectionId,
      assessmentType: input.assessmentType,
      pipelineId: input.pipelineId,
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

  async deleteReport(id: string, search: ReportSearch = {}): Promise<boolean> {
    const index = this.reports.findIndex((report) => report.id === id);
    if (index < 0 || !matchesReportSearch(this.reports[index], search)) {
      return false;
    }

    this.reports.splice(index, 1);
    return true;
  }

  async listExternalPipeData(search: ExternalPipeDataSearch): Promise<AssessmentPipeDataSummary[]> {
    return this.externalPipeData
      .filter((record) => matchesExternalPipeDataSearch(record, search))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .map(toExternalPipeDataSummary);
  }

  async findExternalPipeDataById(id: string, search: OwnershipScope = {}): Promise<AssessmentPipeDataRecord | null> {
    const record = this.externalPipeData.find((candidate) => candidate.id === id) ?? null;
    return record && matchesOwnerScope(record.assessment.authorId, search) ? record : null;
  }

  async deleteExternalPipeData(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const index = this.externalPipeData.findIndex((record) => record.id === id);
    if (index < 0 || !matchesOwnerScope(this.externalPipeData[index].assessment.authorId, search)) {
      return false;
    }

    this.externalPipeData.splice(index, 1);
    return true;
  }

  async saveExternalPipeData(input: SaveExternalPipeDataInput): Promise<AssessmentPipeDataRecord> {
    const timestamp = new Date().toISOString();
    const pipeLocationId = String(input.assessment.input.pipeLocationId ?? "").trim();
    const user = input.authorId
      ? this.users.find((candidate) => candidate.id === input.authorId) ?? null
      : null;
    const duplicate = input.assessment.id
      ? this.externalPipeData.find((candidate) => candidate.assessmentId === input.assessment.id)
      : null;
    if (duplicate && (duplicate.assessment.authorId ?? "") !== (input.authorId ?? "")) {
      const error = new Error("Pipe data assessment ID already exists for another owner.") as Error & { code?: string };
      error.code = "PIPE_DATA_ASSESSMENT_ID_OWNER_MISMATCH";
      throw error;
    }
    const existingId = input.id ?? duplicate?.id;
    const pipeline = input.assessment.pipelineId
      ? this.pipelines.find((candidate) => candidate.id === input.assessment.pipelineId)
      : null;

    const record: AssessmentPipeDataRecord = {
      id: existingId ?? createId("pipe"),
      assessmentId: input.assessment.id,
      assessmentType: input.assessment.type,
      pipelineId: input.assessment.pipelineId,
      pipelineName: input.assessment.pipelineName,
      pipeId: pipeLocationId,
      locationId: pipeLocationId,
      savedAt: timestamp,
      savedByName: user?.name ?? "Unknown User",
      savedByEmail: user?.email ?? "",
      pipelineOutsideDiameter: pipeline?.pipeOutsideDiameter,
      pipelineDiameterUnit: pipeline?.diameterUnit,
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

  async createDevice(input: CreateDeviceInput): Promise<DeviceRecord> {
    if (this.devices.some((device) => device.deviceId.toLowerCase() === input.device.deviceId.toLowerCase())) {
      throw new Error("Device ID already exists.");
    }
    const record: DeviceRecord = {
      id: createId("device"),
      ...input.device,
      lastUpdatedAt: new Date().toISOString(),
      isDemoData: input.isDemoData === true,
      authorId: input.authorId
    };
    this.devices.unshift(record);
    return record;
  }

  async findDeviceById(id: string, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    const device = this.devices.find((candidate) => candidate.id === id) ?? null;
    return device && matchesOwnerScope(device.authorId, search) ? device : null;
  }

  async updateDeviceUnit(id:string,unit:string,search:OwnershipScope={}):Promise<DeviceRecord|null>{
    const device=await this.findDeviceById(id,search);if(!device)return null;
    device.unit=unit;device.lastUpdatedAt=new Date().toISOString();return device;
  }

  async updateDeviceLocation(id: string, input: UpdateDeviceLocationInput, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    const device = await this.findDeviceById(id, search);
    if (!device) return null;
    device.pipelineOrLocation = input.pipelineOrLocation;
    device.lastUpdatedAt = new Date().toISOString();
    return device;
  }

  async deleteDevice(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const index = this.devices.findIndex((candidate) => candidate.id === id);
    if (index < 0 || !matchesOwnerScope(this.devices[index].authorId, search)) {
      return false;
    }

    this.devices.splice(index, 1);
    return true;
  }

  async listSensorAssignments(search: SensorAssignmentSearch = {}): Promise<SensorAssignmentRecord[]> {
    return [...this.sensorAssignments]
      .filter((assignment) => matchesSensorAssignmentSearch(assignment, search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findSensorAssignmentById(id: string, search: OwnershipScope = {}): Promise<SensorAssignmentRecord | null> {
    const assignment = this.sensorAssignments.find((candidate) => candidate.id === id) ?? null;
    return assignment && matchesOwnerScope(assignment.authorId, search) ? assignment : null;
  }

  async deleteSensorAssignment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const index = this.sensorAssignments.findIndex((assignment) => assignment.id === id);
    if (index < 0 || !matchesOwnerScope(this.sensorAssignments[index].authorId, search)) {
      return false;
    }

    this.sensorAssignments.splice(index, 1);
    return true;
  }

  async saveSensorAssignment(input: SaveSensorAssignmentInput): Promise<SensorAssignmentRecord> {
    const now = new Date().toISOString();
    const existingActive = this.sensorAssignments.find(
      (assignment) =>
        assignment.sensorId === input.assignment.sensorId &&
        assignment.assignmentStatus === "Active" &&
        !assignment.activeTo &&
        assignment.id !== input.id
    );

    if (input.assignment.assignmentStatus === "Active" && existingActive) {
      throw new Error("Sensor already has an active assignment.");
    }

    const existingIndex = input.id
      ? this.sensorAssignments.findIndex((assignment) => assignment.id === input.id)
      : -1;
    const existing = existingIndex >= 0 ? this.sensorAssignments[existingIndex] : null;
    const user = input.authorId
      ? this.users.find((candidate) => candidate.id === input.authorId) ?? null
      : null;

    const assignment: SensorAssignmentRecord = {
      ...input.assignment,
      id: input.id ?? createId("sensor-assignment"),
      activeFrom: existing?.activeFrom ?? now,
      activeTo: normalizeActiveTo(input.assignment.assignmentStatus, input.assignment.activeTo),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      authorId: input.authorId ?? existing?.authorId,
      createdByName: user?.name ?? existing?.createdByName ?? "Unknown User",
      createdByEmail: user?.email ?? existing?.createdByEmail ?? ""
    };

    if (existingIndex >= 0) {
      this.sensorAssignments[existingIndex] = assignment;
    } else {
      this.sensorAssignments.unshift(assignment);
    }

    return assignment;
  }

  async deactivateSensorAssignment(id: string): Promise<SensorAssignmentRecord | null> {
    const existing = await this.findSensorAssignmentById(id);
    if (!existing) {
      return null;
    }

    return this.saveSensorAssignment({
      id,
      assignment: {
        ...existing,
        assignmentStatus: "Inactive",
        activeTo: new Date().toISOString().slice(0, 10)
      },
      authorId: existing.authorId
    });
  }

  async reassignSensorAssignment(
    id: string,
    assignment: SensorAssignmentInput,
    authorId?: string
  ): Promise<SensorAssignmentRecord | null> {
    const existing = await this.findSensorAssignmentById(id);
    if (!existing) {
      return null;
    }

    await this.deactivateSensorAssignment(id);
    return this.saveSensorAssignment({
      assignment: {
        ...assignment,
        previousAssignmentId: id
      },
      authorId
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

function matchesInspectionYear(input: unknown, inspectionYear: string | undefined) {
  if (!inspectionYear?.trim()) {
    return true;
  }

  if (!input || typeof input !== "object") {
    return false;
  }

  const value = (input as Record<string, unknown>).inspectionYear;
  return String(value ?? "").trim() === inspectionYear.trim();
}

function matchesViewerScope(authorId: string | undefined, search: ReportSearch) {
  if (!search.viewerUserId || search.viewerRole === "Admin") {
    return true;
  }

  return authorId === search.viewerUserId;
}

function matchesOwnerScope(authorId: string | undefined, scope: OwnershipScope) {
  // Company-scoped callers are filtered by a verified company relationship at
  // the query/parent level. Do not narrow them back to records they created.
  if (scope.viewerCompanyId) {
    return true;
  }
  if (!scope.viewerUserId || scope.viewerRole === "Admin") {
    return true;
  }

  return authorId === scope.viewerUserId;
}

function throwCpAssetLinkConflict(message: string): never {
  const error = new Error(message) as Error & { code?: string };
  error.code = "CP_ASSET_LINK_CONFLICT";
  throw error;
}

function validateCpAssetLink(
  asset: AssetRecord | null | undefined,
  pipelineId: string,
  requiredType: AssetRecord["assetType"],
  target: "CpTestPoint" | "CpRectifier"
) {
  if (!asset) {
    throw new Error("Asset not found.");
  }

  if (asset.assetType !== requiredType) {
    throwCpAssetLinkConflict(`Asset type ${asset.assetType} cannot be linked to ${target}.`);
  }

  if (asset.pipelineId !== pipelineId) {
    throwCpAssetLinkConflict("Asset pipeline does not match CP record pipeline.");
  }
}

function matchesReportSearch(record: ReportRecord, search: ReportSearch) {
  if (!matchesViewerScope(record.authorId, search)) {
    return false;
  }

  if (search.pipelineId && record.pipelineId !== search.pipelineId) {
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

function matchesExternalPipeDataSearch(record: AssessmentPipeDataRecord, search: ExternalPipeDataSearch) {
  if (!matchesOwnerScope(record.assessment.authorId, search)) {
    return false;
  }

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

  if (search.pipelineId && record.pipelineId !== search.pipelineId) {
    return false;
  }

  if (search.inspectionYear?.trim()) {
    const inspectionYear = String(record.assessment.input.inspectionYear ?? "").trim();
    if (inspectionYear !== search.inspectionYear.trim()) {
      return false;
    }
  }

  const dateRange = search.savedDate ? getSavedDateRange(search.savedDate) : null;
  if (!dateRange) {
    return true;
  }

  const savedAt = new Date(record.savedAt);
  return savedAt >= dateRange.start && savedAt < dateRange.end;
}

function matchesDeviceSearch(record: DeviceRecord, search: DeviceSearch) {
  if (!matchesOwnerScope(record.authorId, search)) {
    return false;
  }

  if (search.deviceType && record.deviceType !== search.deviceType) {
    return false;
  }

  if (search.status && record.status !== search.status) {
    return false;
  }

  return true;
}

function matchesSensorAssignmentSearch(record: SensorAssignmentRecord, search: SensorAssignmentSearch) {
  if (!matchesOwnerScope(record.authorId, search)) {
    return false;
  }

  if (search.sensorCategory && record.sensorCategory !== search.sensorCategory) {
    return false;
  }

  if (search.sensorDeviceType && record.sensorDeviceType !== search.sensorDeviceType) {
    return false;
  }

  if (search.assignmentStatus && record.assignmentStatus !== search.assignmentStatus) {
    return false;
  }

  if (search.dataSource && record.dataSource !== search.dataSource) {
    return false;
  }

  if (!containsIgnoreCase(record.pipelineOrAsset, search.pipelineOrAsset)) {
    return false;
  }

  if (!search.search?.trim()) {
    return true;
  }

  const query = search.search.trim().toLowerCase();
  return [
    record.sensorId,
    record.sensorName,
    record.sensorCategory,
    record.sensorDeviceType,
    record.pipelineOrAsset,
    record.installationLocation,
    record.installationType,
    record.valuesMeasured,
    record.measurementUnit,
    record.dataSource,
    record.assignmentStatus,
    record.notes ?? ""
  ].some((value) => value.toLowerCase().includes(query));
}

function normalizeActiveTo(status: SensorAssignmentRecord["assignmentStatus"], activeTo: string | undefined) {
  if (status === "Active") {
    return undefined;
  }

  if (activeTo?.trim()) {
    return new Date(`${activeTo}T00:00:00.000Z`).toISOString();
  }

  return new Date().toISOString();
}

function toExternalPipeDataSummary(record: AssessmentPipeDataRecord): AssessmentPipeDataSummary {
  return {
    id: record.id,
    assessmentId: record.assessmentId,
    assessmentType: record.assessmentType,
    pipelineId: record.pipelineId,
    pipelineName: record.pipelineName,
    pipeId: record.pipeId,
    locationId: record.locationId,
    savedAt: record.savedAt,
    savedByName: record.savedByName,
    savedByEmail: record.savedByEmail,
    pipelineOutsideDiameter: record.pipelineOutsideDiameter,
    pipelineDiameterUnit: record.pipelineDiameterUnit,
    input: record.assessment.input
  };
}

function toPipelineRecord(record: any): PipelineRecord {
  const operatingPressureUnit = record.operatingPressureUnit ?? "bar";
  const wallThicknessUnit = record.wallThicknessUnit ?? "mm";
  return {
    id: record.id,
    pipelineCode: record.pipelineCode,
    pipelineName: record.pipelineName,
    location: record.location ?? undefined,
    serviceOrProduct: record.serviceOrProduct ?? undefined,
    pipeLocationId: record.pipeLocationId ?? undefined,
    pipeMaterial: record.pipeMaterial ?? undefined,
    pipeMaterialOther: record.pipeMaterialOther ?? undefined,
    pipeGrade: record.pipeGrade ?? undefined,
    pipeGradeOther: record.pipeGradeOther ?? undefined,
    pipeAgeYears: record.pipeAgeYears ?? undefined,
    pipeLengthKm: record.pipeLengthKm ?? undefined,
    pipeInsideDiameter: record.pipeInsideDiameter ?? undefined,
    pipeOutsideDiameter: record.pipeOutsideDiameter ?? undefined,
    diameterUnit: record.diameterUnit ?? undefined,
    smysMpa: record.smysMpa ?? undefined,
    maopBar: record.maopBar ?? undefined,
    nominalWallThickness: record.nominalWallThickness ?? undefined,
    wallThicknessInputValue:
      record.wallThicknessInputValue ?? record.nominalWallThickness ?? undefined,
    wallThicknessUnit,
    designPressure: record.designPressure ?? undefined,
    designPressureUnit: record.designPressureUnit ?? undefined,
    coatingType: record.coatingType ?? undefined,
    operatingPressure: record.operatingPressure ?? undefined,
    operatingPressureInputValue:
      record.operatingPressureInputValue ?? record.operatingPressure ?? undefined,
    operatingPressureUnit,
    installationYear: record.installationYear ?? undefined,
    inspectionYear: record.inspectionYear ?? undefined,
    installationDate: record.installationDate?.toISOString?.() ?? undefined,
    designLife: record.designLife ?? undefined,
    routeGeometry: record.routeGeometry ?? undefined,
    status: record.status,
    createdById: record.createdById ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdByName: record.createdBy?.name ?? "Unknown User",
    createdByEmail: record.createdBy?.email ?? ""
  };
}

function toSegmentRecord(record: any): SegmentRecord {
  return {
    id: record.id,
    pipelineId: record.pipelineId,
    segmentId: record.segmentId,
    name: record.name ?? undefined,
    description: record.description ?? undefined,
    startKp: record.startKp ?? undefined,
    endKp: record.endKp ?? undefined,
    coatingType: record.coatingType ?? undefined,
    cpType: record.cpType ?? undefined,
    terrain: record.terrain ?? undefined,
    status: record.status ?? undefined,
    routeGeometry: record.routeGeometry ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toAssetRecord(record: any): AssetRecord {
  return {
    name: record.name ?? undefined,
    facilityType: record.facilityType ?? undefined,
    equipmentType: record.equipmentType ?? undefined,
    id: record.id,
    assetId: record.assetId,
    assetType: record.assetType,
    pipelineId: record.pipelineId,
    segmentId: record.segmentId ?? undefined,
    kp: record.kp ?? undefined,
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
    coordinates: record.coordinates ?? undefined,
    side: record.side ?? undefined,
    installationDate: record.installationDate?.toISOString?.().slice(0, 10) ?? undefined,
    manufacturer: record.manufacturer ?? undefined,
    model: record.model ?? undefined,
    physicalStatus: record.physicalStatus,
    parentAssetId: record.parentAssetId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toCpTestPointRecord(record: any): CpTestPointRecord {
  return {
    id: record.id,
    pipelineId: record.pipelineId,
    assetMasterId: record.assetMasterId,
    code: record.code,
    name: record.name ?? undefined,
    location: record.location ?? undefined,
    kp: record.kp ?? undefined,
    assetStatus: record.assetStatus,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    asset: record.assetMaster ? toAssetRecord(record.assetMaster) : undefined,
    latestReadings: record.latestReadings ?? emptyCpTestPointLatestReadings()
  };
}

function emptyCpTestPointLatestReadings(): CpTestPointLatestReadings {
  return {
    onPotential: undefined,
    offPotential: undefined,
    lastReadingAt: undefined
  };
}

function toCpPotentialReadingSummary(record: any): CpPotentialReadingSummary {
  return {
    readingId: record.id,
    readingAt: record.readingAt.toISOString(),
    valueMv: record.valueMv ?? undefined,
    valueV: record.valueV ?? undefined,
    referenceElectrode: record.referenceElectrode,
    source: record.source ?? undefined,
    quality: record.quality ?? undefined
  };
}

function toCpTestPointLatestReadings(records: any[]): CpTestPointLatestReadings {
  const onPotential = records.find((record) => record.measurementType === "ON_POTENTIAL");
  const offPotential = records.find((record) => record.measurementType === "INSTANT_OFF_POTENTIAL");
  const lastReading = records[0];

  return {
    onPotential: onPotential ? toCpPotentialReadingSummary(onPotential) : undefined,
    offPotential: offPotential ? toCpPotentialReadingSummary(offPotential) : undefined,
    lastReadingAt: lastReading?.readingAt?.toISOString?.()
  };
}

async function withLatestTestPointReadings(record: any, prisma: { cpReadingHistory: { findMany(args: unknown): Promise<any[]> } }) {
  const readings = await prisma.cpReadingHistory.findMany({
    where: {
      pipelineId: record.pipelineId,
      testPointId: record.id,
      measurementType: { in: ["ON_POTENTIAL", "INSTANT_OFF_POTENTIAL"] }
    },
    orderBy: { readingAt: "desc" }
  });

  return toCpTestPointRecord({ ...record, latestReadings: toCpTestPointLatestReadings(readings) });
}

function toCpRectifierRecord(record: any): CpRectifierRecord {
  return {
    id: record.id,
    pipelineId: record.pipelineId,
    assetMasterId: record.assetMasterId,
    rectifierCode: record.rectifierCode,
    name: record.name ?? undefined,
    location: record.location ?? undefined,
    kp: record.kp ?? undefined,
    status: record.status,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    asset: record.assetMaster ? toAssetRecord(record.assetMaster) : undefined
  };
}

function toSegmentData(segment: SegmentInput) {
  return {
    pipelineId: segment.pipelineId,
    segmentId: segment.segmentId.trim(),
    name: segment.name?.trim() || null,
    description: segment.description?.trim() || null,
    startKp: segment.startKp?.trim() || null,
    endKp: segment.endKp?.trim() || null,
    coatingType: segment.coatingType?.trim() || null,
    cpType: segment.cpType?.trim() || null,
    terrain: segment.terrain?.trim() || null,
    status: segment.status || null,
    routeGeometry: segment.routeGeometry ?? null
  };
}

function toAssetData(asset: AssetInput) {
  return {
    name: asset.name?.trim() || null,
    facilityType: asset.facilityType?.trim() || null,
    equipmentType: asset.equipmentType?.trim() || null,
    assetId: asset.assetId.trim(),
    assetType: asset.assetType,
    pipelineId: asset.pipelineId,
    segmentId: asset.segmentId?.trim() || null,
    kp: asset.kp?.trim() || null,
    latitude: asset.latitude,
    longitude: asset.longitude,
    coordinates: asset.coordinates?.trim() || null,
    side: asset.side ?? null,
    installationDate: asset.installationDate ? new Date(`${asset.installationDate}T00:00:00.000Z`) : null,
    manufacturer: asset.manufacturer?.trim() || null,
    model: asset.model?.trim() || null,
    physicalStatus: asset.physicalStatus ?? "Unknown",
    parentAssetId: asset.parentAssetId?.trim() || null
  };
}

function convertPressureToBar(value: number | undefined, unit: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (unit === "MPa") {
    return value * 10;
  }

  if (unit === "kPa") {
    return value * 0.01;
  }

  if (unit === "psi") {
    return value * 0.0689476;
  }

  return value;
}

function convertWallThicknessToMm(value: number | undefined, unit: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return unit === "in" ? value * 25.4 : value;
}

function toStoredPipelineInput(pipeline: PipelineInput): PipelineInput {
  const operatingPressureUnit = pipeline.operatingPressureUnit?.trim() || "bar";
  const operatingPressureInputValue = pipeline.operatingPressureInputValue ?? pipeline.operatingPressure;
  const wallThicknessUnit = pipeline.wallThicknessUnit?.trim() === "in" ? "in" : "mm";
  const wallThicknessInputValue = pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness;

  return {
    ...pipeline,
    operatingPressure: convertPressureToBar(operatingPressureInputValue, operatingPressureUnit),
    operatingPressureInputValue,
    operatingPressureUnit,
    nominalWallThickness: convertWallThicknessToMm(wallThicknessInputValue, wallThicknessUnit),
    wallThicknessInputValue,
    wallThicknessUnit
  };
}

function toPipelineData(input: SavePipelineInput) {
  const pipeline = toStoredPipelineInput(input.pipeline);
  return {
    companyId: input.companyId,
    pipelineCode: pipeline.pipelineCode.trim(),
    normalizedPipelineCode: normalizePipelineCode(pipeline.pipelineCode),
    pipelineName: pipeline.pipelineName.trim(),
    location: pipeline.location?.trim() || null,
    serviceOrProduct: pipeline.serviceOrProduct?.trim() || null,
    pipeLocationId: pipeline.pipeLocationId?.trim() || null,
    pipeMaterial: pipeline.pipeMaterial?.trim() || null,
    pipeMaterialOther: pipeline.pipeMaterialOther?.trim() || null,
    pipeGrade: pipeline.pipeGrade?.trim() || null,
    pipeGradeOther: pipeline.pipeGradeOther?.trim() || null,
    pipeAgeYears: pipeline.pipeAgeYears,
    pipeLengthKm: pipeline.pipeLengthKm,
    pipeInsideDiameter: pipeline.pipeInsideDiameter,
    pipeOutsideDiameter: pipeline.pipeOutsideDiameter,
    diameterUnit: pipeline.diameterUnit?.trim() || null,
    smysMpa: pipeline.smysMpa,
    maopBar: pipeline.maopBar,
    nominalWallThickness: pipeline.nominalWallThickness,
    wallThicknessInputValue: pipeline.wallThicknessInputValue,
    wallThicknessUnit: pipeline.wallThicknessUnit,
    designPressure: pipeline.designPressure,
    designPressureUnit: pipeline.designPressureUnit,
    coatingType: pipeline.coatingType,
    operatingPressure: pipeline.operatingPressure,
    operatingPressureInputValue: pipeline.operatingPressureInputValue,
    operatingPressureUnit: pipeline.operatingPressureUnit,
    installationYear: pipeline.installationYear,
    inspectionYear: pipeline.inspectionYear,
    installationDate: pipeline.installationDate ? new Date(pipeline.installationDate) : null,
    designLife: pipeline.designLife,
    routeGeometry: pipeline.routeGeometry,
    status: pipeline.status || "Active",
    createdById: input.createdById
  };
}

function toCpCalculationRecord(record: any): CpCalculationRecord {
  return {
    id: record.id,
    pipelineId: record.pipelineId,
    calculationType: record.calculationType as CpCalculationRecord["calculationType"],
    input: record.input as CpCalculationRecord["input"],
    result: record.result as CpCalculationRecord["result"],
    createdAt: record.createdAt.toISOString(),
    authorId: record.authorId ?? undefined,
    createdByName: record.author?.name ?? "Unknown User",
    createdByEmail: record.author?.email ?? ""
  };
}

function buildPipelineHistory(
  pipeline: PipelineRecord,
  assessments: StoredAssessment[],
  reports: ReportRecord[],
  cpCalculations: CpCalculationRecord[]
): PipelineHistory {
  const externalAssessments = assessments
    .filter((assessment) => assessment.type === "External")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const internalAssessments = assessments
    .filter((assessment) => assessment.type === "Internal")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sortedReports = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sortedCpCalculations = [...cpCalculations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const timeline: PipelineHistoryRecord[] = [
    ...assessments.map((assessment) => ({
      id: assessment.id,
      recordType: "Assessment" as const,
      pipelineId: pipeline.id,
      displayType: assessment.type,
      riskLevel: assessment.riskLevel,
      createdAt: assessment.createdAt,
      assessmentId: assessment.id
    })),
    ...sortedReports.map((report) => ({
      id: report.id,
      recordType: "Report" as const,
      pipelineId: pipeline.id,
      displayType: report.assessmentType,
      riskLevel: report.riskLevel,
      createdAt: report.createdAt,
      createdByName: report.createdByName,
      createdByEmail: report.createdByEmail,
      reportId: report.id,
      assessmentId: report.assessmentId
    })),
    ...sortedCpCalculations.map((record) => ({
      id: record.id,
      recordType: "CpCalculation" as const,
      pipelineId: pipeline.id,
      displayType: record.calculationType,
      calculationType: record.calculationType,
      createdAt: record.createdAt,
      createdByName: record.createdByName,
      createdByEmail: record.createdByEmail
    }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    pipeline,
    externalAssessments,
    internalAssessments,
    reports: sortedReports,
    cpCalculations: sortedCpCalculations,
    timeline
  };
}

function toSensorAssignmentRecord(record: any): SensorAssignmentRecord {
  return {
    id: record.id,
    sensorId: record.sensorId,
    sensorName: record.sensorName,
    sensorCategory: record.sensorCategory,
    sensorDeviceType: record.sensorDeviceType,
    pipelineOrAsset: record.pipelineOrAsset,
    installationLocation: record.installationLocation,
    installationType: record.installationType,
    valuesMeasured: record.valuesMeasured,
    measurementUnit: record.measurementUnit,
    installationDate: record.installationDate.toISOString().slice(0, 10),
    dataSource: record.dataSource,
    assignmentStatus: record.assignmentStatus,
    notes: record.notes ?? undefined,
    activeFrom: record.activeFrom.toISOString(),
    activeTo: record.activeTo?.toISOString?.() ?? undefined,
    previousAssignmentId: record.previousAssignmentId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    authorId: record.authorId ?? undefined,
    createdByName: record.author?.name ?? "Unknown User",
    createdByEmail: record.author?.email ?? ""
  };
}

function getReportSubmissionKey(input: Pick<ReportRecord, "assessmentId" | "authorId">) {
  return `${input.authorId ?? "anonymous"}:${input.assessmentId}`;
}

function toOptionalIsoString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function toAssessmentRecord(record: any): StoredAssessment {
  return {
    id: record.id,
    type: record.type as StoredAssessment["type"],
    pipelineId: record.pipelineId ?? undefined,
    pipelineName: record.pipelineName,
    createdAt: record.createdAt.toISOString(),
    inspectionDate: toOptionalIsoString(record.inspectionDate),
    riskLevel: record.riskLevel as StoredAssessment["riskLevel"],
    riskScore: record.riskScore,
    input: record.input as StoredAssessment["input"],
    result: record.result as StoredAssessment["result"],
    authorId: record.authorId ?? undefined
  };
}

function toReportRecord(record: any): ReportRecord {
  return {
    id: record.id,
    assessmentId: record.assessmentId,
    inspectionId: record.inspectionId ?? undefined,
    assessmentType: record.assessmentType as ReportRecord["assessmentType"],
    pipelineId: record.pipelineId ?? undefined,
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
      companyId: readCompanyId(user),
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    };
  }

  async listUsers(): Promise<UserRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    }));
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
      companyId: readCompanyId(user),
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    };
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    const companyName = input.companyName?.trim();
    if (companyName && env.companySignupWritesEnabled) {
      const user = await prisma.$transaction(async (tx) => {
        const companyId = createId("company");
        await tx.$executeRawUnsafe(
          'INSERT INTO "Company" ("id", "companyId", "name", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          companyId, companyId, companyName
        );
        const userId = createId("user");
        await tx.$executeRawUnsafe(
          'INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "companyId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          userId, input.name, input.email, input.passwordHash, toRole(input.role), companyId
        );
        const rows = await tx.$queryRawUnsafe<any[]>('SELECT * FROM "User" WHERE "id" = $1', userId);
        return rows[0];
      });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: readCompanyId(user),
        passwordHash: user.passwordHash,
        createdAt: user.createdAt.toISOString()
      };
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: toRole(input.role)
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: readCompanyId(user),
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString()
    };
  }

  async listPipelines(search: PipelineSearch = {}): Promise<PipelineRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const query = search.search?.trim();
    const records = await prisma.pipeline.findMany({
      where: {
        status: search.archivedOnly ? "Inactive" : { not: "Inactive" },
        companyId: search.viewerCompanyId,
        createdById:
          !search.viewerCompanyId && search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined,
        OR: query
          ? [
              { pipelineName: { contains: query, mode: "insensitive" } },
              { pipelineCode: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } }
            ]
          : undefined
      },
      include: { createdBy: true },
      orderBy: { updatedAt: "desc" }
    });
    return Promise.all(records.map(async record => ({ ...toPipelineRecord(record), ...await readChainageSettings(prisma, record.id), ...await readCommissioningDate(prisma, record.id) })));
  }

  async createPipeline(input: SavePipelineInput): Promise<PipelineRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    return prisma.$transaction(async tx => {
      const record = await tx.pipeline.create({ data: toPipelineData(input), include: { createdBy: true } });
      await saveChainageSettings(tx, record.id, input.pipeline, input.createdById);
      await saveCommissioningDate(tx, record.id, input.pipeline.commissioningDate);
      await recordMasterChange(tx, record.id, "Pipeline", record.id, input.auditUserId ?? input.createdById, null);
      return { ...toPipelineRecord(record), ...await readChainageSettings(tx, record.id), ...await readCommissioningDate(tx, record.id) };
    });
  }

  async updatePipeline(id: string, input: SavePipelineInput): Promise<PipelineRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    return prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT id FROM public."Pipeline" WHERE id=$1 FOR UPDATE', id);
      const before = input.auditUserId ? await masterSnapshot(tx, "Pipeline", id) : null;
      const record = await tx.pipeline.update({ where: { id }, data: toPipelineData(input), include: { createdBy: true } });
      await saveChainageSettings(tx, id, input.pipeline, input.createdById);
      await saveCommissioningDate(tx, id, input.pipeline.commissioningDate);
      await recordMasterChange(tx, id, "Pipeline", id, input.auditUserId, before);
      return { ...toPipelineRecord(record), ...await readChainageSettings(tx, id), ...await readCommissioningDate(tx, id) };
    });
  }

  async deletePipeline(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findPipelineById(id, search);
    if (!existing) return false;
    const prisma = getPrismaClient();
    if (!prisma) throw new DatabaseUnavailableError();
    const [segments, assets, assessments, reports, cpCalculations, documentLinks] = await Promise.all([
      prisma.segment.findMany({ where: { pipelineId: id }, select: { id: true } }),
      prisma.asset.findMany({ where: { pipelineId: id }, select: { id: true } }),
      prisma.assessment.findMany({ where: { pipelineId: id }, select: { id: true } }),
      prisma.report.findMany({ where: { pipelineId: id }, select: { id: true } }),
      prisma.cpCalculation.findMany({ where: { pipelineId: id }, select: { id: true } }),
      prisma.documentLink.findMany({ where: { pipelineId: id }, select: { documentLinkId: true } })
    ]);
    const linkedCount = segments.length + assets.length + assessments.length + reports.length + cpCalculations.length + documentLinks.length;
    if (linkedCount > 0) {
      const error = new Error("Pipeline cannot be deleted while linked records exist.") as Error & { code?: string };
      error.code = "PIPELINE_LINKED_RECORDS";
      throw error;
    }
    await prisma.pipeline.delete({ where: { id } });
    return true;
  }

  async deleteSegment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findSegmentById(id, search);
    if (!existing) return false;
    const prisma = getPrismaClient();
    if (!prisma) throw new DatabaseUnavailableError();
    const [assets, documents] = await Promise.all([
      prisma.asset.findMany({ where: { segmentId: id }, select: { id: true } }),
      prisma.documentLink.findMany({ where: { segmentId: id }, select: { documentLinkId: true } })
    ]);
    if (assets.length + documents.length > 0) {
      const error = new Error("Segment cannot be deleted while linked records exist.") as Error & { code?: string };
      error.code = "SEGMENT_LINKED_RECORDS";
      throw error;
    }
    await prisma.$executeRawUnsafe('DELETE FROM "Segment" WHERE "id" = $1', id);
    return true;
  }

  async deleteAsset(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findAssetById(id, search);
    if (!existing) return false;
    const prisma = getPrismaClient();
    if (!prisma) throw new DatabaseUnavailableError();
    const [children, documents] = await Promise.all([
      prisma.asset.findMany({ where: { parentAssetId: id }, select: { id: true } }),
      prisma.documentLink.findMany({ where: { assetId: id }, select: { documentLinkId: true } })
    ]);
    if (children.length + documents.length > 0) {
      const error = new Error("Asset cannot be deleted while linked records exist.") as Error & { code?: string };
      error.code = "ASSET_LINKED_RECORDS";
      throw error;
    }
    await prisma.$executeRawUnsafe('DELETE FROM "Asset" WHERE "id" = $1', id);
    return true;
  }

  async findPipelineById(id: string, search: OwnershipScope = {}): Promise<PipelineRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.pipeline.findFirst({
      where: { id, companyId: search.viewerCompanyId },
      include: { createdBy: true }
    });
    if (!record || !matchesOwnerScope(record.createdById ?? undefined, search)) {
      return null;
    }

    return { ...toPipelineRecord(record), ...await readChainageSettings(prisma, record.id), ...await readCommissioningDate(prisma, record.id) };
  }

  async listSegments(search: SegmentSearch = {}): Promise<SegmentRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.segment.findMany({
      where: {
        pipelineId: search.pipelineId,
        pipeline:
          search.viewerCompanyId
            ? { companyId: search.viewerCompanyId }
            : search.viewerUserId && search.viewerRole !== "Admin"
              ? { createdById: search.viewerUserId }
            : undefined
      },
      orderBy: { segmentId: "asc" }
    });

    return records.map(toSegmentRecord);
  }

  async findSegmentById(id: string, search: OwnershipScope = {}): Promise<SegmentRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.segment.findFirst({
      where: { id, pipeline: search.viewerCompanyId ? { companyId: search.viewerCompanyId } : undefined },
      include: { pipeline: true }
    });

    if (!record || !matchesOwnerScope(record.pipeline?.createdById ?? undefined, search)) {
      return null;
    }

    return toSegmentRecord(record);
  }

  async saveSegment(input: SaveSegmentInput): Promise<SegmentRecord> {
    const prisma = getPrismaClient();
    if (!prisma) throw new DatabaseUnavailableError();
    // Serialize range validation and the write per pipeline. No schema change is needed.
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT "id" FROM "Pipeline" WHERE "id" = $1 FOR UPDATE', input.segment.pipelineId
      );
      if (!locked.length) throw new Error("Pipeline not found.");
      const duplicate = await tx.segment.findFirst({ where: {
        pipelineId: input.segment.pipelineId, segmentId: input.segment.segmentId,
        id: input.id ? { not: input.id } : undefined
      } });
      if (duplicate) {
        const error = new Error("Segment ID already exists for this pipeline.") as Error & { code?: string };
        error.code = "SEGMENT_DUPLICATE";
        throw error;
      }
      const before = input.auditUserId && input.id ? await masterSnapshot(tx, "Segment", input.id) : null;
      const peers = await tx.segment.findMany({ where: { pipelineId: input.segment.pipelineId } });
      validateSegmentOverlap(input.segment, peers, input.id);
      const record = input.id
        ? await tx.segment.update({ where: { id: input.id }, data: toSegmentData(input.segment) })
        : await tx.segment.create({ data: toSegmentData(input.segment) });
      await saveNumericChainage(tx, "Segment", record);
      await recordMasterChange(tx, input.segment.pipelineId, "Segment", record.id, input.auditUserId, before);
      return toSegmentRecord(record);
    });
  }

  async listAssets(search: AssetSearch = {}): Promise<AssetRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.asset.findMany({
      where: {
        pipelineId: search.pipelineId,
        segmentId: search.segmentId,
        assetType: search.assetType,
        physicalStatus: search.physicalStatus,
        pipeline:
          search.viewerCompanyId
            ? { companyId: search.viewerCompanyId }
            : search.viewerUserId && search.viewerRole !== "Admin"
              ? { createdById: search.viewerUserId }
            : undefined
      },
      orderBy: { assetId: "asc" }
    });

    return Promise.all(records.map(async record => ({ ...toAssetRecord(record), ...await readAssetMetadata(prisma, record.id) })));
  }

  async findAssetById(id: string, search: OwnershipScope = {}): Promise<AssetRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.asset.findFirst({
      where: { id, pipeline: search.viewerCompanyId ? { companyId: search.viewerCompanyId } : undefined },
      include: { pipeline: true }
    });

    if (!record || !matchesOwnerScope(record.pipeline?.createdById ?? undefined, search)) {
      return null;
    }

    return { ...toAssetRecord(record), ...await readAssetMetadata(prisma, record.id) };
  }

  async saveAsset(input: SaveAssetInput): Promise<AssetRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    const pipeline = await this.findPipelineById(input.asset.pipelineId, { viewerCompanyId: input.companyId });
    if (!pipeline) {
      throw new Error("Pipeline not found.");
    }

    if (input.asset.segmentId) {
      const segment = await prisma.segment.findFirst({ where: { id: input.asset.segmentId, pipeline: input.companyId ? { companyId: input.companyId } : undefined } });
      if (!segment || segment.pipelineId !== input.asset.pipelineId) {
        throw new Error("Segment not found for this pipeline.");
      }
    }

    if (input.asset.parentAssetId) {
      const parent = await prisma.asset.findFirst({ where: { id: input.asset.parentAssetId, pipeline: input.companyId ? { companyId: input.companyId } : undefined } });
      if (!parent || parent.pipelineId !== input.asset.pipelineId || parent.id === input.id) {
        throw new Error("Parent asset not found for this pipeline.");
      }
    }

    const duplicate = await prisma.asset.findFirst({
      where: {
        pipelineId: input.asset.pipelineId,
        assetId: input.asset.assetId,
        id: input.id ? { not: input.id } : undefined
      }
    });

    if (duplicate) {
      const error = new Error("Asset ID already exists for this pipeline.") as Error & { code?: string };
      error.code = "ASSET_DUPLICATE";
      throw error;
    }

    return prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT id FROM "Pipeline" WHERE id=$1 FOR UPDATE', input.asset.pipelineId);
      const concurrentDuplicate = await tx.asset.findFirst({ where: { pipelineId: input.asset.pipelineId, assetId: input.asset.assetId, id: input.id ? { not: input.id } : undefined } });
      if (concurrentDuplicate) throw Object.assign(new Error("Asset ID already exists for this pipeline."), { code: "ASSET_DUPLICATE" });
      const before = input.auditUserId && input.id ? await masterSnapshot(tx, "Asset", input.id) : null;

      const record = input.id
        ? await tx.asset.update({
          where: { id: input.id },
          data: toAssetData(input.asset)
        })
        : await tx.asset.create({
          data: toAssetData(input.asset)
        });

      await saveNumericChainage(tx, "Asset", record);
      await saveAssetMetadata(tx, record.id, input.asset);
      await recordMasterChange(tx, input.asset.pipelineId, "Asset", record.id, input.auditUserId, before);
      return { ...toAssetRecord(record), ...await readAssetMetadata(tx, record.id) };
    });
  }

  async listCpTestPoints(search: CpAssetSearch = {}): Promise<CpTestPointRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.cpTestPoint.findMany({
      where: {
        pipelineId: search.pipelineId,
        pipeline:
          search.viewerCompanyId
            ? { companyId: search.viewerCompanyId }
            : search.viewerUserId && search.viewerRole !== "Admin"
              ? { createdById: search.viewerUserId }
              : undefined
      },
      include: { assetMaster: true },
      orderBy: { code: "asc" }
    });

    return Promise.all(records.map((record) => withLatestTestPointReadings(record, prisma)));
  }

  async findCpTestPointById(id: string, search: OwnershipScope = {}): Promise<CpTestPointRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.cpTestPoint.findFirst({
      where: { id, pipeline: search.viewerCompanyId ? { companyId: search.viewerCompanyId } : undefined },
      include: { pipeline: true, assetMaster: true }
    });

    if (!record || !matchesOwnerScope(record.pipeline?.createdById ?? undefined, search)) {
      return null;
    }

    return withLatestTestPointReadings(record, prisma);
  }

  async saveCpTestPoint(input: SaveCpTestPointInput): Promise<CpTestPointRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    const existing = input.id
      ? await prisma.cpTestPoint.findFirst({ where: { id: input.id, pipeline: input.companyId ? { companyId: input.companyId } : undefined }, include: { assetMaster: true } })
      : null;
    if (input.id && !existing) {
      throw new Error("CP test point not found.");
    }

    const pipelineId = "pipelineId" in input.testPoint ? input.testPoint.pipelineId : existing!.pipelineId;
    const assetMasterId = "assetMasterId" in input.testPoint ? input.testPoint.assetMasterId : existing!.assetMasterId;
    const asset = await prisma.asset.findFirst({ where: { id: assetMasterId, pipeline: input.companyId ? { companyId: input.companyId } : undefined } });
    validateCpAssetLink(asset ? toAssetRecord(asset) : null, pipelineId, "TEST_POST", "CpTestPoint");

    const duplicate = await prisma.cpTestPoint.findFirst({
      where: {
        assetMasterId,
        id: input.id ? { not: input.id } : undefined
      }
    });

    if (duplicate) {
      throwCpAssetLinkConflict("Asset is already linked to another CP test point.");
    }

    const data = input.id
      ? {
          name: input.testPoint.name?.trim() || null,
          assetStatus: input.testPoint.assetStatus,
          notes: input.testPoint.notes?.trim() || null
        }
      : {
          pipelineId,
          assetMasterId,
          code: asset!.assetId,
          name: input.testPoint.name?.trim() || null,
          assetStatus: input.testPoint.assetStatus ?? "Active",
          notes: input.testPoint.notes?.trim() || null
        };

    const record = input.id
      ? await prisma.cpTestPoint.update({
          where: { id: input.id },
          data,
          include: { assetMaster: true }
        })
      : await prisma.cpTestPoint.create({
          data,
          include: { assetMaster: true }
        });

    return withLatestTestPointReadings(record, prisma);
  }

  async listCpRectifiers(search: CpAssetSearch = {}): Promise<CpRectifierRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.cpRectifier.findMany({
      where: {
        pipelineId: search.pipelineId,
        pipeline:
          search.viewerCompanyId
            ? { companyId: search.viewerCompanyId }
            : search.viewerUserId && search.viewerRole !== "Admin"
              ? { createdById: search.viewerUserId }
              : undefined
      },
      include: { assetMaster: true },
      orderBy: { rectifierCode: "asc" }
    });

    return records.map(toCpRectifierRecord);
  }

  async findCpRectifierById(id: string, search: OwnershipScope = {}): Promise<CpRectifierRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.cpRectifier.findFirst({
      where: { id, pipeline: search.viewerCompanyId ? { companyId: search.viewerCompanyId } : undefined },
      include: { pipeline: true, assetMaster: true }
    });

    if (!record || !matchesOwnerScope(record.pipeline?.createdById ?? undefined, search)) {
      return null;
    }

    return toCpRectifierRecord(record);
  }

  async saveCpRectifier(input: SaveCpRectifierInput): Promise<CpRectifierRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    const existing = input.id
      ? await prisma.cpRectifier.findFirst({ where: { id: input.id, pipeline: input.companyId ? { companyId: input.companyId } : undefined }, include: { assetMaster: true } })
      : null;
    if (input.id && !existing) {
      throw new Error("CP rectifier not found.");
    }

    const pipelineId = "pipelineId" in input.rectifier ? input.rectifier.pipelineId : existing!.pipelineId;
    const assetMasterId = "assetMasterId" in input.rectifier ? input.rectifier.assetMasterId : existing!.assetMasterId;
    const asset = await prisma.asset.findFirst({ where: { id: assetMasterId, pipeline: input.companyId ? { companyId: input.companyId } : undefined } });
    validateCpAssetLink(asset ? toAssetRecord(asset) : null, pipelineId, "RECTIFIER", "CpRectifier");

    const duplicate = await prisma.cpRectifier.findFirst({
      where: {
        assetMasterId,
        id: input.id ? { not: input.id } : undefined
      }
    });

    if (duplicate) {
      throwCpAssetLinkConflict("Asset is already linked to another CP rectifier.");
    }

    const data = input.id
      ? {
          name: input.rectifier.name?.trim() || null,
          status: input.rectifier.status,
          notes: input.rectifier.notes?.trim() || null
        }
      : {
          pipelineId,
          assetMasterId,
          rectifierCode: asset!.assetId,
          name: input.rectifier.name?.trim() || null,
          status: input.rectifier.status ?? "Active",
          notes: input.rectifier.notes?.trim() || null
        };

    const record = input.id
      ? await prisma.cpRectifier.update({
          where: { id: input.id },
          data,
          include: { assetMaster: true }
        })
      : await prisma.cpRectifier.create({
          data,
          include: { assetMaster: true }
        });

    return toCpRectifierRecord(record);
  }

  async listAssessments(search: OwnershipScope = {}): Promise<StoredAssessment[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.assessment.findMany({
      where: {
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined
      },
      orderBy: { createdAt: "desc" }
    });
    return records.map(toAssessmentRecord);
  }

  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return input;
    }

    const existing = await prisma.assessment.findUnique({ where: { id: input.id } });
    if (existing) {
      if ((existing.authorId ?? undefined) !== input.authorId || (existing.pipelineId ?? undefined) !== input.pipelineId || existing.type !== input.type) {
        throw createValidationError({ id: "Assessment ID is not available for this owner and pipeline." });
      }
      return toAssessmentRecord(existing);
    }

    let record: any;
    updateSaveDiagnostics({ prismaWriteAttempted: true });
    try {
      record = await prisma.assessment.create({
        data: {
          id: input.id,
          type: input.type,
          pipelineId: input.pipelineId,
          pipelineName: input.pipelineName,
          riskLevel: input.riskLevel,
          riskScore: input.riskScore,
          input: input.input ?? {},
          result: input.result ?? {},
          inspectionDate: input.inspectionDate ? new Date(input.inspectionDate) : undefined,
          createdAt: new Date(input.createdAt),
          authorId: input.authorId
        }
      });
      updateSaveDiagnostics({ prismaWriteSucceeded: true });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      updateSaveDiagnostics({
        prismaWriteSucceeded: false,
        prismaErrorCode: typeof code === "string" ? code : undefined
      });
      throw error;
    }

    return toAssessmentRecord(record);
  }

  async findAssessmentById(id: string, search: OwnershipScope = {}): Promise<StoredAssessment | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.assessment.findUnique({ where: { id } });
    if (!record || !matchesOwnerScope(record.authorId ?? undefined, search)) {
      return null;
    }

    return toAssessmentRecord(record);
  }

  async deleteAssessment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findAssessmentById(id, search);
    if (!existing) {
      return false;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.assessment.delete({ where: { id } });
    return true;
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
        pipelineId: search.pipelineId,
        id: search.reportId ? { contains: search.reportId.trim(), mode: "insensitive" } : undefined,
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });
    return records.map(toReportRecord);
  }

  async createReport(input: CreateReportInput): Promise<ReportRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      const timestamp = new Date().toISOString();
      return {
        id: createId("report"),
        assessmentId: input.assessmentId,
        inspectionId: input.inspectionId,
        pipelineId: input.pipelineId,
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

    const reportSubmissionKey = getReportSubmissionKey(input);
    const duplicate = await prisma.report.findFirst({
      where: {
        OR: [
          { reportSubmissionKey },
          {
            assessmentId: input.assessmentId,
            pipelineId: input.pipelineId,
            assessmentType: input.assessmentType,
            pipelineName: input.pipelineName,
            riskLevel: input.riskLevel,
            authorId: input.authorId,
            input: { equals: input.input ?? {} },
            result: { equals: input.result ?? {} }
          }
        ]
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });

    if (duplicate) {
      return toReportRecord(duplicate);
    }

    let record: any;
    updateSaveDiagnostics({ prismaWriteAttempted: true });
    try {
      record = await prisma.report.create({
        data: {
          assessmentId: input.assessmentId,
          assessmentType: input.assessmentType,
          pipelineId: input.pipelineId,
          pipelineName: input.pipelineName,
          riskLevel: input.riskLevel,
          input: input.input ?? {},
          result: input.result ?? {},
          inspectionId: input.inspectionId,
          generatedAt: new Date(input.generatedAt ?? new Date().toISOString()),
          createdAt: new Date(input.createdAt ?? new Date().toISOString()),
          reportSubmissionKey,
          authorId: input.authorId
        },
        include: { author: true }
      });
      updateSaveDiagnostics({ prismaWriteSucceeded: true });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      updateSaveDiagnostics({
        prismaWriteSucceeded: false,
        prismaErrorCode: typeof code === "string" ? code : undefined
      });
      throw error;
    }

    return toReportRecord(record);
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

    const normalized = toReportRecord(record);

    return matchesReportSearch(normalized, search) ? normalized : null;
  }

  async deleteReport(id: string, search: ReportSearch = {}): Promise<boolean> {
    const existing = await this.findReportById(id, search);
    if (!existing) {
      return false;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.report.delete({ where: { id } });
    return true;
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
        pipelineId: search.pipelineId,
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
          : undefined,
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined
      },
      include: { author: true, pipeline: true },
      orderBy: { createdAt: "desc" }
    });

    return records
      .filter((record: any) => matchesInspectionYear(record.input, search.inspectionYear))
      .map((record: any) =>
      toExternalPipeDataSummary({
        id: record.id,
        assessmentId: record.assessmentId ?? undefined,
        assessmentType: record.type as StoredAssessment["type"],
        pipelineId: record.pipelineId ?? undefined,
        pipelineName: record.pipelineName,
        pipeId: record.pipeId ?? "",
        locationId: record.locationId ?? "",
        savedAt: record.createdAt.toISOString(),
        savedByName: record.author?.name ?? "Unknown User",
        savedByEmail: record.author?.email ?? "",
        pipelineOutsideDiameter: record.pipeline?.pipeOutsideDiameter ?? undefined,
        pipelineDiameterUnit: record.pipeline?.diameterUnit ?? undefined,
        assessment: {
          id: record.assessmentId ?? record.id,
          type: record.type as StoredAssessment["type"],
          pipelineId: record.pipelineId ?? undefined,
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

  async findExternalPipeDataById(id: string, search: OwnershipScope = {}): Promise<AssessmentPipeDataRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.externalPipeData.findUnique({
      where: { id },
      include: { author: true, pipeline: true }
    });

    if (!record || !matchesOwnerScope(record.authorId ?? undefined, search)) {
      return null;
    }

    // Inspection time belongs to the linked Assessment, never the history save time.
    // Older independent history records may have no linked assessment; keep it absent.
    const linkedAssessment = record.assessmentId ? await this.findAssessmentById(record.assessmentId, search) : null;
    const inspectionDate = linkedAssessment && linkedAssessment.pipelineId === record.pipelineId && linkedAssessment.type === record.type &&
      (linkedAssessment.authorId ?? null) === (record.authorId ?? null)
      ? linkedAssessment.inspectionDate : undefined;

    return {
      id: record.id,
      assessmentId: record.assessmentId ?? undefined,
      assessmentType: record.type as StoredAssessment["type"],
      pipelineId: record.pipelineId ?? undefined,
      pipelineName: record.pipelineName,
      pipeId: record.pipeId ?? "",
      locationId: record.locationId ?? "",
      savedAt: record.createdAt.toISOString(),
      savedByName: record.author?.name ?? "Unknown User",
      savedByEmail: record.author?.email ?? "",
      pipelineOutsideDiameter: record.pipeline?.pipeOutsideDiameter ?? undefined,
      pipelineDiameterUnit: record.pipeline?.diameterUnit ?? undefined,
      assessment: {
        id: record.assessmentId ?? record.id,
        type: record.type as StoredAssessment["type"],
        pipelineId: record.pipelineId ?? undefined,
        pipelineName: record.pipelineName,
        createdAt: record.createdAt.toISOString(),
        inspectionDate,
        riskLevel: record.result.riskLevel as StoredAssessment["riskLevel"],
        riskScore: Number(record.result.riskScore ?? 0),
        input: record.input as StoredAssessment["input"],
        result: record.result as StoredAssessment["result"],
        authorId: record.authorId ?? undefined
      }
    };
  }

  async deleteExternalPipeData(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findExternalPipeDataById(id, search);
    if (!existing) {
      return false;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.externalPipeData.delete({ where: { id } });
    return true;
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
    const existing = !input.id && input.assessment.id
      ? await prisma.externalPipeData.findUnique({
          where: { assessmentId: input.assessment.id },
          include: { author: true, pipeline: true }
        })
      : null;
    if (existing && (existing.authorId ?? "") !== (input.authorId ?? "")) {
      const error = new Error("Pipe data assessment ID already exists for another owner.") as Error & { code?: string };
      error.code = "PIPE_DATA_ASSESSMENT_ID_OWNER_MISMATCH";
      throw error;
    }
    const record =
      input.id || existing
        ? await prisma.externalPipeData.update({
            where: { id: input.id ?? existing!.id },
            data: {
              assessmentId: input.assessment.id || undefined,
              type: input.assessment.type,
              pipelineId: input.assessment.pipelineId,
              pipelineName: input.assessment.pipelineName,
              pipeId: pipeLocationId,
              locationId: pipeLocationId,
              input: input.assessment.input ?? {},
              result: input.assessment.result ?? {},
              authorId: input.authorId
            },
            include: { author: true, pipeline: true }
          })
        : await prisma.externalPipeData.create({
            data: {
              assessmentId: input.assessment.id || undefined,
              type: input.assessment.type,
              pipelineId: input.assessment.pipelineId,
              pipelineName: input.assessment.pipelineName,
              pipeId: pipeLocationId,
              locationId: pipeLocationId,
              input: input.assessment.input ?? {},
              result: input.assessment.result ?? {},
              authorId: input.authorId
            },
            include: { author: true, pipeline: true }
          });

    return {
      id: record.id,
      assessmentId: record.assessmentId ?? undefined,
      assessmentType: record.type as StoredAssessment["type"],
      pipelineId: record.pipelineId ?? undefined,
      pipelineName: record.pipelineName,
      pipeId: record.pipeId ?? "",
      locationId: record.locationId ?? "",
      savedAt: record.createdAt?.toISOString?.() ?? savedAt,
      savedByName: record.author?.name ?? "Unknown User",
      savedByEmail: record.author?.email ?? "",
      pipelineOutsideDiameter: record.pipeline?.pipeOutsideDiameter ?? undefined,
      pipelineDiameterUnit: record.pipeline?.diameterUnit ?? undefined,
      assessment: {
        id: record.assessmentId ?? record.id,
        type: record.type as StoredAssessment["type"],
        pipelineId: record.pipelineId ?? undefined,
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

  async listCpCalculations(search: CpCalculationSearch = {}): Promise<CpCalculationRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.cpCalculation.findMany({
      where: {
        pipelineId: search.pipelineId,
        pipeline: {
          createdById:
            search.viewerUserId && search.viewerRole !== "Admin"
              ? search.viewerUserId
              : undefined
        }
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });
    return records.map(toCpCalculationRecord);
  }

  async createCpCalculation(input: SaveCpCalculationInput): Promise<CpCalculationRecord> {
    const pipeline = await this.findPipelineById(input.calculation.pipelineId, input);
    if (!pipeline) {
      throw new Error("Pipeline not found.");
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      throw new DatabaseUnavailableError();
    }

    const record = await prisma.cpCalculation.create({
      data: {
        pipelineId: input.calculation.pipelineId,
        calculationType: input.calculation.calculationType,
        input: input.calculation.input,
        result: input.calculation.result,
        authorId: input.authorId
      },
      include: { author: true }
    });
    return toCpCalculationRecord(record);
  }

  async findCpCalculationById(id: string, search: OwnershipScope = {}): Promise<CpCalculationRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.cpCalculation.findUnique({
      where: { id },
      include: { author: true }
    });
    if (!record) {
      return null;
    }

    const pipeline = await this.findPipelineById(record.pipelineId, search);
    return pipeline ? toCpCalculationRecord(record) : null;
  }

  async getPipelineHistory(id: string, search: OwnershipScope = {}): Promise<PipelineHistory | null> {
    const pipeline = await this.findPipelineById(id, search);
    if (!pipeline) {
      return null;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const [assessmentRecords, reportRecords, cpCalculationRecords] = await Promise.all([
      prisma.assessment.findMany({ where: { pipelineId: id }, orderBy: { createdAt: "desc" } }),
      prisma.report.findMany({ where: { pipelineId: id }, include: { author: true }, orderBy: { createdAt: "desc" } }),
      prisma.cpCalculation.findMany({ where: { pipelineId: id }, include: { author: true }, orderBy: { createdAt: "desc" } })
    ]);

    const assessments = assessmentRecords.map(toAssessmentRecord);

    return buildPipelineHistory(
      pipeline,
      assessments,
      reportRecords.map(toReportRecord),
      cpCalculationRecords.map(toCpCalculationRecord)
    );
  }

  async listDevices(search: DeviceSearch = {}): Promise<DeviceRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const records = await prisma.deviceRecord.findMany({
      where: {
        deviceType: search.deviceType,
        status: search.status,
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined
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
      ,
      authorId: record.authorId ?? undefined
    }));
  }

  async createDevice(input: CreateDeviceInput): Promise<DeviceRecord> {
    const prisma = getPrismaClient();
    if (!prisma) throw new DatabaseUnavailableError();
    const duplicate = await prisma.deviceRecord.findUnique({ where: { deviceId: input.device.deviceId } });
    if (duplicate) throw new Error("Device ID already exists.");
    const record = await prisma.deviceRecord.create({
      data: {
        ...input.device,
        lastUpdatedAt: new Date(),
        isDemoData: input.isDemoData === true,
        authorId: input.authorId
      }
    });
    return {
      id: record.id,
      deviceId: record.deviceId,
      deviceType: record.deviceType as DeviceRecord["deviceType"],
      pipelineOrLocation: record.pipelineOrLocation,
      status: record.status as DeviceRecord["status"],
      latestReadingOrState: record.latestReadingOrState,
      unit: record.unit ?? undefined,
      lastUpdatedAt: record.lastUpdatedAt.toISOString(),
      isDemoData: Boolean(record.isDemoData),
      authorId: record.authorId ?? undefined
    };
  }

  async findDeviceById(id: string, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.deviceRecord.findUnique({ where: { id } });
    if (!record || !matchesOwnerScope(record.authorId ?? undefined, search)) {
      return null;
    }

    return {
      id: record.id,
      deviceId: record.deviceId,
      deviceType: record.deviceType as DeviceRecord["deviceType"],
      pipelineOrLocation: record.pipelineOrLocation,
      status: record.status as DeviceRecord["status"],
      latestReadingOrState: record.latestReadingOrState,
      unit: record.unit ?? undefined,
      lastUpdatedAt: record.lastUpdatedAt.toISOString(),
      isDemoData: Boolean(record.isDemoData),
      authorId: record.authorId ?? undefined
    };
  }

  async updateDeviceUnit(id:string,unit:string,search:OwnershipScope={}):Promise<DeviceRecord|null>{
    const existing=await this.findDeviceById(id,search);if(!existing)return null;
    const prisma=getPrismaClient();if(!prisma)throw new DatabaseUnavailableError();
    const result=await prisma.deviceRecord.updateMany({where:{id,authorId:existing.authorId??null,deviceType:existing.deviceType},data:{unit,lastUpdatedAt:new Date()}});
    return result.count?this.findDeviceById(id,search):null;
  }

  async updateDeviceLocation(id: string, input: UpdateDeviceLocationInput, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    const existing = await this.findDeviceById(id, search);
    if (!existing) return null;

    const prisma = getPrismaClient();
    if (!prisma) return null;
    const record = await prisma.deviceRecord.update({
      where: { id },
      data: { pipelineOrLocation: input.pipelineOrLocation, lastUpdatedAt: new Date() }
    });
    return {
      id: record.id,
      deviceId: record.deviceId,
      deviceType: record.deviceType as DeviceRecord["deviceType"],
      pipelineOrLocation: record.pipelineOrLocation,
      status: record.status as DeviceRecord["status"],
      latestReadingOrState: record.latestReadingOrState,
      unit: record.unit ?? undefined,
      lastUpdatedAt: record.lastUpdatedAt.toISOString(),
      isDemoData: Boolean(record.isDemoData),
      authorId: record.authorId ?? undefined
    };
  }

  async deleteDevice(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findDeviceById(id, search);
    if (!existing) {
      return false;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.deviceRecord.delete({ where: { id } });
    return true;
  }

  async listSensorAssignments(search: SensorAssignmentSearch = {}): Promise<SensorAssignmentRecord[]> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return [];
    }

    const searchTerm = search.search?.trim();
    const records = await prisma.sensorAssignment.findMany({
      where: {
        sensorCategory: search.sensorCategory,
        sensorDeviceType: search.sensorDeviceType,
        assignmentStatus: search.assignmentStatus,
        dataSource: search.dataSource,
        pipelineOrAsset: search.pipelineOrAsset
          ? { contains: search.pipelineOrAsset.trim(), mode: "insensitive" }
          : undefined,
        authorId:
          search.viewerUserId && search.viewerRole !== "Admin"
            ? search.viewerUserId
            : undefined,
        OR: searchTerm
          ? [
              { sensorId: { contains: searchTerm, mode: "insensitive" } },
              { sensorName: { contains: searchTerm, mode: "insensitive" } },
              { sensorCategory: { contains: searchTerm, mode: "insensitive" } },
              { sensorDeviceType: { contains: searchTerm, mode: "insensitive" } },
              { pipelineOrAsset: { contains: searchTerm, mode: "insensitive" } },
              { installationLocation: { contains: searchTerm, mode: "insensitive" } },
              { installationType: { contains: searchTerm, mode: "insensitive" } },
              { valuesMeasured: { contains: searchTerm, mode: "insensitive" } },
              { measurementUnit: { contains: searchTerm, mode: "insensitive" } },
              { dataSource: { contains: searchTerm, mode: "insensitive" } },
              { assignmentStatus: { contains: searchTerm, mode: "insensitive" } },
              { notes: { contains: searchTerm, mode: "insensitive" } }
            ]
          : undefined
      },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });

    return records.map(toSensorAssignmentRecord);
  }

  async findSensorAssignmentById(id: string, search: OwnershipScope = {}): Promise<SensorAssignmentRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const record = await prisma.sensorAssignment.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!record || !matchesOwnerScope(record.authorId ?? undefined, search)) {
      return null;
    }

    return toSensorAssignmentRecord(record);
  }

  async saveSensorAssignment(input: SaveSensorAssignmentInput): Promise<SensorAssignmentRecord> {
    const prisma = getPrismaClient();
    if (!prisma) {
      const now = new Date().toISOString();
      return {
        ...input.assignment,
        id: input.id ?? createId("sensor-assignment"),
        activeFrom: now,
        activeTo: normalizeActiveTo(input.assignment.assignmentStatus, input.assignment.activeTo),
        createdAt: now,
        updatedAt: now,
        authorId: input.authorId
      };
    }

    if (input.assignment.assignmentStatus === "Active") {
      const duplicate = await prisma.sensorAssignment.findFirst({
        where: {
          sensorId: input.assignment.sensorId,
          assignmentStatus: "Active",
          activeTo: null,
          id: input.id ? { not: input.id } : undefined
        }
      });

      if (duplicate) {
        throw new Error("Sensor already has an active assignment.");
      }
    }

    const activeTo = normalizeActiveTo(input.assignment.assignmentStatus, input.assignment.activeTo);
    const data = {
      sensorId: input.assignment.sensorId,
      sensorName: input.assignment.sensorName,
      sensorCategory: input.assignment.sensorCategory,
      sensorDeviceType: input.assignment.sensorDeviceType,
      pipelineOrAsset: input.assignment.pipelineOrAsset,
      installationLocation: input.assignment.installationLocation,
      installationType: input.assignment.installationType,
      valuesMeasured: input.assignment.valuesMeasured,
      measurementUnit: input.assignment.measurementUnit,
      installationDate: new Date(`${input.assignment.installationDate}T00:00:00.000Z`),
      dataSource: input.assignment.dataSource,
      assignmentStatus: input.assignment.assignmentStatus,
      notes: input.assignment.notes?.trim() || null,
      activeTo: activeTo ? new Date(activeTo) : null,
      previousAssignmentId: input.assignment.previousAssignmentId,
      authorId: input.authorId
    };

    const record = input.id
      ? await prisma.sensorAssignment.update({
          where: { id: input.id },
          data,
          include: { author: true }
        })
      : await prisma.sensorAssignment.create({
          data,
          include: { author: true }
        });

    return toSensorAssignmentRecord(record);
  }

  async deactivateSensorAssignment(id: string): Promise<SensorAssignmentRecord | null> {
    const prisma = getPrismaClient();
    if (!prisma) {
      return null;
    }

    const existing = await this.findSensorAssignmentById(id);
    if (!existing) {
      return null;
    }

    const record = await prisma.sensorAssignment.update({
      where: { id },
      data: {
        assignmentStatus: "Inactive",
        activeTo: new Date()
      },
      include: { author: true }
    });

    return toSensorAssignmentRecord(record);
  }

  async reassignSensorAssignment(
    id: string,
    assignment: SensorAssignmentInput,
    authorId?: string
  ): Promise<SensorAssignmentRecord | null> {
    const existing = await this.findSensorAssignmentById(id);
    if (!existing) {
      return null;
    }

    await this.deactivateSensorAssignment(id);
    return this.saveSensorAssignment({
      assignment: {
        ...assignment,
        previousAssignmentId: id
      },
      authorId
    });
  }

  async deleteSensorAssignment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    const existing = await this.findSensorAssignmentById(id, search);
    if (!existing) {
      return false;
    }

    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await prisma.sensorAssignment.delete({ where: { id } });
    return true;
  }
}

let memoryStore: MemoryStore | null = null;
const prismaStore = env.databaseUrl ? new PrismaStore() : null;
let activeStorageMode: StorageMode | null = null;

function getMemoryStore(): MemoryStore {
  if (!allowMemoryStorage) {
    throw new DatabaseUnavailableError("Memory storage is disabled outside development and automated tests.");
  }

  if (!memoryStore) {
    memoryStore = new MemoryStore();
  }

  return memoryStore;
}

async function canUsePrisma(): Promise<boolean> {
  if (!prismaStore) {
    return false;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return false;
  }

  await prisma.$connect();
  return true;
}

function logStorageMode(mode: StorageMode) {
  updateSaveDiagnostics({ storageMode: mode });

  if (activeStorageMode === mode) {
    return;
  }

  activeStorageMode = mode;
  console.log(`Klinthru storage mode active: ${mode}`);
}

async function usePrisma(): Promise<boolean> {
  try {
    if (await canUsePrisma()) {
      logStorageMode("postgresql");
      return true;
    }
  } catch (error) {
    if (isProduction) {
      throw new DatabaseUnavailableError();
    }

    console.warn("Prisma unavailable; using development/test in-memory storage.", error);
  }

  if (!allowMemoryStorage) {
    throw new DatabaseUnavailableError(
      env.databaseUrl
        ? "Database is unavailable. Permanent storage could not be reached."
        : "DATABASE_URL is required outside development and automated tests."
    );
  }

  logStorageMode("memory");
  return false;
}

export async function initializeStorage(): Promise<StorageMode> {
  if (await usePrisma()) {
    return "postgresql";
  }

  getMemoryStore();
  return "memory";
}

export const store = {
  toAuthUser,
  async listUsers(): Promise<UserRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listUsers();
    }

    return getMemoryStore().listUsers();
  },
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findUserByEmail(email);
    }

    return getMemoryStore().findUserByEmail(email);
  },
  async findUserById(id: string): Promise<UserRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findUserById(id);
    }

    return getMemoryStore().findUserById(id);
  },
  async createUser(input: CreateUserInput): Promise<UserRecord> {
    if (await usePrisma()) {
      return prismaStore!.createUser(input);
    }

    return getMemoryStore().createUser(input);
  },
  async listPipelines(search: PipelineSearch = {}): Promise<PipelineRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listPipelines(search);
    }

    return getMemoryStore().listPipelines(search);
  },
  async createPipeline(input: SavePipelineInput): Promise<PipelineRecord> {
    if (await usePrisma()) {
      return prismaStore!.createPipeline(input);
    }

    return getMemoryStore().createPipeline(input);
  },
  async updatePipeline(id: string, input: SavePipelineInput): Promise<PipelineRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.updatePipeline(id, input);
    }

    return getMemoryStore().updatePipeline(id, input);
  },
  async deletePipeline(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deletePipeline(id, search);
    }
    return getMemoryStore().deletePipeline(id, search);
  },
  async deleteSegment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) return prismaStore!.deleteSegment(id, search);
    return getMemoryStore().deleteSegment(id, search);
  },
  async findPipelineById(id: string, search: OwnershipScope = {}): Promise<PipelineRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findPipelineById(id, search);
    }

    return getMemoryStore().findPipelineById(id, search);
  },
  async getPipelineHistory(id: string, search: OwnershipScope = {}): Promise<PipelineHistory | null> {
    if (await usePrisma()) {
      return prismaStore!.getPipelineHistory(id, search);
    }

    return getMemoryStore().getPipelineHistory(id, search);
  },
  async listSegments(search: SegmentSearch = {}): Promise<SegmentRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listSegments(search);
    }

    return getMemoryStore().listSegments(search);
  },
  async findSegmentById(id: string, search: OwnershipScope = {}): Promise<SegmentRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findSegmentById(id, search);
    }

    return getMemoryStore().findSegmentById(id, search);
  },
  async saveSegment(input: SaveSegmentInput): Promise<SegmentRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveSegment(input);
    }

    return getMemoryStore().saveSegment(input);
  },
  async listAssets(search: AssetSearch = {}): Promise<AssetRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listAssets(search);
    }

    return getMemoryStore().listAssets(search);
  },
  async findAssetById(id: string, search: OwnershipScope = {}): Promise<AssetRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findAssetById(id, search);
    }

    return getMemoryStore().findAssetById(id, search);
  },
  async saveAsset(input: SaveAssetInput): Promise<AssetRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveAsset(input);
    }

    return getMemoryStore().saveAsset(input);
  },
  async deleteAsset(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) return prismaStore!.deleteAsset(id, search);
    return getMemoryStore().deleteAsset(id, search);
  },
  async listCpTestPoints(search: CpAssetSearch = {}): Promise<CpTestPointRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listCpTestPoints(search);
    }

    return getMemoryStore().listCpTestPoints(search);
  },
  async findCpTestPointById(id: string, search: OwnershipScope = {}): Promise<CpTestPointRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findCpTestPointById(id, search);
    }

    return getMemoryStore().findCpTestPointById(id, search);
  },
  async saveCpTestPoint(input: SaveCpTestPointInput): Promise<CpTestPointRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveCpTestPoint(input);
    }

    return getMemoryStore().saveCpTestPoint(input);
  },
  async listCpRectifiers(search: CpAssetSearch = {}): Promise<CpRectifierRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listCpRectifiers(search);
    }

    return getMemoryStore().listCpRectifiers(search);
  },
  async findCpRectifierById(id: string, search: OwnershipScope = {}): Promise<CpRectifierRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findCpRectifierById(id, search);
    }

    return getMemoryStore().findCpRectifierById(id, search);
  },
  async saveCpRectifier(input: SaveCpRectifierInput): Promise<CpRectifierRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveCpRectifier(input);
    }

    return getMemoryStore().saveCpRectifier(input);
  },
  async listAssessments(search: OwnershipScope = {}): Promise<StoredAssessment[]> {
    if (await usePrisma()) {
      return prismaStore!.listAssessments(search);
    }

    return getMemoryStore().listAssessments(search);
  },
  async createAssessment(input: CreateAssessmentInput): Promise<StoredAssessment> {
    if (await usePrisma()) {
      return prismaStore!.createAssessment(input);
    }

    return getMemoryStore().createAssessment(input);
  },
  async findAssessmentById(id: string, search: OwnershipScope = {}): Promise<StoredAssessment | null> {
    if (await usePrisma()) {
      return prismaStore!.findAssessmentById(id, search);
    }

    return getMemoryStore().findAssessmentById(id, search);
  },
  async deleteAssessment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deleteAssessment(id, search);
    }

    return getMemoryStore().deleteAssessment(id, search);
  },
  async listReports(search: ReportSearch = {}): Promise<ReportRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listReports(search);
    }

    return getMemoryStore().listReports(search);
  },
  async createReport(input: CreateReportInput): Promise<ReportRecord> {
    if (await usePrisma()) {
      return prismaStore!.createReport(input);
    }

    return getMemoryStore().createReport(input);
  },
  async findReportById(id: string, search: ReportSearch = {}): Promise<ReportRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findReportById(id, search);
    }

    return getMemoryStore().findReportById(id, search);
  },
  async deleteReport(id: string, search: ReportSearch = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deleteReport(id, search);
    }

    return getMemoryStore().deleteReport(id, search);
  },
  async listExternalPipeData(search: ExternalPipeDataSearch): Promise<AssessmentPipeDataSummary[]> {
    if (await usePrisma()) {
      return prismaStore!.listExternalPipeData(search);
    }

    return getMemoryStore().listExternalPipeData(search);
  },
  async findExternalPipeDataById(id: string, search: OwnershipScope = {}): Promise<AssessmentPipeDataRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findExternalPipeDataById(id, search);
    }

    return getMemoryStore().findExternalPipeDataById(id, search);
  },
  async deleteExternalPipeData(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deleteExternalPipeData(id, search);
    }

    return getMemoryStore().deleteExternalPipeData(id, search);
  },
  async saveExternalPipeData(input: SaveExternalPipeDataInput): Promise<AssessmentPipeDataRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveExternalPipeData(input);
    }

    return getMemoryStore().saveExternalPipeData(input);
  },
  async listCpCalculations(search: CpCalculationSearch = {}): Promise<CpCalculationRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listCpCalculations(search);
    }

    return getMemoryStore().listCpCalculations(search);
  },
  async createCpCalculation(input: SaveCpCalculationInput): Promise<CpCalculationRecord> {
    if (await usePrisma()) {
      return prismaStore!.createCpCalculation(input);
    }

    return getMemoryStore().createCpCalculation(input);
  },
  async findCpCalculationById(id: string, search: OwnershipScope = {}): Promise<CpCalculationRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findCpCalculationById(id, search);
    }

    return getMemoryStore().findCpCalculationById(id, search);
  },
  async listDevices(search: DeviceSearch = {}): Promise<DeviceRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listDevices(search);
    }

    return getMemoryStore().listDevices(search);
  },
  async createDevice(input: CreateDeviceInput): Promise<DeviceRecord> {
    if (await usePrisma()) return prismaStore!.createDevice(input);
    return getMemoryStore().createDevice(input);
  },
  async findDeviceById(id: string, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findDeviceById(id, search);
    }

    return getMemoryStore().findDeviceById(id, search);
  },
  async updateDeviceUnit(id:string,unit:string,search:OwnershipScope={}):Promise<DeviceRecord|null>{
    if(await usePrisma())return prismaStore!.updateDeviceUnit(id,unit,search);
    return getMemoryStore().updateDeviceUnit(id,unit,search);
  },
  async updateDeviceLocation(id: string, input: UpdateDeviceLocationInput, search: OwnershipScope = {}): Promise<DeviceRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.updateDeviceLocation(id, input, search);
    }
    return getMemoryStore().updateDeviceLocation(id, input, search);
  },
  async deleteDevice(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deleteDevice(id, search);
    }

    return getMemoryStore().deleteDevice(id, search);
  },
  async listSensorAssignments(search: SensorAssignmentSearch = {}): Promise<SensorAssignmentRecord[]> {
    if (await usePrisma()) {
      return prismaStore!.listSensorAssignments(search);
    }

    return getMemoryStore().listSensorAssignments(search);
  },
  async findSensorAssignmentById(id: string, search: OwnershipScope = {}): Promise<SensorAssignmentRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.findSensorAssignmentById(id, search);
    }

    return getMemoryStore().findSensorAssignmentById(id, search);
  },
  async saveSensorAssignment(input: SaveSensorAssignmentInput): Promise<SensorAssignmentRecord> {
    if (await usePrisma()) {
      return prismaStore!.saveSensorAssignment(input);
    }

    return getMemoryStore().saveSensorAssignment(input);
  },
  async deactivateSensorAssignment(id: string): Promise<SensorAssignmentRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.deactivateSensorAssignment(id);
    }

    return getMemoryStore().deactivateSensorAssignment(id);
  },
  async reassignSensorAssignment(
    id: string,
    assignment: SensorAssignmentInput,
    authorId?: string
  ): Promise<SensorAssignmentRecord | null> {
    if (await usePrisma()) {
      return prismaStore!.reassignSensorAssignment(id, assignment, authorId);
    }

    return getMemoryStore().reassignSensorAssignment(id, assignment, authorId);
  },
  async deleteSensorAssignment(id: string, search: OwnershipScope = {}): Promise<boolean> {
    if (await usePrisma()) {
      return prismaStore!.deleteSensorAssignment(id, search);
    }

    return getMemoryStore().deleteSensorAssignment(id, search);
  }
};
