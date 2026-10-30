import { AiPredictionsWorkspace } from "@/components/ai-predictions-workspace";

export default function AiPredictionsPage() {
  return (
    <div className="min-w-0 space-y-6">
      <AiPredictionsWorkspace mode="real" />
    </div>
  );
}
