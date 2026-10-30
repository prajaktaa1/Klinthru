import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";
import { RiskReadClient, RiskScope } from "../types/riskAssessment";
import { buildOfficialOverview, unavailableOverview } from "../utils/riskAssessmentRules";

/** Never initialize storage, seed records, or fall back to memory/demo risk data. */
export function getRiskReader(): RiskReadClient | null {
  const prisma = getPrismaClient();
  return prisma?.risk && prisma.riskMethodologyVersion
    ? { risk: prisma.risk, riskMethodologyVersion: prisma.riskMethodologyVersion } : null;
}

export function createRiskReadRepository(reader: () => RiskReadClient | null = getRiskReader) {
  return {
    async methodologies() {
      try {
        const db = reader();
        if (!db) return { status: "schema-unavailable", items: [], reason: "Risk storage delegates are unavailable in this process. Database readiness requires separate verification." };
        const methods = await db.riskMethodologyVersion.findMany({ where: { approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } }, include: { matrixVersion: true }, orderBy: [{ methodologyId: "asc" }, { version: "asc" }] });
        return { status: "available", items: methods.map(method => ({ id: method.id, methodologyId: method.methodologyId, version: method.version, name: method.name })) };
      } catch {
        return { status: "unavailable", items: [], reason: "Authoritative risk methodology storage could not be read. Deployment and database availability require verification." };
      }
    },
    async overview(user: AuthUser, scope: RiskScope, asOf = new Date()) {
      try {
        const db = reader();
        if (!db) return unavailableOverview("schema-unavailable", ["Risk schema/client deployment has not been verified. Official risk data is unavailable, not zero."], asOf);
        if (!scope.methodologyVersionId) return unavailableOverview("approval-needed", ["Select an approved methodology version. No scoring thresholds, status groups or calendar rules are assumed."], asOf);
        const methodology = await db.riskMethodologyVersion.findFirst({ where: { id: scope.methodologyVersionId, approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } }, include: { matrixVersion: true } });
        if (!methodology) return unavailableOverview("approval-needed", ["Approved methodology and matrix version not found."], asOf);
        const records = await db.risk.findMany({
          where: { ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}),
            ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }),
            currentApprovedRevision: { methodologyVersionId: methodology.id, approvalStatus: "Approved" } },
          include: { pipeline: { select: { pipelineName: true, pipelineCode: true, createdById: true } },
            asset: { select: { name: true, latitude: true, longitude: true } }, currentApprovedRevision: true,
            reviews: { where: { completedAt: null }, select: { dueDate: true, completedAt: true, revisionId: true } } }
        });
        return buildOfficialOverview(records, methodology, asOf);
      } catch {
        return unavailableOverview("unavailable", ["Authoritative risk storage could not be read. No assessment counts or fallback records are substituted."], asOf);
      }
    }
  };
}

export const riskAssessmentRepository = createRiskReadRepository();
