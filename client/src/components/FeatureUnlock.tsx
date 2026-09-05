import { Card } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";
import { AVAILABLE_SNAPPOST_FEATURES } from "@/lib/availableSnapPostFeatures";

export function FeatureUnlock() {
  return (
    <Card className="border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Your SnapPost tools</h3>
      </div>

      <p className="mb-4 mt-2 text-sm text-muted-foreground">
        Available now with your current SnapPost Pro plan.
      </p>

      <div className="grid gap-3">
        {AVAILABLE_SNAPPOST_FEATURES.map(feature => (
          <div
            key={feature.name}
            className="flex items-start gap-3 rounded-lg border border-primary/10 bg-background/75 p-3"
          >
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{feature.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
