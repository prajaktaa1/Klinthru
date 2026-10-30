import { ChainageError, PipelineContext, parseKp, validateAgainstPipelineLength } from "./ChainageAgent";

/** Preflight every row before submitting any import writes. Existing KP units are km. */
export function normalizeChainageImport(records: unknown[], fields: string[], context: PipelineContext) {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const normalized = records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push({ row: index + 1, field: "record", message: "Expected a record object." }); return {} as Record<string, unknown>;
    }
    const row = { ...record } as Record<string, unknown>;
    if (row.pipelineId && row.pipelineId !== context.pipelineId) errors.push({ row: index + 1, field: "pipelineId", message: "Record belongs to a different pipeline." });
    for (const field of fields) {
      if (row[field] === null || row[field] === undefined || String(row[field]).trim() === "") continue;
      try { const value = parseKp(String(row[field])); validateAgainstPipelineLength(value.meters, context); row[field] = String(value.kilometers); }
      catch (error) { errors.push({ row: index + 1, field, message: (error as Error).message }); }
    }
    if (fields.includes("startKp") && fields.includes("endKp") && row.startKp && row.endKp) {
      try { if (parseKp(String(row.endKp)).meters <= parseKp(String(row.startKp)).meters) errors.push({ row: index + 1, field: "endKp", message: "End must be greater than start." }); } catch { /* Parsing errors are recorded above. */ }
    }
    return row;
  });
  if (errors.length) throw new ChainageError(`Chainage import rejected before saving: ${errors.map(e => `row ${e.row}, ${e.field}: ${e.message}`).join("; ")}`);
  return normalized;
}
