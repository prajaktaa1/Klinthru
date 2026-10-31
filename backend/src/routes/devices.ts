import { Router } from "express";

import { store } from "../data/store";
import { canModifySensors, ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { validateDeviceInput, validateDeviceRecord, validateDeviceRecordList } from "../validation/deviceValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get("/relationships", async (request, response, next) => {
  try {
    const scope = ownerScope(request.user!);
    const [devices, pipelines] = await Promise.all([store.listDevices(scope), store.listPipelines(scope)]);
    const realDevices = devices.filter((device) => !device.isDemoData);
    const result: Array<Record<string, unknown>> = [];
    for (const pipeline of pipelines) {
      const candidates = realDevices.filter((device) => device.pipelineOrLocation.split("/")[0]?.trim().toLowerCase() === pipeline.pipelineCode.toLowerCase());
      if (!candidates.length) continue;
      const [segments, assets] = await Promise.all([
        store.listSegments({ pipelineId: pipeline.id, ...scope }),
        store.listAssets({ pipelineId: pipeline.id, ...scope })
      ]);
      for (const device of candidates) {
        const parts = device.pipelineOrLocation.split("/").map((part) => part.trim());
        const segment = segments.find((item) => item.segmentId.toLowerCase() === (parts[1] ?? "").toLowerCase());
        const kp = parts[2]?.replace(/^KP\s*/i, "");
        const asset = assets.find((item) => item.assetId === device.deviceId && item.segmentId === segment?.id && String(item.kp ?? "") === String(kp ?? ""));
        if (!segment || !asset) continue;
        result.push({ sensorId: device.deviceId, pipelineId: pipeline.id, pipelineCode: pipeline.pipelineCode, pipelineName: pipeline.pipelineName, segmentRecordId: segment.id, segmentId: segment.segmentId, assetRecordId: asset.id, assetId: asset.assetId, assetName: asset.name, kp: asset.kp, unit: device.unit, status: device.status, monitoringPoint: null, channel: null, provenance: "Device registry + Asset Master" });
      }
    }
    response.json(result);
  } catch (error) {
    next(error);
  }
});

devicesRouter.get("/", async (request, response, next) => {
  try {
    const records = await store.listDevices({
      deviceType:
        typeof request.query.deviceType === "string"
          ? (request.query.deviceType as never)
          : undefined,
      status:
        typeof request.query.status === "string"
          ? (request.query.status as never)
          : undefined,
      ...ownerScope(request.user!)
    });

    response.json(validateDeviceRecordList(records));
  } catch (error) {
    next(error);
  }
});

devicesRouter.post("/", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may register sensors." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const device = validateDeviceInput(request.body);
    const created = await store.createDevice({ device, authorId: request.user?.id });
    response.status(201).json(validateDeviceRecord(created));
  } catch (error) {
    if (error instanceof Error && error.message === "Device ID already exists.") {
      response.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

devicesRouter.delete("/:id", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensors." });
      return;
    }

    const deleted = await store.deleteDevice(request.params.id, ownerScope(request.user!));
    if (!deleted) {
      response.status(404).json({ message: "Device record not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
