import { Router } from "express";

import { store } from "../data/store";
import { requireAuth } from "../middleware/auth";
import { validateDeviceRecordList } from "../validation/deviceValidation";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

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
          : undefined
    });

    response.json(validateDeviceRecordList(records));
  } catch (error) {
    next(error);
  }
});
