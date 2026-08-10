import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Zap } from "lucide-react";

export function OnboardingChecklist() {
  const { data: checklist, isLoading } = trpc.onboarding.getChecklist.useQuery();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return null;
  }

  if (!checklist) {
    return null;
  }

  const steps = [
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Upload your logo to brand all posts",
      completed: checklist.profileCompleted,
      icon: "profile",
      scrollTo: "logo-section",
    },
    {
      id: "facebook",
      title: "Connect Facebook",
      description: "Link your Facebook business page",
      completed: checklist.facebookConnected,
      icon: "facebook",
      scrollTo: "facebook-section",
    },
    {
      id: "first-post",
      title: "Create Your First Post",
      description: "Upload a photo and generate a caption",
      completed: checklist.firstPostCreated,
      icon: "camera",
      scrollTo: "upload-section",
    },
    {
      id: "publish",
      title: "Publish to Facebook",
      description: "Share your branded post",
      completed: checklist.firstPostPublished,
      icon: "publish",
      scrollTo: "upload-section",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const completionPercentage = checklist.completionPercentage;

  const handleStepClick = (step: typeof steps[0]) => {
    if (step.completed) return;
    const el = document.getElementById(step.scrollTo);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Flash the section briefly
      el.classList.add("ring-2", "ring-indigo-400", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400", "ring-offset-2");
      }, 2000);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Get Started in 4 Steps
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Complete your setup to unlock all features
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {completionPercentage}%
          </div>
          <div className="text-xs text-gray-600">
            {completedCount} of {steps.length} complete
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            onClick={() => handleStepClick(step)}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              step.completed
                ? "bg-white bg-opacity-60"
                : "bg-white bg-opacity-40 hover:bg-opacity-60 cursor-pointer hover:ring-1 hover:ring-indigo-300"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.completed
                    ? "text-gray-600 line-through"
                    : "text-gray-900"
                }`}
              >
                {step.title}
              </p>
              <p className="text-xs text-gray-600">{step.description}</p>
            </div>
            {!step.completed && (
              <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">
                Do this →
              </span>
            )}
          </div>
        ))}
      </div>

      {completionPercentage === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">
            🎉 You're all set! Start creating branded posts now.
          </p>
        </div>
      )}
    </Card>
  );
}
