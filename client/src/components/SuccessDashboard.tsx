import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getDashboardPostStats } from "@/lib/dashboardStats";

export function SuccessDashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: overview } = trpc.account.overview.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { data: posts } = trpc.posts.list.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const stats = useMemo(() => getDashboardPostStats(posts), [posts]);
  const daysActive = useMemo(() => {
    if (!user?.createdAt) return 0;
    const ageInMs = Date.now() - new Date(user.createdAt).getTime();
    return Math.max(Math.floor(ageInMs / (24 * 60 * 60 * 1000)), 0);
  }, [user?.createdAt]);

  const currentPlan = overview?.plan ?? user?.plan ?? "free";
  const usage = overview?.usage;
  const remainingPosts =
    usage?.limit == null ? "Unlimited" : Math.max(usage.limit - usage.used, 0);

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Posts Published */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posts Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.publishedPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalPosts} total created
            </p>
          </CardContent>
        </Card>

        {/* Days Active */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{daysActive}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep posting consistently
            </p>
          </CardContent>
        </Card>

        {/* Remaining post allowance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posts Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{remainingPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {usage?.limit == null ? "No monthly cap" : "in your current month"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available in SnapPost Pro</CardTitle>
          <CardDescription>
            Create, brand, and publish job-site posts to the Facebook Page you connect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>AI-generated captions for your job-site photos</li>
            <li>Automatic logo branding on each new image</li>
            <li>Facebook Page publishing and saved post history</li>
          </ul>
        </CardContent>
      </Card>

      {/* Current Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Plan:</span>
              <Badge variant="outline" className="capitalize">
                {currentPlan}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Posts per month:</span>
              <span className="text-sm">
                {currentPlan === "pro" ? "300" : currentPlan === "starter" ? "30" : "3"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
