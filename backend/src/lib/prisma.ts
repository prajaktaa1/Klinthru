import { env } from "../config/env";

type PrismaClientLike = {
  // Optional until the additive Reports contract migration is explicitly deployed.
  reportDefinition?: any;
  reportDefinitionVersion?: any;
  reportingField?: any;
  reportingJoin?: any;
  customReportDefinition?: any;
  reportInputSnapshot?: any;
  reportSourceLink?: any;
  reportRun?: any;
  reportRunEvent?: any;
  reportSchedule?: any;
  reportDelivery?: any;
  reportExportJob?: any;
  reportExportTemplate?: any;
  reportTemplate?: any;
  reportTemplateVersion?: any;
  reportConfiguration?: any;
  reportAuditEvent?: any;
  riskTreatment?: import("../types/riskTreatment").TreatmentReadClient["riskTreatment"];
  // Optional until the separately approved risk schema/client deployment occurs.
  risk?: import("../types/riskAssessment").RiskReadClient["risk"];
  riskMethodologyVersion?: import("../types/riskAssessment").RiskReadClient["riskMethodologyVersion"];
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(callback: (client: Omit<PrismaClientLike, "$transaction" | "$connect" | "$disconnect">) => Promise<T>, options?: { maxWait?: number; timeout?: number }): Promise<T>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  user: {
    count(args?: unknown): Promise<number>;
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  assessment: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  pipeline: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  segment: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  asset: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  cpTestPoint: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  cpReadingHistory: {
    findMany(args: unknown): Promise<any[]>;
  };
  cpRectifier: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  cpCalculation: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
  };
  report: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    upsert(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  externalPipeData: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  deviceRecord: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    updateMany(args: unknown): Promise<{count:number}>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  sensorAssignment: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  letterHead: {
    findUnique(args: unknown): Promise<any>;
    upsert(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  integrationConnector: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  integrationEvent: {
    findMany(args: unknown): Promise<any[]>;
    create(args: unknown): Promise<any>;
  };
  integrationHubRecord: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    delete(args: unknown): Promise<any>;
  };
  managedDocument: {
    count(args: unknown): Promise<number>;
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  documentVersion: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
    aggregate(args: unknown): Promise<any>;
  };
  documentLink: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
  };
};

let prismaClient: PrismaClientLike | null = null;

export function getPrismaClient(): PrismaClientLike | null {
  if (!env.databaseUrl) {
    return null;
  }

  if (!prismaClient) {
    const prismaModule = require("@prisma/client") as { PrismaClient?: new () => PrismaClientLike };
    if (!prismaModule.PrismaClient) {
      return null;
    }

    prismaClient = new prismaModule.PrismaClient();
  }

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
}
