"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChainageFeedback } from "@/components/chainage-details";
import { fetchMasterAsset } from "@/lib/apiClient";
import { Panel } from "@/components/ui";
import type { AssetMasterAssetRecord } from "@/lib/types";

const unknown = "UNKNOWN";

export default function AssetMasterDetails({ params }: { params: { id: string } }) {
  const [asset, setAsset] = useState<AssetMasterAssetRecord | null>(null), [error, setError] = useState("");
  useEffect(() => { let active = true; void fetchMasterAsset(params.id).then(value => { if (active) setAsset(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Asset unavailable"); }); return () => { active = false; }; }, [params.id]);
  const fields: Array<[string, keyof AssetMasterAssetRecord]> = [["Asset ID", "assetId"], ["Name", "name"], ["Pipeline ID", "pipelineId"], ["Segment ID", "segmentId"], ["Parent Asset ID", "parentAssetId"], ["Facility Type", "facilityType"], ["Equipment Type", "equipmentType"], ["Asset Type", "assetType"], ["KP", "kp"], ["Latitude", "latitude"], ["Longitude", "longitude"], ["Coordinates", "coordinates"], ["Side", "side"], ["Installation Date", "installationDate"], ["Manufacturer", "manufacturer"], ["Model", "model"], ["Physical Status", "physicalStatus"], ["Updated At", "updatedAt"]];
  return <div className="space-y-4"><div className="flex flex-wrap justify-between gap-2 lg:pr-24"><h1 className="text-xl font-semibold">Asset Master</h1><Link className="text-sm text-slateblue-600" href="/scada">SCADA</Link></div>{error ? <p role="alert" className="text-red-600">{error}</p> : !asset ? <p>Loading asset...</p> : <Panel><h2 className="text-lg font-semibold">{String(asset.name ?? asset.assetId ?? unknown)}</h2><ChainageFeedback value={asset.kp ?? ""} /><dl className="mt-4 divide-y divide-slate-200 text-sm">{fields.map(([label, key]) => <div key={key} className="grid grid-cols-2 gap-4 py-2"><dt className="text-slate-500">{label}</dt><dd className="break-words">{asset[key] == null || asset[key] === "" ? unknown : String(asset[key])}</dd></div>)}</dl></Panel>}</div>;
}
