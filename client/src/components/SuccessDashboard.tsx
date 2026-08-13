import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Share2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function SuccessDashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: overview } = trpc.account.overview.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    daysActive: 0,
    engagementRate: 0,
  });

  useEffect(() => {
    if (!user) return;

    // Calculate stats from user data
    // In a real app, you'd fetch this from an API endpoint
    const signupDate = new Date(user.createdAt || new Date());
    const daysActive = Math.floor(
      (new Date().getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    setStats({
      totalPosts: 0,
      publishedPosts: 0,
      daysActive: Math.max(daysActive, 0),
      engagementRate: 0,
    });
  }, [user]);

  const currentPlan = overview?.plan ?? user?.plan ?? "free";
  const isProUser = currentPlan === "pro";
  const isStarterUser = currentPlan === "starter";

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
            <div className="text-3xl font-bold">{stats.daysActive}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep posting consistently
            </p>
          </CardContent>
        </Card>

        {/* Engagement Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.engagementRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isProUser ? "Real-time tracking" : "Upgrade to see"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Premium Features */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Track engagement, reach, and audience growth
              </CardDescription>
            </div>
            {!isProUser && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                Pro Only
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isProUser ? (
            <div className="space-y-2 text-sm">
              <p>✓ Real-time engagement metrics</p>
              <p>✓ Audience demographics</p>
              <p>✓ Post performance comparison</p>
              <p>✓ Monthly reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Unlock detailed analytics to see which posts perform best and optimize your strategy.
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Page Management */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                Multi-Page Management
              </CardTitle>
              <CardDescription>
                Manage multiple Facebook pages from one dashboard
              </CardDescription>
            </div>
            {!isProUser && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                Pro Only
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isProUser ? (
            <div className="space-y-2 text-sm">
              <p>✓ Connect up to 5 Facebook pages</p>
              <p>✓ Post to multiple pages at once</p>
              <p>✓ Separate analytics per page</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Manage multiple business pages and scale your marketing across all of them.
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Calendar */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Schedule posts in advance and maintain consistency
              </CardDescription>
            </div>
            {!isStarterUser && !isProUser && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                Starter+
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isStarterUser || isProUser ? (
            <div className="space-y-2 text-sm">
              <p>✓ Schedule posts up to 30 days ahead</p>
              <p>✓ Visual calendar view</p>
              <p>✓ Auto-publish at optimal times</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Plan your content ahead and maintain a consistent posting schedule without manual effort.
              </p>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Upgrade to Starter
              </Button>
            </div>
          )}
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
            {currentPlan === "free" && (
              <Button className="w-full mt-4">View Pricing Plans</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
