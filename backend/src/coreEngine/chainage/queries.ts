import { ChainageAgent, ChainageError, LocatedFeature, chainageToMeters } from "./ChainageAgent";

/** Deterministic supported engineering queries; ambiguous or unsupported text is rejected. */
export function answerChainageQuery(agent: ChainageAgent, features: LocatedFeature[], query: string) {
  features = agent.sortAssets(features);
  const text = query.trim();
  const chainages = [...text.matchAll(/(?:CH\.?\s*)?\d+\s*\+\s*\d+(?:\.\d+)?/gi)].map(m => chainageToMeters(m[0]));
  const mentioned = features.filter(f => [f.id, f.name].some(name => name && new RegExp(`(?:^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z0-9])`, "i").test(text)));
  const meters = chainages[0] ?? mentioned[0]?.meters;
  const type = /valve|isolation/i.test(text) ? "VALVE" : /station/i.test(text) ? "STATION" : undefined;
  const candidates = type ? features.filter(f => f.assetType === type) : features;
  if (/distance between|how far.+from/i.test(text) && (chainages.length >= 2 || mentioned.length >= 2)) {
    const a = chainages[0] ?? mentioned[0].meters, b = chainages[1] ?? mentioned[1].meters;
    return { distance_m: Math.abs(b - a), distance_km: Math.abs(b - a) / 1000, signed_distance_m: b - a };
  }
  if (/between/i.test(text) && chainages.length === 2) return agent.getAssetsBetween(candidates, chainages[0], chainages[1]);
  if (meters === undefined) throw new ChainageError("Specify a chainage (KM+METRES) or a saved asset ID on the selected pipeline.");
  const radius = text.match(/within\s+(\d+(?:\.\d+)?)\s*(km|m|metres?|meters?)/i);
  if (radius) return agent.getAssetsWithinRadius(candidates, meters, Number(radius[1]) * (radius[2].toLowerCase() === "km" ? 1000 : 1));
  if (/isolation.+upstream.+downstream|upstream.+downstream.+isolation/i.test(text)) throw new ChainageError("Confirmed isolation-valve classification is required; generic valves cannot be assumed to be isolation valves.");
  if (/downstream/i.test(text)) return agent.getNearestDownstreamAsset(candidates, meters);
  if (/upstream/i.test(text)) return agent.getNearestUpstreamAsset(candidates, meters);
  if (/after|next/i.test(text)) return agent.getNextAsset(candidates, meters);
  if (/before|previous/i.test(text)) return agent.getPreviousAsset(candidates, meters);
  if (/nearest|closest/i.test(text)) return agent.getNearestAsset(candidates, meters);
  if (/starting point|origin|from.+start/i.test(text)) return { distance_m: meters - (agent.context.originMeters ?? 0) };
  throw new ChainageError("Unsupported query. Use distance between, nearest, before/after, between chainages, or within a radius.");
}
