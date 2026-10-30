import type { OfficialRiskRow } from "./risk-assessment-types";

export const matrixBases = ["inherent", "current", "residual"] as const;
export type MatrixBasis = typeof matrixBases[number];
export type MatrixCell = { likelihood: number; consequence: number; level: string; count: number };
export type MatrixDictionary = { level: number; label: string }[] | null;
export type RiskMatrixData = { status: "available" | "unavailable"; reason: string | null; item: null | {
  asOf: string; population: string; total: number; category: string | null; categories: string[];
  summary: { total: number; high: number; medium: number; low: number; overdueReviews: number } | null;
  methodology: { id: string; methodologyId: string; name: string; version: string; likelihoodRuleVersion: string; consequenceRuleVersion: string };
  matrix: { id: string; matrixId: string; name: string; version: string; likelihoodDictionary: MatrixDictionary; consequenceDictionary: MatrixDictionary };
  distributions: Record<MatrixBasis, MatrixCell[]>; rows: OfficialRiskRow[]; missing: string[];
} };
export type MatrixSelection = { basis: MatrixBasis; likelihood: number; consequence: number };
/** Both the details and table are projections of the same scoped, saved population. */
export function selectMatrixCell(item: RiskMatrixData["item"], selection: MatrixSelection | null) {
  if (!item || !selection) return null;
  const cell = item.distributions[selection.basis].find(value => value.likelihood === selection.likelihood && value.consequence === selection.consequence);
  if (!cell) return null;
  const rows = item.rows.filter(row => row[selection.basis].likelihood === selection.likelihood && row[selection.basis].consequence === selection.consequence);
  if (rows.length !== cell.count) return null;
  const categories = [...new Set(rows.map(row => row.category))].map(label => ({ label, count: rows.filter(row => row.category === label).length }));
  return { cell, rows, categories };
}
