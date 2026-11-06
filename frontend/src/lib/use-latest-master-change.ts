"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchMasterChangeLog } from "@/lib/apiClient";
import { watchMapDataChanged } from "@/lib/map-sync";
export function useLatestMasterChange(pipelineId: string | undefined) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [latest, setLatest] = useState<{ pipelineId: string; at: string } | null>(null);
  useEffect(() => watchMapDataChanged(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let active = true;
    setLatest(null);
    if (pipelineId && user?.role === "Admin") void fetchMasterChangeLog(pipelineId).then(result => {
      const times = result.events
        .map(event => event.occurredAt)
        .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
        .sort((a, b) => Date.parse(b) - Date.parse(a));
      if (active && times[0]) setLatest({ pipelineId, at: times[0] });
    }).catch(() => {});
    return () => { active = false; };
  }, [pipelineId, user?.role, revision]);
  return latest && latest.pipelineId === pipelineId ? latest.at : null;
}
