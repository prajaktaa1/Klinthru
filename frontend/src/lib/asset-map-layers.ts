import { savedMapCoordinate } from "./dashboard-map-data";
import type { AssetMasterAssetRecord } from "./types";
export const ASSET_MAP_LAYERS = [
  { key: "stations", label: "Stations", type: "STATION" },
  { key: "valves", label: "Valves", type: "VALVE" },
  { key: "rectifiers", label: "Rectifiers", type: "RECTIFIER" },
  { key: "testPosts", label: "Test Posts", type: "TEST_POST" },
  { key: "compressors", label: "Compressors", type: "COMPRESSOR" },
  { key: "sensors", label: "Sensors", type: "SENSOR" },
  { key: "other", label: "Other Assets", type: "OTHER" }
] as const;
export type AssetMapLayer = typeof ASSET_MAP_LAYERS[number]["key"];
export const DEFAULT_ASSET_LAYERS: Record<AssetMapLayer, boolean> = { stations: true, valves: true, rectifiers: true, testPosts: true, compressors: true, sensors: true, other: true };
export function assetMapLayer(asset: Pick<AssetMasterAssetRecord, "assetType">): AssetMapLayer {
  return ASSET_MAP_LAYERS.find(layer => layer.type === asset.assetType)?.key ?? "other";
}
export function assetMapColor(asset: Pick<AssetMasterAssetRecord, "assetType">) {
  return asset.assetType === "STATION" ? "#2563eb" : asset.assetType === "VALVE" ? "#16a34a" : asset.assetType === "RECTIFIER" ? "#f59e0b" : asset.assetType === "TEST_POST" ? "#7c3aed" : asset.assetType === "COMPRESSOR" ? "#dc2626" : asset.assetType === "SENSOR" ? "#06b6d4" : "#64748b";
}
export function assetMapLabel(asset: Pick<AssetMasterAssetRecord, "assetId" | "kp">) {
  return `${asset.assetId}${asset.kp ? ` · KP ${asset.kp}` : ""}`;
}
export function assetLayerCounts(assets: AssetMasterAssetRecord[], pipelineId: string) {
  const scoped = [...new Map(assets.filter(a => a.pipelineId === pipelineId).map(a => [a.id, a])).values()];
  return ASSET_MAP_LAYERS.map(layer => {
    const records = scoped.filter(a => assetMapLayer(a) === layer.key);
    const located = records.filter(a => savedMapCoordinate(a.latitude, a.longitude)).length;
    return { ...layer, saved: records.length, located, missing: records.length - located, records };
  });
}
