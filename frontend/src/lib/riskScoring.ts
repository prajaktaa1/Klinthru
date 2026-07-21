import { RiskLevel } from "@/lib/types";

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

export function getRiskBadgeClasses(level: RiskLevel): string {
  if (level === "High") {
    return "bg-red-100 text-red-700";
  }

  if (level === "Medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}
