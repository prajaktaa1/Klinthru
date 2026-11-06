/**
 * Display-only transcription of the client-supplied, explicitly unverified
 * PL-001 KML. This must never be used as saved pipeline geometry or for KP /
 * chainage calculations.
 */
export const PL001_ILLUSTRATIVE_ROUTE_LABEL = "Illustrative Route – NOT SURVEYED";
export const PL001_ILLUSTRATIVE_ROUTE_GIS_STATUS = "GIS Route Data Required";

export const pl001IllustrativeRoute = {
  type: "Feature" as const,
  properties: {
    pipelineCode: "PL-001",
    name: PL001_ILLUSTRATIVE_ROUTE_LABEL,
    source: "PL-001 - Ruwais to Habshan - Unverified Route (1).kml",
    displayOnly: true,
    gisValidation: PL001_ILLUSTRATIVE_ROUTE_GIS_STATUS,
    declaredPipelineLengthKm: 248
  },
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [52.74171784369314, 24.15371821692355],
      [52.76772167704292, 24.11077216059487],
      [52.82010381238476, 24.08440647084718],
      [53.04449884002201, 23.98981066330885],
      [53.18801554182639, 23.92753223988706],
      [53.35191183674272, 23.8523790193973],
      [53.47784991987709, 23.82759299985534]
    ] as [number, number][]
  }
};

export function pl001IllustrativeRoutePoints(pipelineCode?: string | null): [number, number][] | null {
  if (pipelineCode !== "PL-001") return null;
  return pl001IllustrativeRoute.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}

export function isPl001IllustrativeRoute(pipelineCode?: string | null) {
  return pipelineCode === "PL-001";
}

function kmValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/^kp\s*/i, "");
  const chainage = raw.match(/^(\d+)\+(\d{1,3})$/);
  if (chainage) return Number(chainage[1]) + Number(chainage[2]) / 1000;
  const parsed = Number(raw.replace(/\s*km$/i, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function distance(a: [number, number], b: [number, number]) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

function pointAt(points: [number, number][], fraction: number): [number, number] | null {
  if (!points.length || fraction < 0 || fraction > 1) return null;
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (!total) return points[0];
  let remaining = total * fraction;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const ratio = lengths[index] ? remaining / lengths[index] : 0;
      return [points[index][0] + (points[index + 1][0] - points[index][0]) * ratio, points[index][1] + (points[index + 1][1] - points[index][1]) * ratio];
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

/**
 * Display-only proportional placement on the illustrative line. It is not a
 * GIS interpolation and must never be written to an asset or pipeline record.
 */
export function pl001IllustrativePosition(pipelineCode: string | null | undefined, kp: unknown, masterLengthKm: unknown): [number, number] | null {
  const position = kmValue(kp);
  const length = typeof masterLengthKm === "number" ? masterLengthKm : Number(masterLengthKm);
  const points = pl001IllustrativeRoutePoints(pipelineCode);
  if (!points || position === null || !Number.isFinite(length) || length <= 0 || position > length) return null;
  return pointAt(points, position / length);
}

export function pl001IllustrativeSection(pipelineCode: string | null | undefined, startKp: unknown, endKp: unknown, masterLengthKm: unknown): [number, number][] | null {
  const start = kmValue(startKp), end = kmValue(endKp);
  const length = typeof masterLengthKm === "number" ? masterLengthKm : Number(masterLengthKm);
  const points = pl001IllustrativeRoutePoints(pipelineCode);
  if (!points || start === null || end === null || end <= start || !Number.isFinite(length) || length <= 0 || end > length) return null;
  const from = start / length, to = end / length;
  const result: [number, number][] = [pointAt(points, from)!];
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let accumulated = 0;
  for (let index = 1; index < points.length - 1; index++) {
    accumulated += lengths[index - 1];
    const fraction = accumulated / total;
    if (fraction > from && fraction < to) result.push(points[index]);
  }
  result.push(pointAt(points, to)!);
  return result;
}
