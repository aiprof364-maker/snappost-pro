import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Lock, Unlock } from "lucide-react";

export function FeatureUnlock() {
  const { data: checklist } = trpc.onboarding.getChecklist.useQuery();

  if (!checklist) return null;

  const isComplete = checklist.completionPercentage === 100;

  const features = [
    {
      name: "Advanced Analytics",
      description: "Track engagement and performance of each post",
      icon: "📊",
      unlocked: isComplete,
    },
    {
      name: "Multi-Page Management",
      description: "Manage multiple Facebook pages from one dashboard",
      icon: "🔗",
      unlocked: isComplete,
    },
    {
      name: "Content Calendar",
      description: "Schedule posts in advance and plan your strategy",
      icon: "📅",
      unlocked: isComplete,
    },
    {
      name: "AI Caption Variations",
      description: "Generate multiple caption options for each post",
      icon: "✨",
      unlocked: isComplete,
    },
  ];

  const unlockedCount = features.filter((f) => f.unlocked).length;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Premium Features</h3>
        </div>
        {isComplete && (
          <Badge className="bg-green-100 text-green-800 border-0">
            All Unlocked
          </Badge>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {isComplete
          ? "🎉 You've unlocked all premium features! Start using them now."
          : `Complete your setup to unlock ${unlockedCount}/${features.length} premium features.`}
      </p>

      <div className="grid gap-3">
        {features.map((feature) => (
          <div
            key={feature.name}
            className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
              feature.unlocked
                ? "bg-white bg-opacity-70 border border-green-200"
                : "bg-white bg-opacity-40 border border-gray-200 opacity-60"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {feature.unlocked ? (
                <Unlock className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {feature.icon} {feature.name}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!isComplete && (
        <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
          <p className="text-xs font-medium text-purple-900">
            💪 {4 - Math.round(checklist.completionPercentage / 25)} more steps to unlock all features
          </p>
        </div>
      )}
    </Card>
  );
}
