import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { PLANS, PLAN_POST_LIMITS } from "@shared/const";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  ImageIcon,
  Zap,
  Share2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo } from "react";

export default function Analytics() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const overview = trpc.account.overview.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const posts = trpc.posts.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const plan = overview.data?.plan ?? "free";
  const usage = overview.data?.usage;
  const postList = posts.data ?? [];

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!usage || usage.limit === null) return 0;
    return Math.round((usage.used / usage.limit) * 100);
  }, [usage]);

  // Calculate posts per day for the last 30 days
  const postsPerDay = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Create a map of dates to post counts
    const dateMap = new Map<string, number>();

    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dateMap.set(dateStr, 0);
    }

    // Count posts by date
    postList.forEach(post => {
      const dateStr = new Date(post.createdAt).toISOString().split("T")[0];
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
      }
    });

    // Convert to array for chart
    return Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        posts: count,
      }))
      .slice(-14); // Last 14 days for readability
  }, [postList]);

  // Calculate status breakdown
  const statusBreakdown = useMemo(() => {
    const breakdown = {
      published: 0,
      draft: 0,
      failed: 0,
    };

    postList.forEach(post => {
      if (post.status === "published") breakdown.published++;
      else if (post.status === "draft") breakdown.draft++;
      else if (post.status === "failed") breakdown.failed++;
    });

    return [
      { name: "Published", value: breakdown.published, color: "#10b981" },
      { name: "Draft", value: breakdown.draft, color: "#6366f1" },
      { name: "Failed", value: breakdown.failed, color: "#ef4444" },
    ].filter(item => item.value > 0);
  }, [postList]);

  // Calculate feature usage
  const featureUsage = useMemo(() => {
    let withCaption = 0;
    let withLogo = 0;
    let published = 0;

    postList.forEach(post => {
      if (post.caption) withCaption++;
      if (post.brandedImageUrl) withLogo++;
      if (post.status === "published") published++;
    });

    return [
      { feature: "AI Captions", count: withCaption, icon: Zap },
      { feature: "Logo Branding", count: withLogo, icon: ImageIcon },
      { feature: "Published", count: published, icon: Share2 },
    ];
  }, [postList]);

  const planLimit = PLAN_POST_LIMITS[plan as "free" | "starter" | "pro"];
  const planName = plan === "free" ? "Free" : PLANS[plan as "starter" | "pro"]?.name ?? plan;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="container py-10">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Analytics</h1>
              <p className="mt-1 text-muted-foreground">
                Track your usage, trends, and feature adoption.
              </p>
            </div>
            <a href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </a>
          </div>

          {/* Key Metrics */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postList.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usage ? `${usage.used} this month` : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {planLimit === null ? "∞" : planLimit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{planName} plan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usagePercentage}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usage && usage.limit ? `${usage.used} / ${usage.limit}` : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {postList.filter(p => p.status === "published").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {postList.length > 0
                    ? `${Math.round((postList.filter(p => p.status === "published").length / postList.length) * 100)}% of posts`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Posts Per Day Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Posts Over Time</CardTitle>
                <CardDescription>Last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                {postsPerDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={postsPerDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="posts" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Post Status</CardTitle>
                <CardDescription>All-time breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>How you're using SnapPost Pro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {featureUsage.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.feature} className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">{item.feature}</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold">{item.count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {postList.length > 0
                          ? `${Math.round((item.count / postList.length) * 100)}% of posts`
                          : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {usagePercentage > 80 && planLimit !== null && (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900">Usage Alert</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-amber-800">
                <p>
                  You're using {usagePercentage}% of your monthly limit. Consider upgrading to
                  keep posting without interruption.
                </p>
                <a href="/pricing">
                  <Button size="sm" className="mt-3" variant="outline">
                    View Plans
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
