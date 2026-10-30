import { createHash } from "node:crypto";
import { AiContractError, type Json } from "./contracts";

/** Versioned finite JSON only: no dates/prototypes/undefined/coercion or locale ordering. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  function encode(item: unknown): string {
    if (item === null || typeof item === "string" || typeof item === "boolean") return JSON.stringify(item);
    if (typeof item === "number" && Number.isFinite(item)) return JSON.stringify(item);
    if (typeof item !== "object" || !item || ancestors.has(item)) throw new AiContractError("invalid_manifest", 422, "Manifest must be finite acyclic JSON.");
    ancestors.add(item);
    let result: string;
    if (Array.isArray(item)) {
      if (Object.keys(item).length !== item.length) throw new AiContractError("invalid_manifest", 422, "Sparse or extended arrays are not manifests.");
      result = `[${item.map(encode).join(",")}]`;
    } else {
      if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new AiContractError("invalid_manifest", 422, "Manifest objects must be plain JSON.");
      result = `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${encode((item as Record<string, unknown>)[key])}`).join(",")}}`;
    }
    ancestors.delete(item); return result;
  }
  return encode(value);
}
export function manifestHash(value: unknown): string { return createHash("sha256").update("klinthru-ai-canonical-json-v1\n" + canonicalJson(value)).digest("hex"); }
export function immutableJson<T extends Json>(value: T): Readonly<T> {
  const copy = JSON.parse(canonicalJson(value)) as T;
  function freeze(item: Json): void { if (item && typeof item === "object") { Object.values(item).forEach(freeze); Object.freeze(item); } }
  freeze(copy); return copy;
}
export function verifyHash(value: unknown, expected: string): void {
  if (!/^[a-f0-9]{64}$/.test(expected) || manifestHash(value) !== expected) throw new AiContractError("integrity_mismatch", 409, "Immutable content hash does not match.");
}
