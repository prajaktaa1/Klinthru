import {validateDeviceUnitUpdate} from "../validation/deviceUnitValidation";
import {prepareSavedSensorRegistration,savedSensorClassification,canonicalSensorDeviceType,realSensorAssetBlockers,savedSensorRegistration,validateSavedSensorMatch} from "../validation/sensorAssetRegistration";
import {createValidationError} from "../validation/validationErrors";
import { Router } from "express";

import { store } from "../data/store";
import { canModifySensors, ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { validateDeviceRegistrationInput, validateDeviceLocationUpdate, validateDeviceRecord, validateDeviceRecordList } from "../validation/deviceValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get("/registration-options",async(request,response,next)=>{
 try{
  const scope=ownerScope(request.user!),pipelineId=typeof request.query.pipelineId==="string"?request.query.pipelineId:"";
  const pipeline=(await store.listPipelines(scope)).find(row=>row.id===pipelineId);
  if(!pipeline)throw createValidationError({pipelineId:"Active accessible pipeline required."});
  const [assets,segments,devices]=await Promise.all([store.listAssets({pipelineId,...scope}),store.listSegments({pipelineId,...scope}),store.listDevices(scope)]);
  response.json(assets.filter(asset=>asset.assetType==="SENSOR").map(asset=>{
   const segment=segments.find(row=>row.id===asset.segmentId&&row.pipelineId===pipelineId),deviceType=canonicalSensorDeviceType(asset.equipmentType);
   const classification=savedSensorClassification(asset);
   const realBlockers=realSensorAssetBlockers(asset),blockers:string[]=[];
   if(classification==="REVIEW")blockers.push("Saved identity metadata is incomplete or quarantined; classification review is required.");
   if(!segment||!asset.kp?.trim()||!Number.isFinite(Number(asset.kp)))blockers.push("Saved segment or KP is missing.");
   if(!deviceType)blockers.push("Equipment type has no approved canonical mapping.");
   const existingDevice=devices.find(device=>device.deviceId.toLowerCase()===asset.assetId.toLowerCase());
   if(existingDevice)blockers.push("A registry device with this code already exists.");
   return {assetRecordId:asset.id,assetCode:asset.assetId,pipelineId,segmentRecordId:segment?.id??null,segmentCode:segment?.segmentId??null,equipmentType:asset.equipmentType??null,deviceType,kp:asset.kp??null,location:segment?`${pipeline.pipelineCode} / ${segment.segmentId} / KP ${asset.kp??""}`:null,latitude:asset.latitude??null,longitude:asset.longitude??null,manufacturer:asset.manufacturer??null,model:asset.model??null,serialNumber:asset.serialNumber??null,unit:null,existingDevice:existingDevice?validateDeviceRecord(existingDevice):null,registrationClassification:classification,registrationBlockers:classification==="DEMO"?blockers:[...realBlockers,...blockers],blockers:[...realBlockers,...blockers],demoBlockers:blockers};
  }));
 }catch(error){next(error);}
});

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
        const asset = assets.find((item) => item.assetType === "SENSOR" && item.assetId === device.deviceId && item.segmentId === segment?.id && String(item.kp ?? "") === String(kp ?? ""));
        if (!segment || !asset || savedSensorClassification(asset)!=="REAL" || realSensorAssetBlockers(asset).length || canonicalSensorDeviceType(asset.equipmentType)!==device.deviceType) continue;
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
    const {assetRecordId,pipelineId,segmentRecordId,identityConfirmed,demoConfirmed,isDemoData:clientMode,...device}=validateDeviceRegistrationInput(request.body);
    if(device.deviceId==="SNS-DEMO-001")throw createValidationError({deviceId:"SNS-DEMO-001 is quarantined pending classification."});
    let isDemoData=false;
    if(assetRecordId&&pipelineId&&segmentRecordId){const prepared=await prepareSavedSensorRegistration({assetRecordId,pipelineId,segmentRecordId,identityConfirmed,...device},request.user!);device.pipelineOrLocation=prepared.pipelineOrLocation;isDemoData=prepared.isDemoData;}
    else throw createValidationError({assetRecordId:"Select a saved Sensor Asset so classification and identity can be validated securely."});
    const existing=await store.listDevices(ownerScope(request.user!));
    if(existing.some(row=>row.deviceId.toLowerCase()===device.deviceId.toLowerCase())){response.status(409).json({message:"Device ID already exists."});return;}
    const created = await store.createDevice({ device, isDemoData, authorId: request.user?.id });
    response.status(201).json(validateDeviceRecord(created));
  } catch (error) {
    if (error instanceof Error && error.message === "Device ID already exists.") {
      response.status(409).json({ message: error.message });
      return;
    }
    next(error);
  }
});

// Unit-only endpoint: identity, location, inventory and classification are immutable here.
devicesRouter.patch("/:id/details",async(request,response,next)=>{
 try{
  if(!canModifySensors(request.user!)){response.status(403).json({message:"Only Admin and Engineer roles may edit sensor details."});return;}
  assertNoDangerousKeys(request.body);
  const scope=ownerScope(request.user!),device=await store.findDeviceById(request.params.id,scope);
  if(!device){response.status(404).json({message:"Device record not found."});return;}
  const {unit}=validateDeviceUnitUpdate(request.body,device.deviceType);
  const updated=await store.updateDeviceUnit(device.id,unit,scope);
  if(!updated){response.status(404).json({message:"Device record not found."});return;}
  response.json(validateDeviceRecord(updated));
 }catch(error){next(error);}
});

devicesRouter.patch("/:id", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensors." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const update = validateDeviceLocationUpdate(request.body);
    const scope = ownerScope(request.user!);
    const device = await store.findDeviceById(request.params.id, scope);
    if (!device) {
      response.status(404).json({ message: "Device record not found." });
      return;
    }

    const match = /^([^/]+)\s*\/\s*([^/]+)\s*\/\s*KP\s+([0-9]+(?:\.[0-9]+)?)\s*$/i.exec(update.pipelineOrLocation);
    if (!match) {
      response.status(400).json({ message: "pipelineOrLocation must use 'Pipeline / Segment / KP number'." });
      return;
    }
    const [, pipelineCodeRaw, segmentCodeRaw, kpRaw] = match;
    const pipelineCode = pipelineCodeRaw.trim();
    const segmentCode = segmentCodeRaw.trim();
    const pipelines = await store.listPipelines(scope);
    const pipeline = pipelines.find((item) => item.pipelineCode.toLowerCase() === pipelineCode.toLowerCase());
    if (!pipeline) {
      response.status(400).json({ message: "The requested pipeline is not a saved pipeline record." });
      return;
    }
    const [segments, assets] = await Promise.all([
      store.listSegments({ pipelineId: pipeline.id, ...scope }),
      store.listAssets({ pipelineId: pipeline.id, ...scope })
    ]);
    const segment = segments.find((item) => item.segmentId.toLowerCase() === segmentCode.toLowerCase());
    const requestedKp = Number(kpRaw);
    const asset = assets.find((item) =>
      item.assetType === "SENSOR" &&
      item.assetId === device.deviceId &&
      item.segmentId === segment?.id &&
      Boolean(item.kp?.trim()) && Number(item.kp) === requestedKp &&
      canonicalSensorDeviceType(item.equipmentType) === device.deviceType
    );
    if (!segment || !asset) {
      response.status(400).json({ message: "The requested location does not match the saved Asset Master sensor record." });
      return;
    }

    validateSavedSensorMatch(asset,device.deviceType);
    const updated = await store.updateDeviceLocation(device.id, update, scope);
    if (!updated) {
      response.status(404).json({ message: "Device record not found." });
      return;
    }
    response.json(validateDeviceRecord(updated));
  } catch (error) {
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
