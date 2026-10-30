/** Shared, deterministic pipeline linear referencing. No database or UI dependencies. */
export type ChainageInput = string | number;
export type Direction = "INCREASING_DOWNSTREAM" | "INCREASING_UPSTREAM";
export type Options = { defaultUnit?: "m" | "km"; allowNegative?: boolean; precision?: number };
export type PipelineContext = {
  pipelineId: string; originMeters?: number; lengthMeters?: number; direction?: Direction;
  toleranceMeters?: number; boundaryPolicy?: "reject" | "warn";
  parentPipelineId?: string; parentTieInMeters?: number;
};
export type LocatedFeature = { id: string; pipelineId: string; meters: number; endMeters?: number; assetType?: string; name?: string; segmentId?: string };
export type Position = [number, number]; // GeoJSON longitude, latitude
export type Alignment = { type: "LineString"; coordinates: Position[] };
export class ChainageError extends Error { constructor(message: string) { super(message); this.name = "ChainageError"; } }
function finite(value: number) { if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new ChainageError("Distance must be a finite, safely representable number."); return value; }
function decimalParts(value: number): [string, string] {
  const text = Math.abs(value).toString();
  if (!text.includes("e")) { const [whole, fraction = ""] = text.split("."); return [whole, fraction]; }
  const [mantissa, exponent] = text.split("e"), [whole, fraction = ""] = mantissa.split(".");
  const digits = whole + fraction, point = whole.length + Number(exponent);
  if (point <= 0) return ["0", "0".repeat(-point) + digits];
  if (point >= digits.length) return [digits + "0".repeat(point - digits.length), ""];
  return [digits.slice(0, point), digits.slice(point)];
}
export function metersToChainage(value: number, options: Options = {}): string {
  finite(value);
  if (value < 0 && !options.allowNegative) throw new ChainageError("Negative chainage is disabled.");
  if (options.precision !== undefined) {
    if (!Number.isInteger(options.precision) || options.precision < 0 || options.precision > 9) throw new ChainageError("Precision must be 0–9 decimal places.");
    value = Number(value.toFixed(options.precision));
  }
  // Split the decimal string, avoiding remainder cancellation (18900.65 % 1000).
  const [whole, fraction] = decimalParts(value);
  const integer = Number(whole);
  return `${value < 0 ? "-" : ""}${Math.floor(integer / 1000)}+${String(integer % 1000).padStart(3, "0")}${fraction ? `.${fraction}` : ""}`;
}
/** Shift the decimal point rather than multiplying a binary floating value. */
export function kmToMeters(value: string | number): number {
  const text = String(value).replace(/,/g, "");
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return finite(Number(value) * 1000);
  const negative = text.startsWith("-"), [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  const digits = fraction.padEnd(3, "0");
  return finite(Number(`${negative ? "-" : ""}${whole || "0"}${digits.slice(0, 3)}.${digits.slice(3) || "0"}`));
}
export function metersToKm(value: number): number {
  finite(value);
  const [whole, fraction = ""] = decimalParts(value);
  const padded = whole.padStart(4, "0");
  return Number(`${value < 0 ? "-" : ""}${padded.slice(0, -3)}.${padded.slice(-3)}${fraction}`);
}
export function parseChainage(input: ChainageInput, options: Options = {}) {
  let meters: number;
  if (typeof input === "number") meters = (options.defaultUnit === "km" ? kmToMeters(input) : finite(input));
  else {
    const prefixedKm = /^(?:km|kp)\s+/i.test(input.trim());
    const text = input.trim().replace(/^(?:chainage|ch\.?|stationing|station|kilometre point|kilometer point|km point|kp|km)\s*/i, "");
    const chain = text.match(/^(-?)(\d+)\s*\+\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?$/i);
    const numeric = text.match(/^(-?(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+))\s*(km|kilometres?|kilometers?|m|metres?|meters?)?$/i);
    if (chain) meters = (Number(chain[2]) * 1000 + Number(chain[3])) * (chain[1] ? -1 : 1);
    else if (numeric) meters = (numeric[2] ? /^k/i.test(numeric[2]) : (prefixedKm || options.defaultUnit === "km")) ? kmToMeters(numeric[1]) : Number(numeric[1].replace(/,/g, ""));
    else throw new ChainageError("Invalid chainage format. Expected KM+METRES, for example 18+900, or an explicit m/km unit.");
  }
  finite(meters);
  if (meters < 0 && !options.allowNegative) throw new ChainageError("Negative chainage is disabled.");
  if (options.precision !== undefined) { metersToChainage(meters, options); meters = Number(meters.toFixed(options.precision)); }
  return { chainage: metersToChainage(meters, options), meters, kilometers: metersToKm(meters), valid: true as const };
}
export const chainageToMeters = (input: ChainageInput, options?: Options) => parseChainage(input, options).meters;
export const chainageToKm = (input: ChainageInput, options?: Options) => parseChainage(input, options).kilometers;
export const normalizeChainage = (input: ChainageInput, options?: Options) => parseChainage(input, options).chainage;
export function validateChainage(input: ChainageInput, options?: Options) { try { return parseChainage(input, options); } catch (error) { return { valid: false as const, error: (error as Error).message }; } }
/** Existing KLINTHRU KP columns are kilometres, including bare numeric strings. */
export function parseKp(input: ChainageInput) { return parseChainage(input, { defaultUnit: "km" }); }
export function tryKp(input: unknown): number | null { if (input === null || input === undefined || input === "") return null; try { return parseKp(input as ChainageInput).kilometers; } catch { return null; } }
export function chainageSummary(input: unknown) { if (input === null || input === undefined || input === "") return null; try { const value = parseKp(input as ChainageInput); return { chainage: value.chainage, chainage_meters: value.meters, chainage_km: value.kilometers }; } catch { return null; } }
export function validateAgainstPipelineLength(meters: number, context: PipelineContext) {
  finite(meters); const origin = finite(context.originMeters ?? 0);
  if (context.lengthMeters !== undefined && finite(context.lengthMeters) < 0) throw new ChainageError("Pipeline length must not be negative.");
  const end = context.lengthMeters === undefined ? undefined : origin + context.lengthMeters;
  const message = meters < origin ? `Chainage precedes pipeline origin ${metersToChainage(origin, { allowNegative: true })}.` : end !== undefined && meters > end ? `Entered chainage ${metersToChainage(meters, { allowNegative: true })} exceeds pipeline end ${metersToChainage(end, { allowNegative: true })}.` : null;
  if (message && context.boundaryPolicy !== "warn") throw new ChainageError(message);
  return { valid: !message, warning: message };
}
export function calculateSignedDistance(a: ChainageInput, b: ChainageInput) { return finite(chainageToMeters(b) - chainageToMeters(a)); }
export function calculateDistance(a: ChainageInput, b: ChainageInput) { return Math.abs(calculateSignedDistance(a, b)); }
export function calculateRangeLength(start: ChainageInput, end: ChainageInput) { const length = calculateSignedDistance(start, end); if (length < 0) throw new ChainageError("Range end must not precede start."); return length; }
export function getDistanceFromOrigin(meters: number, context: PipelineContext) { validateAgainstPipelineLength(meters, context); return meters - (context.originMeters ?? 0); }
export function getRemainingPipelineDistance(meters: number, context: PipelineContext) { if (context.lengthMeters === undefined) throw new ChainageError("Pipeline length is required."); return context.lengthMeters - getDistanceFromOrigin(meters, context); }
export function getPipelineProgressPercentage(meters: number, context: PipelineContext) { if (!context.lengthMeters) throw new ChainageError("A positive pipeline length is required."); return getDistanceFromOrigin(meters, context) / context.lengthMeters * 100; }
export class ChainageAgent {
  constructor(readonly context: PipelineContext) { if (!context.pipelineId) throw new ChainageError("Pipeline ID is required."); }
  private scoped<T extends LocatedFeature>(features: T[]) { return features.filter(f => f.pipelineId === this.context.pipelineId).map(f => { finite(f.meters); if (f.endMeters !== undefined && finite(f.endMeters) < f.meters) throw new ChainageError("Feature range end precedes start."); return f; }); }
  sortAssets<T extends LocatedFeature>(features: T[]) { return this.scoped(features).sort((a, b) => a.meters - b.meters || a.id.localeCompare(b.id)); }
  distance(a: LocatedFeature, b: LocatedFeature) { if (a.pipelineId !== this.context.pipelineId || b.pipelineId !== this.context.pipelineId) throw new ChainageError("Cannot compare locations from different pipelines."); return Math.abs(finite(b.meters) - finite(a.meters)); }
  relationship(reference: number, target: number) { if (!this.context.direction) throw new ChainageError("Pipeline flow/chainage direction is not configured."); const delta = finite(target) - finite(reference); return delta === 0 ? "AT_LOCATION" : (delta > 0) === (this.context.direction === "INCREASING_DOWNSTREAM") ? "DOWNSTREAM" : "UPSTREAM"; }
  getAssetsBetween<T extends LocatedFeature>(features: T[], start: number, end: number) { finite(start); finite(end); if (end < start) throw new ChainageError("Range end precedes start."); return this.sortAssets(features).filter(f => f.meters <= end && (f.endMeters ?? f.meters) >= start); }
  getAssetsWithinRadius<T extends LocatedFeature>(features: T[], meters: number, radius = this.context.toleranceMeters ?? 5) { finite(radius); if (radius < 0) throw new ChainageError("Radius must not be negative."); return this.getAssetsBetween(features, meters - radius, meters + radius); }
  getNearestAsset<T extends LocatedFeature>(features: T[], meters: number) {
    finite(meters); const distances = this.scoped(features).map(asset => ({ asset, distance_m: Math.max(asset.meters - meters, meters - (asset.endMeters ?? asset.meters), 0) }));
    const min = Math.min(...distances.map(f => f.distance_m)); return distances.filter(f => Math.abs(f.distance_m - min) < 1e-9).sort((a, b) => a.asset.meters - b.asset.meters);
  }
  getNextAsset<T extends LocatedFeature>(features: T[], meters: number) { finite(meters); const sorted = this.sortAssets(features).filter(f => f.meters > meters); return sorted.filter(f => f.meters === sorted[0]?.meters); }
  getPreviousAsset<T extends LocatedFeature>(features: T[], meters: number) { finite(meters); const sorted = this.sortAssets(features).filter(f => f.meters < meters); return sorted.filter(f => f.meters === sorted[sorted.length - 1]?.meters); }
  getNearestUpstreamAsset<T extends LocatedFeature>(features: T[], meters: number) { if (!this.context.direction) throw new ChainageError("Pipeline flow/chainage direction is not configured."); return this.getNearestAsset(this.scoped(features).filter(f => this.relationship(meters, f.meters) === "UPSTREAM"), meters); }
  getNearestDownstreamAsset<T extends LocatedFeature>(features: T[], meters: number) { if (!this.context.direction) throw new ChainageError("Pipeline flow/chainage direction is not configured."); return this.getNearestAsset(this.scoped(features).filter(f => this.relationship(meters, f.meters) === "DOWNSTREAM"), meters); }
  getUpstreamAsset = this.getNearestUpstreamAsset;
  getDownstreamAsset = this.getNearestDownstreamAsset;
  successiveSpacings<T extends LocatedFeature>(features: T[]) { const sorted = this.sortAssets(features); return { spacings: sorted.slice(1).map((asset, index) => ({ from: sorted[index].id, to: asset.id, distance_m: asset.meters - sorted[index].meters })), total_m: sorted.length ? sorted[sorted.length - 1].meters - sorted[0].meters : 0 }; }
  isolation<T extends LocatedFeature>(valves: T[], meters: number) { const upstream = this.getNearestUpstreamAsset(valves, meters), downstream = this.getNearestDownstreamAsset(valves, meters); return { upstream, downstream, section_length_m: upstream.length && downstream.length ? this.distance(upstream[0].asset, downstream[0].asset) : null }; }
  describe(asset: LocatedFeature) { this.distance(asset, asset); return `${asset.name ?? asset.id} is located at CH ${metersToChainage(asset.meters)} on pipeline ${this.context.pipelineId}, ${(getDistanceFromOrigin(asset.meters, this.context) / 1000)} km from the chainage origin.`; }
  kilometreSection(meters: number) { finite(meters); const start = Math.floor(meters / 1000); return { start_km: start, end_km: start + 1 }; }
}
const radians = (degrees: number) => degrees * Math.PI / 180;
function validPosition(p: Position) { if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new ChainageError("Invalid saved GPS coordinate."); }
export function geodesicDistance(a: Position, b: Position) {
  validPosition(a); validPosition(b);
  const dLat = radians(b[1] - a[1]), dLng = radians(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
function routeMeasures(route: Alignment) {
  if (!route || route.type !== "LineString" || route.coordinates.length < 2) throw new ChainageError("A saved pipeline alignment with at least two coordinates is required.");
  route.coordinates.forEach(validPosition); const cumulative = [0];
  for (let i = 1; i < route.coordinates.length; i++) cumulative.push(cumulative[i - 1] + geodesicDistance(route.coordinates[i - 1], route.coordinates[i]));
  if (!cumulative[cumulative.length - 1]) throw new ChainageError("Saved alignment has zero length."); return cumulative;
}
export function alignmentLength(route: Alignment) { const m = routeMeasures(route); return m[m.length - 1]; }
/** Uncalibrated routes are never stretched to match an official pipeline length. */
export function alignmentReadiness(route: Alignment | null | undefined, lengthMeters?: number) {
  if (!route) return { ready: false, reason: "No saved pipeline alignment.", length_m: null };
  try { const length = alignmentLength(route); const mismatch = lengthMeters !== undefined && Math.abs(length - lengthMeters) > Math.max(5, lengthMeters * 0.01); return { ready: !mismatch, reason: mismatch ? "Saved alignment length differs from configured pipeline length; verified GIS chainage calibration is required." : null, length_m: length }; }
  catch (e) { return { ready: false, reason: (e as Error).message, length_m: null }; }
}
export function coordinateAtChainage(route: Alignment, meters: number, originMeters = 0): Position {
  const measures = routeMeasures(route), offset = finite(meters) - finite(originMeters);
  if (offset < 0 || offset > measures[measures.length - 1]) throw new ChainageError("Chainage lies outside the saved alignment.");
  const i = Math.max(1, measures.findIndex(m => m >= offset));
  const a = route.coordinates[i - 1], b = route.coordinates[i], span = measures[i] - measures[i - 1];
  if (!span) return [...a];
  // Spherical interpolation on the same geodesic used for cumulative route length.
  const angle = span / 6371008.8, t = (offset - measures[i - 1]) / span;
  const vector = (p: Position) => [Math.cos(radians(p[1])) * Math.cos(radians(p[0])), Math.cos(radians(p[1])) * Math.sin(radians(p[0])), Math.sin(radians(p[1]))];
  const x = vector(a), y = vector(b), weights = [Math.sin((1 - t) * angle) / Math.sin(angle), Math.sin(t * angle) / Math.sin(angle)];
  const v = x.map((value, axis) => value * weights[0] + y[axis] * weights[1]);
  return [Math.atan2(v[1], v[0]) * 180 / Math.PI, Math.atan2(v[2], Math.hypot(v[0], v[1])) * 180 / Math.PI];
}
export function projectToAlignment(route: Alignment, point: Position, originMeters = 0) {
  validPosition(point); const measures = routeMeasures(route);
  let best = { meters: originMeters, offset_m: Infinity, coordinate: route.coordinates[0] };
  // Minimize geodesic distance on every saved leg, retaining cumulative distance through bends.
  for (let i = 1; i < measures.length; i++) {
    if (measures[i] === measures[i - 1]) continue;
    let lo = measures[i - 1], hi = measures[i];
    for (let n = 0; n < 45; n++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (geodesicDistance(coordinateAtChainage(route, a), point) < geodesicDistance(coordinateAtChainage(route, b), point)) hi = b; else lo = a; }
    for (const m of [measures[i - 1], (lo + hi) / 2, measures[i]]) { const coordinate = coordinateAtChainage(route, m), offset = geodesicDistance(coordinate, point); if (offset < best.offset_m) best = { meters: originMeters + m, offset_m: offset, coordinate }; }
  }
  return { ...best, chainage: metersToChainage(best.meters, { allowNegative: originMeters < 0 }), approximate: true };
}
