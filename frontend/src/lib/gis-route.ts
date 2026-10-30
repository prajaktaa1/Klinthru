import { alignmentLength, metersToKm, type Position } from "./chainage";
export type Coordinate = Position;
export function validCoordinate(point: unknown): point is Coordinate {
  return Array.isArray(point) && point.length >= 2 && typeof point[0] === "number" && typeof point[1] === "number" && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}
function validate(points: Coordinate[]) {
  if (points.length < 3 || !points.every(validCoordinate)) throw new Error("Route requires surveyed alignment with at least three valid WGS84 [longitude, latitude] coordinates. No rows were imported.");
  alignmentLength({ type: "LineString", coordinates: points });
  return points;
}
export function parseLineString(value: string): Coordinate[] {
  if (!value.trim()) return [];
  const geometry = JSON.parse(value);
  if (geometry?.crs && !/4326|CRS84/i.test(JSON.stringify(geometry.crs))) throw new Error("Import WGS84 longitude/latitude GIS data; the source coordinate system is unsupported.");
  if (geometry?.type !== "LineString" || !Array.isArray(geometry.coordinates)) throw new Error("Select a single GeoJSON LineString route.");
  return validate(geometry.coordinates.map((p: unknown) => { if (!validCoordinate(p)) throw new Error("Invalid GPS coordinate; the complete import was rejected."); return [p[0], p[1]] as Coordinate; }));
}
export function distanceKm(points: Coordinate[]) { return points.length >= 2 ? metersToKm(alignmentLength({ type: "LineString", coordinates: points })) : 0; }
export function parseKml(text: string): Coordinate[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("KML XML is invalid.");
  const lines = doc.getElementsByTagNameNS("*", "LineString");
  if (lines.length !== 1) throw new Error("KML must contain one LineString. Separate routes are never joined automatically.");
  const coordinates = lines[0].getElementsByTagNameNS("*", "coordinates");
  if (coordinates.length !== 1 || !coordinates[0].textContent?.trim()) throw new Error("KML LineString coordinates are missing.");
  return validate(coordinates[0].textContent.trim().split(/\s+/).map(entry => {
    const parts = entry.split(","); if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) throw new Error("KML contains an incomplete GPS coordinate.");
    return [Number(parts[0]), Number(parts[1])] as Coordinate;
  }));
}
export function parseCsv(text: string): Coordinate[] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "") + "\n";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (char === "," || char === "\n")) { row.push(cell.trim()); cell = ""; if (char === "\n") { if (row.length > 1 || row.some(value => value)) rows.push(row); row = []; } }
    else if (char !== "\r" || quoted) cell += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (!rows.length) throw new Error("CSV is empty.");
  const headers = rows[0].map(h => h.toLowerCase());
  const lat = headers.findIndex(h => ["lat", "latitude", "y"].includes(h)), lon = headers.findIndex(h => ["lon", "lng", "longitude", "x"].includes(h));
  if ((lat < 0) !== (lon < 0)) throw new Error("CSV must have both latitude and longitude columns.");
  return validate(rows.slice(lat >= 0 ? 1 : 0).map((row, index) => {
    const x = row[lon >= 0 ? lon : 0], y = row[lat >= 0 ? lat : 1];
    if (!x?.trim() || !y?.trim()) throw new Error(`CSV row ${index + 1} has missing GPS; the complete import was rejected.`);
    return [Number(x), Number(y)] as Coordinate;
  }));
}
async function unzipKmz(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) throw new Error("KMZ ZIP directory is invalid.");
  const entries = view.getUint16(end + 10, true); let offset = view.getUint32(end + 16, true);
  const files: Array<{ method: number; size: number; expanded: number; local: number; crc: number }> = [];
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Invalid KMZ directory entry.");
    const nameLength = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    if (/\.kml$/i.test(name)) {
      if (view.getUint16(offset + 8, true) & 1) throw new Error("Encrypted KMZ is unsupported.");
      files.push({ method: view.getUint16(offset + 10, true), crc: view.getUint32(offset + 16, true), size: view.getUint32(offset + 20, true), expanded: view.getUint32(offset + 24, true), local: view.getUint32(offset + 42, true) });
    }
    offset += 46 + nameLength + extra + comment;
  }
  if (files.length !== 1) throw new Error("KMZ must contain one KML file; export a single verified route.");
  const file = files[0]; if (file.expanded > 32 * 1024 * 1024) throw new Error("Expanded KML exceeds 32 MB.");
  if (view.getUint32(file.local, true) !== 0x04034b50) throw new Error("Invalid KMZ data entry.");
  const start = file.local + 30 + view.getUint16(file.local + 26, true) + view.getUint16(file.local + 28, true);
  const data = bytes.slice(start, start + file.size);
  let content: Uint8Array | null = file.method === 0 ? data : null;
  if (file.method === 8) {
    const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > file.expanded || size > 32 * 1024 * 1024) { await reader.cancel(); throw new Error("Expanded KMZ exceeds its declared size."); } chunks.push(part.value); }
    content = new Uint8Array(size); let index = 0; for (const chunk of chunks) { content.set(chunk, index); index += chunk.length; }
  }
  if (!content || content.length !== file.expanded) throw new Error("Unsupported or incomplete KMZ compression.");
  let crc = 0xffffffff;
  for (const byte of content) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  if (((crc ^ 0xffffffff) >>> 0) !== file.crc) throw new Error("KMZ checksum failed.");
  return new TextDecoder().decode(content);
}
export async function readImportedRoute(file: File): Promise<Coordinate[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error("GIS import exceeds 20 MB.");
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "kmz") return parseKml(await unzipKmz(await file.arrayBuffer()));
  const text = await file.text();
  if (extension === "kml") return parseKml(text);
  if (extension === "csv") return parseCsv(text);
  const parsed = JSON.parse(text);
  if (parsed?.crs && !/4326|CRS84/i.test(JSON.stringify(parsed.crs))) throw new Error("Import WGS84 GIS coordinates.");
  if (parsed?.type === "FeatureCollection") {
    const lines = parsed.features?.filter((f: any) => f?.geometry?.type === "LineString");
    if (lines?.length !== 1 || parsed.features.some((f: any) => f?.geometry?.type === "MultiLineString")) throw new Error("Select one verified LineString; multiple routes are never joined.");
    return parseLineString(JSON.stringify(lines[0].geometry));
  }
  return parseLineString(JSON.stringify(parsed?.type === "Feature" ? parsed.geometry : parsed));
}
