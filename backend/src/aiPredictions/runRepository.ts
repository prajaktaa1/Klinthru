import { AiContractError } from "./contracts";
import type { RunReservation, RunReservationStore } from "./idempotency";

type RequestRow = { id: string; payloadHash: string; fingerprint: string; run: { id: string } | null };
type Claim = Parameters<RunReservationStore["claim"]>[0];
type Transaction = {
  aiRunKey: { findUnique(args: unknown): Promise<{ payloadHash: string; request: RequestRow } | null>; create(args: unknown): Promise<unknown> };
  aiRunRequest: { findUnique(args: unknown): Promise<RequestRow | null>; create(args: unknown): Promise<RequestRow> };
};
export interface ReservationDatabase { $transaction<T>(fn: (tx: Transaction) => Promise<T>, options: { isolationLevel: "Serializable" }): Promise<T>; }

/** Not wired to runtime. Requires separately deployed schema/client and execution-policy approval. */
export function createAtomicRunReservationStore(database: ReservationDatabase, actorId: string): RunReservationStore {
  return { async claim(input: Claim): Promise<RunReservation> {
    if (input.ownerId !== actorId) throw new AiContractError("request_owner_mismatch", 403, "Run request owner must be the verified actor.");
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await database.$transaction(async tx => {
          const key = await tx.aiRunKey.findUnique({ where: { ownerId_requestKey: { ownerId: actorId, requestKey: input.requestKey } }, include: { request: { include: { run: { select: { id: true } } } } } });
          if (key && key.payloadHash !== input.payloadHash) throw new AiContractError("idempotency_conflict", 409, "Retry key is bound to another payload.");
          let request = key?.request ?? await tx.aiRunRequest.findUnique({ where: { ownerId_fingerprint: { ownerId: actorId, fingerprint: input.fingerprint } }, include: { run: { select: { id: true } } } });
          if (request && (request.payloadHash !== input.payloadHash || request.fingerprint !== input.fingerprint)) throw new AiContractError("idempotency_conflict", 409, "Existing run manifest differs.");
          if (!request) request = await tx.aiRunRequest.create({ data: { ...input, createdById: actorId }, include: { run: { select: { id: true } } } });
          if (!key) await tx.aiRunKey.create({ data: { ownerId: actorId, createdById: actorId, pipelineId: input.pipelineId, requestKey: input.requestKey, payloadHash: input.payloadHash, requestId: request.id } });
          return { requestId: request.id, runId: request.run?.id ?? null, payloadHash: request.payloadHash, fingerprint: request.fingerprint };
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (!["P2002", "P2034"].includes(code ?? "")) throw error;
      }
    }
    throw new AiContractError("reservation_retry_required", 503, "Concurrent reservation could not be completed; retry the same key.");
  } };
}
