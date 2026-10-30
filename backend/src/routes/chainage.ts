import { Router } from "express";
import { z } from "zod";
import { store, DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { ChainageAgent, ChainageError, alignmentReadiness, chainageSummary, coordinateAtChainage, getPipelineProgressPercentage, getRemainingPipelineDistance, kmToMeters, metersToChainage, parseChainage, parseKp, projectToAlignment, validateAgainstPipelineLength } from "../coreEngine/chainage/ChainageAgent";
import { answerChainageQuery } from "../coreEngine/chainage/queries";
import { createValidationErrorFromZod } from "../validation/validationErrors";

export const chainageRouter = Router();
chainageRouter.use(requireAuth);
const input = z.union([z.string().trim().min(1).max(120), z.number().finite()]);
const querySchema = z.object({
  operation: z.enum(["convert", "distance", "range", "radius", "nearest", "next", "previous", "upstream", "downstream", "progress", "coordinate", "project", "query", "spacings"]),
  chainage: input.optional(), target: input.optional(), radius_m: z.number().finite().nonnegative().optional(),
  assetId: z.string().max(120).optional(), targetAssetId: z.string().max(120).optional(),
  assetType: z.string().max(120).optional(), segmentId: z.string().max(120).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(), latitude: z.number().finite().min(-90).max(90).optional(),
  query: z.string().trim().min(1).max(1000).optional()
}).strict();

async function load(pipelineId: string, scope: ReturnType<typeof ownerScope>) {
  // Never substitute a development memory store for saved Neon data on this API.
  if (!getPrismaClient()) throw new DatabaseUnavailableError("Saved database data is required for the Chainage Agent.");
  const pipeline = await store.findPipelineById(pipelineId, scope);
  if (!pipeline) return null;
  const [assets, segments] = await Promise.all([store.listAssets({ pipelineId, ...scope }), store.listSegments({ pipelineId, ...scope })]);
  const agent = new ChainageAgent({ pipelineId, lengthMeters: pipeline.pipeLengthKm === undefined ? undefined : kmToMeters(pipeline.pipeLengthKm),
    originMeters: pipeline.chainageOriginMeters ?? undefined, direction: pipeline.chainageDirection ?? undefined,
    toleranceMeters: pipeline.chainageMatchToleranceMeters ?? undefined, boundaryPolicy: pipeline.chainageBoundaryPolicy === "WARN" ? "warn" : "reject",
    parentPipelineId: pipeline.parentPipelineId ?? undefined, parentTieInMeters: pipeline.parentTieInChainageMeters ?? undefined });
  const features = assets.flatMap(asset => { const location = chainageSummary(asset.kp); return location ? [{ ...asset, meters: location.chainage_meters, name: asset.assetId }] : []; });
  return { pipeline, assets, segments, agent, features, alignment: alignmentReadiness(pipeline.routeGeometry, agent.context.lengthMeters) };
}

chainageRouter.get("/:pipelineId", async (req, res, next) => {
  try {
    const data = await load(req.params.pipelineId, ownerScope(req.user!));
    if (!data) { res.status(404).json({ message: "Pipeline not found." }); return; }
    res.json({ pipeline_id: data.pipeline.id, pipeline_name: data.pipeline.pipelineName,
      origin: { chainage: metersToChainage(data.agent.context.originMeters ?? 0, { allowNegative: true }), physical_datum: data.pipeline.chainageOriginReference ?? data.pipeline.chainageOriginName ?? null,
        status: data.pipeline.chainageOriginReference || data.pipeline.chainageOriginName ? "Saved pipeline datum." : "Physical origin/datum is not recorded." },
      direction: data.pipeline.chainageDirection ?? null, alignment: data.alignment,
      assets: data.assets.map(asset => ({ ...asset, ...chainageSummary(asset.kp) })),
      segments: data.segments.map(segment => ({ ...segment, start: chainageSummary(segment.startKp), end: chainageSummary(segment.endKp), length_m: segment.startKp && segment.endKp ? parseKp(segment.endKp).meters - parseKp(segment.startKp).meters : null })),
      missing_configuration: [!data.pipeline.chainageOriginReference && !data.pipeline.chainageOriginName ? "physical origin/datum" : null,
        !data.pipeline.chainageDirection ? "chainage direction" : null,
        data.pipeline.chainagePrecision == null || data.pipeline.chainageMatchToleranceMeters == null ? "project precision/tolerance" : null].filter(Boolean) });
  } catch (error) { next(error); }
});

chainageRouter.post("/:pipelineId", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.body); if (!parsed.success) throw createValidationErrorFromZod(parsed.error);
    const body = parsed.data, data = await load(req.params.pipelineId, ownerScope(req.user!));
    if (!data) { res.status(404).json({ message: "Pipeline not found." }); return; }
    const { agent } = data;
    const parse = (value: string | number) => parseChainage(value, { allowNegative: data.pipeline.allowNegativeChainage === true });
    let features = data.features.filter(f => (!body.assetType || f.assetType === body.assetType) && (!body.segmentId || f.segmentId === body.segmentId));
    const find = (id: string) => { const asset = data.features.find(f => f.id === id || f.assetId === id); if (!asset) throw new ChainageError("Saved asset with valid chainage was not found on this pipeline."); return asset; };
    const resolve = () => { const m = body.assetId ? find(body.assetId).meters : body.chainage !== undefined ? parse(body.chainage).meters : undefined; if (m === undefined) throw new ChainageError("chainage or assetId is required."); validateAgainstPipelineLength(m, agent.context); return m; };
    let result: unknown;
    if (body.operation === "query") { if (!body.query) throw new ChainageError("query is required."); result = answerChainageQuery(agent, features, body.query); }
    else if (body.operation === "spacings") result = agent.successiveSpacings(features);
    else if (body.operation === "project") {
      if (!data.alignment.ready) throw new ChainageError(data.alignment.reason!);
      if (body.longitude === undefined || body.latitude === undefined) throw new ChainageError("latitude and longitude are required.");
      result = projectToAlignment(data.pipeline.routeGeometry!, [body.longitude, body.latitude], agent.context.originMeters);
    } else {
      const meters = resolve();
      switch (body.operation) {
        case "convert": result = parseChainage(meters, { allowNegative: data.pipeline.allowNegativeChainage === true, precision: data.pipeline.chainagePrecision ?? undefined }); break;
        case "distance": {
          const target = body.targetAssetId ? find(body.targetAssetId).meters : body.target !== undefined ? parse(body.target).meters : undefined;
          if (target === undefined) throw new ChainageError("target or targetAssetId is required."); validateAgainstPipelineLength(target, agent.context);
          result = { distance_m: Math.abs(target - meters), distance_km: Math.abs(target - meters) / 1000, signed_distance_m: target - meters }; break;
        }
        case "range": if (body.target === undefined) throw new ChainageError("target is required."); result = agent.getAssetsBetween(features, meters, parse(body.target).meters); break;
        case "radius": if (body.radius_m === undefined) throw new ChainageError("radius_m is required."); result = agent.getAssetsWithinRadius(features, meters, body.radius_m); break;
        case "nearest": result = agent.getNearestAsset(features, meters); break;
        case "next": result = agent.getNextAsset(features, meters); break;
        case "previous": result = agent.getPreviousAsset(features, meters); break;
        case "upstream": result = agent.getNearestUpstreamAsset(features, meters); break;
        case "downstream": result = agent.getNearestDownstreamAsset(features, meters); break;
        case "progress": result = { remaining_m: getRemainingPipelineDistance(meters, agent.context), progress_percent: getPipelineProgressPercentage(meters, agent.context) }; break;
        case "coordinate": if (!data.alignment.ready) throw new ChainageError(data.alignment.reason!); result = { coordinate: coordinateAtChainage(data.pipeline.routeGeometry!, meters, agent.context.originMeters), approximate: true }; break;
      }
    }
    res.json({ agent: "Chainage Agent", pipeline_id: data.pipeline.id, operation: body.operation, result });
  } catch (error) { if (error instanceof ChainageError) { res.status(422).json({ status: "BLOCKED", message: error.message }); return; } next(error); }
});
