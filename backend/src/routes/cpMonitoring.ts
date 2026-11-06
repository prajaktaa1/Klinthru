import { Router } from "express";

import { getCpMonitoringData } from "../cpMonitoring/data";
import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import {
  validateCpRectifierInput,
  validateCpRectifierUpdateInput,
  validateCpTestPointInput,
  validateCpTestPointUpdateInput
} from "../validation/cpAssetLinkValidation";
import { assertNoDangerousKeys, createValidationError } from "../validation/validationErrors";

export const cpMonitoringRouter = Router();

cpMonitoringRouter.use(requireAuth);

cpMonitoringRouter.get("/test-points", async (request, response, next) => {
  try {
    const pipelineId = queryText(request.query.pipelineId);
    if (!pipelineId) {
      throw createValidationError({ pipelineId: "Pipeline ID is required" });
    }

    response.json((await store.listCpTestPoints({ pipelineId, ...ownerScope(request.user!) })).map(toLinkedTestPointResponse));
  } catch (error) {
    next(error);
  }
});

cpMonitoringRouter.get("/test-points/:id", async (request, response, next) => {
  try {
    const testPoint = await store.findCpTestPointById(request.params.id, ownerScope(request.user!));
    if (!testPoint) {
      response.status(404).json({ message: "CP test point not found." });
      return;
    }

    response.json(toLinkedTestPointResponse(testPoint));
  } catch (error) {
    next(error);
  }
});

cpMonitoringRouter.post("/test-points", async (request, response, next) => {
  try {
    assertNoDangerousKeys(request.body);
    const input = validateCpTestPointInput(request.body);
    if (!(await store.findPipelineById(input.pipelineId, ownerScope(request.user!)))) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const created = await store.saveCpTestPoint({ testPoint: input, companyId: request.user?.companyId });
    response.status(201).json(toLinkedTestPointResponse(created));
  } catch (error) {
    handleCpAssetLinkError(error, response, next);
  }
});

cpMonitoringRouter.put("/test-points/:id", async (request, response, next) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findCpTestPointById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "CP test point not found." });
      return;
    }

    const input = validateCpTestPointUpdateInput(request.body);
    const updated = await store.saveCpTestPoint({ id: request.params.id, testPoint: input, companyId: request.user?.companyId });
    response.json(toLinkedTestPointResponse(updated));
  } catch (error) {
    handleCpAssetLinkError(error, response, next);
  }
});

cpMonitoringRouter.get("/rectifiers", async (request, response, next) => {
  try {
    const pipelineId = queryText(request.query.pipelineId);
    if (!pipelineId) {
      throw createValidationError({ pipelineId: "Pipeline ID is required" });
    }

    response.json((await store.listCpRectifiers({ pipelineId, ...ownerScope(request.user!) })).map(toLinkedRectifierResponse));
  } catch (error) {
    next(error);
  }
});

cpMonitoringRouter.get("/rectifiers/:id", async (request, response, next) => {
  try {
    const rectifier = await store.findCpRectifierById(request.params.id, ownerScope(request.user!));
    if (!rectifier) {
      response.status(404).json({ message: "CP rectifier not found." });
      return;
    }

    response.json(toLinkedRectifierResponse(rectifier));
  } catch (error) {
    next(error);
  }
});

cpMonitoringRouter.post("/rectifiers", async (request, response, next) => {
  try {
    assertNoDangerousKeys(request.body);
    const input = validateCpRectifierInput(request.body);
    if (!(await store.findPipelineById(input.pipelineId, ownerScope(request.user!)))) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const created = await store.saveCpRectifier({ rectifier: input, companyId: request.user?.companyId });
    response.status(201).json(toLinkedRectifierResponse(created));
  } catch (error) {
    handleCpAssetLinkError(error, response, next);
  }
});

cpMonitoringRouter.put("/rectifiers/:id", async (request, response, next) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findCpRectifierById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "CP rectifier not found." });
      return;
    }

    const input = validateCpRectifierUpdateInput(request.body);
    const updated = await store.saveCpRectifier({ id: request.params.id, rectifier: input, companyId: request.user?.companyId });
    response.json(toLinkedRectifierResponse(updated));
  } catch (error) {
    handleCpAssetLinkError(error, response, next);
  }
});

cpMonitoringRouter.get("/:pipelineId", async (request, response, next) => {
  try {
    const pipeline = await store.findPipelineById(request.params.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    response.json({
      pipeline: { id: pipeline.id, pipelineCode: pipeline.pipelineCode, pipelineName: pipeline.pipelineName },
      ...(await getCpMonitoringData(pipeline.id))
    });
  } catch (error) {
    next(error);
  }
});

function queryText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toLinkedTestPointResponse(record: Awaited<ReturnType<typeof store.findCpTestPointById>>) {
  if (!record) return record;
  const { asset, latestReadings, ...cp } = record;
  return { asset: asset ?? null, cp, readings: latestReadings ?? null };
}

function toLinkedRectifierResponse(record: Awaited<ReturnType<typeof store.findCpRectifierById>>) {
  if (!record) return record;
  const { asset, ...cp } = record;
  return { asset: asset ?? null, cp };
}

function handleCpAssetLinkError(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }, next: (error?: unknown) => void) {
  if (error instanceof Error) {
    const coded = error as Error & { code?: string };
    if (coded.code === "CP_ASSET_LINK_CONFLICT" || coded.code === "P2002") {
      response.status(409).json({ message: error.message });
      return;
    }

    if (
      error.message === "Asset not found." ||
      error.message === "Pipeline not found." ||
      error.message === "CP test point not found." ||
      error.message === "CP rectifier not found."
    ) {
      response.status(400).json({ message: error.message });
      return;
    }
  }

  next(error);
}
