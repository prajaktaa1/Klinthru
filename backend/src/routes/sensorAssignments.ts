import {validateSavedAssignmentIdentity} from "../validation/savedAssignmentIdentity";
import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { canModifySensors, ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { createValidationError, assertNoDangerousKeys } from "../validation/validationErrors";
import {
  validateSensorAssignmentInput,
  validateSensorAssignmentList,
  validateSensorAssignmentRecord,
  validateSensorAssignmentUpdate
} from "../validation/sensorAssignmentValidation";

export const sensorAssignmentsRouter = Router();

sensorAssignmentsRouter.use(requireAuth);

sensorAssignmentsRouter.get("/", async (request, response, next) => {
  try {
    const assignments = await store.listSensorAssignments({
      search: typeof request.query.search === "string" ? request.query.search : undefined,
      sensorCategory:
        typeof request.query.sensorCategory === "string"
          ? (request.query.sensorCategory as never)
          : undefined,
      sensorDeviceType:
        typeof request.query.sensorDeviceType === "string"
          ? request.query.sensorDeviceType
          : undefined,
      assignmentStatus:
        typeof request.query.assignmentStatus === "string"
          ? (request.query.assignmentStatus as never)
          : undefined,
      dataSource:
        typeof request.query.dataSource === "string"
          ? (request.query.dataSource as never)
          : undefined,
      pipelineOrAsset:
        typeof request.query.pipelineOrAsset === "string"
          ? request.query.pipelineOrAsset
          : undefined,
      ...ownerScope(request.user!)
    });

    response.json(validateSensorAssignmentList(assignments));
  } catch (error) {
    next(error);
  }
});

sensorAssignmentsRouter.get("/:id", async (request, response, next) => {
  try {
    const assignment = await store.findSensorAssignmentById(request.params.id, ownerScope(request.user!));
    if (!assignment) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    response.json(validateSensorAssignmentRecord(assignment));
  } catch (error) {
    next(error);
  }
});

sensorAssignmentsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor assignments." });
      return;
    }

    assertNoDangerousKeys(request.body);
    const assignment = validateSensorAssignmentInput(request.body);
    if((await store.listDevices(ownerScope(request.user!))).some(device=>device.deviceId===assignment.sensorId&&(device.isDemoData||device.deviceId==="SNS-DEMO-001")))throw createValidationError({sensorId:"DEMO and quarantined devices cannot receive REAL sensor assignments."});
    await validateSavedAssignmentIdentity(assignment,request.user!);
    const created = await store.saveSensorAssignment({
      assignment,
      authorId: request.user?.id
    });

    response.status(201).json(validateSensorAssignmentRecord(created));
  } catch (error) {
    handleAssignmentError(error, response, next);
  }
});

sensorAssignmentsRouter.put("/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor assignments." });
      return;
    }

    assertNoDangerousKeys(request.body);
    const existing = await store.findSensorAssignmentById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    const assignment = validateSensorAssignmentUpdate(request.body);
    if((await store.listDevices(ownerScope(request.user!))).some(device=>device.deviceId===(assignment.sensorId??existing.sensorId)&&(device.isDemoData||device.deviceId==="SNS-DEMO-001")))throw createValidationError({sensorId:"DEMO and quarantined devices cannot receive REAL sensor assignments."});
    const updated = await store.saveSensorAssignment({
      id: request.params.id,
      assignment,
      authorId: request.user?.id
    });

    response.json(validateSensorAssignmentRecord(updated));
  } catch (error) {
    handleAssignmentError(error, response, next);
  }
});

sensorAssignmentsRouter.patch("/:id/deactivate", async (request, response, next: NextFunction) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor assignments." });
      return;
    }

    const existing = await store.findSensorAssignmentById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    const updated = await store.deactivateSensorAssignment(request.params.id);
    if (!updated) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    response.json(validateSensorAssignmentRecord(updated));
  } catch (error) {
    next(error);
  }
});

sensorAssignmentsRouter.post("/:id/reassign", async (request, response, next: NextFunction) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor assignments." });
      return;
    }

    assertNoDangerousKeys(request.body);
    const existing = await store.findSensorAssignmentById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    const assignment = validateSensorAssignmentInput(request.body);
    const reassigned = await store.reassignSensorAssignment(
      request.params.id,
      assignment,
      request.user?.id
    );

    if (!reassigned) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    response.status(201).json(validateSensorAssignmentRecord(reassigned));
  } catch (error) {
    handleAssignmentError(error, response, next);
  }
});

sensorAssignmentsRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor assignments." });
      return;
    }

    const deleted = await store.deleteSensorAssignment(request.params.id, ownerScope(request.user!));
    if (!deleted) {
      response.status(404).json({ message: "Sensor assignment not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

function handleAssignmentError(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }, next: NextFunction) {
  if (error instanceof Error && error.message === "Sensor already has an active assignment.") {
    response.status(409).json({ message: error.message });
    return;
  }

  next(error);
}
