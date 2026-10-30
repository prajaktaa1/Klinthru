import { Router } from "express";
import { riskDriversRepository } from "../data/riskRemainingRepository";
import { riskRegisterRepository } from "../data/riskRegisterRepository";
import { historyScopeSchema, riskHistoryRepository } from "../data/riskHistoryRepository";
import { riskReportingRepository } from "../data/riskReportingRepository";
import { configurationScopeSchema, riskConfigurationRepository } from "../data/riskConfigurationRepository";
import { matrixScopeSchema, riskMatrixRepository } from "../data/riskMatrixRepository";
import { requireAuth } from "../middleware/auth";
import { riskAssessmentRepository } from "../data/riskAssessmentRepository";
import { riskApprovalDecisions, riskScopeSchema } from "../validation/riskAssessmentValidation";
import { sourceLinkReadiness } from "../utils/riskSourceResolver";
import { riskTreatmentRepository } from "../data/riskTreatmentRepository";
import { treatmentScopeSchema, treatmentDetailQuerySchema } from "../validation/riskTreatmentValidation";
import { riskRelatedRepository, relatedOptionsScope, relatedScopeSchema } from "../data/riskRelatedRepository";
import { assessmentDetailRepository } from "../data/riskAssessmentDetailRepository";
import { assessmentDetailOptionsScope, assessmentDetailScope } from "../validation/riskAssessmentDetailValidation";

export const riskAssessmentsRouter = Router();
// Risk responses and failures may contain confidential scope information.
riskAssessmentsRouter.use((_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});
riskAssessmentsRouter.use(requireAuth);

// All mutations stay locked, including creation/reassessment and configuration.
// This prevents duplicate Risk_IDs and edits/approval before policies and database
// immutability constraints have received separate approval and deployment.
riskAssessmentsRouter.use((request, response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    response.status(423).json({ status: "approval-needed", message: "APPROVAL NEEDED — Risk Assessment is read-only. No records were changed.", decisions: riskApprovalDecisions });
    return;
  }
  next();
});

riskAssessmentsRouter.get("/readiness", (_request, response) => {
  response.json({ mutationsEnabled: false, schemaDeploymentVerified: false, decisions: riskApprovalDecisions, sourceLinks: sourceLinkReadiness(),
    dependencies: { actions: "Central Action Register — integration pending", reports: "Reports & Analytics — official-risk contract pending", technicalIntegrations: "Integration Hub" } });
});

riskAssessmentsRouter.get("/methodologies", async (_request, response) => {
  response.json(await riskAssessmentRepository.methodologies());
});

riskAssessmentsRouter.get("/overview", async (request, response) => {
  const parsed = riskScopeSchema.safeParse(request.query);
  if (!parsed.success) { response.status(400).json({ message: "Invalid risk scope.", fields: parsed.error.flatten() }); return; }
  response.json(await riskAssessmentRepository.overview(request.user!, parsed.data));
});

riskAssessmentsRouter.get("/drivers", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = riskScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid Driver scope." }); return; }
  response.json(await riskDriversRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/register", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = riskScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid register scope." }); return; }
  response.json(await riskRegisterRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/history", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = historyScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid historical Risk scope." }); return; }
  response.json(await riskHistoryRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/reporting", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = riskScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid Risk reporting scope." }); return; }
  response.json(await riskReportingRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/matrix", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = matrixScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid matrix scope/filter.", fields: scope.error.flatten() }); return; }
  response.json(await riskMatrixRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/configuration", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = configurationScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid configuration scope.", fields: scope.error.flatten() }); return; }
  response.json(await riskConfigurationRepository.read(request.user!, scope.data));
});

riskAssessmentsRouter.get("/treatments", async (request, response) => {
  const scope = treatmentScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid treatment scope/filter.", fields: scope.error.flatten() }); return; }
  response.json(await riskTreatmentRepository.list(request.user!, scope.data));
});
riskAssessmentsRouter.get("/treatments/summary", async (request, response) => {
  const scope = treatmentScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid treatment summary scope.", fields: scope.error.flatten() }); return; }
  response.json(await riskTreatmentRepository.summary(request.user!, scope.data));
});
riskAssessmentsRouter.get("/treatments/:treatmentId/action-references", async (request, response) => {
  const query = treatmentDetailQuerySchema.safeParse(request.query);
  if (!query.success) { response.status(400).json({ message: "Invalid treatment revision." }); return; }
  response.json(await riskTreatmentRepository.references(request.user!, request.params.treatmentId, query.data.revisionId));
});
riskAssessmentsRouter.get("/treatments/:treatmentId", async (request, response) => {
  const query = treatmentDetailQuerySchema.safeParse(request.query);
  if (!query.success) { response.status(400).json({ message: "Invalid treatment revision." }); return; }
  response.json(await riskTreatmentRepository.detail(request.user!, request.params.treatmentId, query.data.revisionId));
});
riskAssessmentsRouter.get("/related-data/options", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = relatedOptionsScope.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid related-data scope." }); return; }
  response.json(await riskRelatedRepository.options(request.user!, scope.data));
});
riskAssessmentsRouter.get("/related-data", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = relatedScopeSchema.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid related-data scope/filter." }); return; }
  response.json(await riskRelatedRepository.read(request.user!, scope.data));
});
riskAssessmentsRouter.get("/assessment-details/options", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = assessmentDetailOptionsScope.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid assessment selection scope." }); return; }
  response.json(await assessmentDetailRepository.options(request.user!, scope.data));
});
riskAssessmentsRouter.get("/assessment-details", async (request, response) => {
  response.set("Cache-Control", "private, no-store");
  const scope = assessmentDetailScope.safeParse(request.query);
  if (!scope.success) { response.status(400).json({ message: "Invalid assessment revision scope." }); return; }
  response.json(await assessmentDetailRepository.detail(request.user!, scope.data));
});
riskAssessmentsRouter.get("*", (_request, response) => {
  response.status(501).json({ status: "approval-needed", message: "Requested Risk Assessment read endpoint is not implemented. Governed write workflows remain locked." });
});
