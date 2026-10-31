export type RectifierOperationalStatus = "Online" | "Offline" | "Warning" | "Not Available";

export function getRectifierOperationalStatus(readingStatus: string | null | undefined, readingAt: string | null | undefined): RectifierOperationalStatus {
  if (!readingAt || !readingStatus) return "Not Available";

  const status = readingStatus.toLowerCase();
  if (status.includes("offline") || status.includes("fault")) return "Offline";
  if (status.includes("standby") || status.includes("maintenance") || status.includes("warning")) return "Warning";
  if (status.includes("active") || status.includes("online") || status.includes("normal")) return "Online";
  return "Not Available";
}

export function isRectifierOperationalOnline(readingStatus: string | null | undefined, readingAt: string | null | undefined) {
  return getRectifierOperationalStatus(readingStatus, readingAt) === "Online";
}
