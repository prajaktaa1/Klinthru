"use client";

import { useState } from "react";

import { CpDesignBasisWorkspace } from "@/components/cp-design-basis-workspace";
import { PipelineRecord } from "@/lib/types";

export default function CpEngineeringGapAnalysisPage() {
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 pb-10">
      <CpDesignBasisWorkspace pipeline={selectedPipeline} onSelectPipeline={setSelectedPipeline} />
    </div>
  );
}
