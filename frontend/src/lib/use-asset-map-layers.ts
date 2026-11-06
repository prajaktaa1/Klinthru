"use client";
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_ASSET_LAYERS, type AssetMapLayer } from "./asset-map-layers";
const states = new Map<string, Record<AssetMapLayer, boolean>>();
const event = "klinthru-asset-layer-filter-changed";
const subscribe = (listener: () => void) => { window.addEventListener(event, listener); return () => window.removeEventListener(event, listener); };
// Pipeline-scoped UI preferences only. Never updates saved asset or GPS data.
export function useAssetMapLayers(pipelineId: string | undefined) {
  const snapshot = useCallback(() => pipelineId ? states.get(pipelineId) ?? DEFAULT_ASSET_LAYERS : DEFAULT_ASSET_LAYERS, [pipelineId]);
  const layers = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_ASSET_LAYERS);
  const setLayers = useCallback((update: (current: Record<AssetMapLayer, boolean>) => Record<AssetMapLayer, boolean>) => {
    if (!pipelineId) return;
    states.set(pipelineId, update(states.get(pipelineId) ?? DEFAULT_ASSET_LAYERS));
    window.dispatchEvent(new Event(event));
  }, [pipelineId]);
  return [layers, setLayers] as const;
}
