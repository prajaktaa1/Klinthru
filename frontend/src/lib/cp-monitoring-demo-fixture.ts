export type CpTestPoint = { id: string; location: string; onPotential: number; offPotential: number; current: number; status: "Protected" | "Marginal" | "Critical"; trend: number[] };
export const cpCriterionMv = -850;
export const cpTestPoints: CpTestPoint[] = [
  { id: "TP-01", location: "KP 0.0 · North terminal", onPotential: -1088, offPotential: -972, current: 4.3, status: "Protected", trend: [-950,-956,-961,-958,-966,-970,-968,-972] },
  { id: "TP-02", location: "KP 14.8 · River crossing", onPotential: -1042, offPotential: -934, current: 4.0, status: "Protected", trend: [-918,-922,-925,-930,-928,-932,-935,-934] },
  { id: "TP-03", location: "KP 29.5 · Valve station 2", onPotential: -1015, offPotential: -906, current: 3.8, status: "Protected", trend: [-892,-896,-901,-899,-904,-908,-903,-906] },
  { id: "TP-04", location: "KP 43.1 · Highway crossing", onPotential: -984, offPotential: -878, current: 3.5, status: "Protected", trend: [-865,-870,-868,-874,-872,-876,-881,-878] },
  { id: "TP-05", location: "KP 57.6 · Railway crossing", onPotential: -792, offPotential: -742, current: 2.1, status: "Critical", trend: [-812,-804,-796,-785,-778,-765,-751,-742] },
  { id: "TP-06", location: "KP 71.3 · Industrial corridor", onPotential: -881, offPotential: -832, current: 2.8, status: "Marginal", trend: [-862,-858,-851,-848,-843,-839,-835,-832] },
  { id: "TP-07", location: "KP 90.8 · South terminal", onPotential: -1027, offPotential: -918, current: 4.2, status: "Protected", trend: [-902,-906,-910,-913,-911,-916,-920,-918] }
];
export const rectifiers = [
  { id: "R-01", location: "North terminal", voltage: 15.2, current: 8.5, status: "Normal" },
  { id: "R-02", location: "Valve station 2", voltage: 18.7, current: 12.4, status: "Output High" },
  { id: "R-03", location: "South terminal", voltage: 14.1, current: 9.8, status: "Normal" }
] as const;
export const interferenceSources = [
  { name: "Railway", level: "HIGH", detail: "TP-05 · fluctuating DC signature", score: 88 },
  { name: "Adjacent Pipeline", level: "MED", detail: "TP-06 · possible bond interaction", score: 58 },
  { name: "Industrial AC", level: "LOW", detail: "Stable induced AC exposure", score: 26 },
  { name: "HV Power Line", level: "LOW", detail: "Within screening threshold", score: 18 }
] as const;
export const trendLabels = ["Day 1","Day 5","Day 9","Day 13","Day 17","Day 21","Day 25","Day 30"];
