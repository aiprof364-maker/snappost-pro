import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  TrendingUp,
  AlertCircle,
  Mail,
  Users,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";

export default function AdminDashboard() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const highUsage = trpc.admin.highUsageContractors.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const contractorAnalytics = trpc.admin.contractorAnalytics.useQuery(
    { userId: selectedUserId! },
    { enabled: isAuthenticated && user?.role === "admin" && selectedUserId !== null }
  );

  const emailStats = trpc.admin.emailDeliveryStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 bg-muted/20">
          <div className="container py-10">
            <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
              <h1 className="font-display text-2xl font-bold text-destructive">Access Denied</h1>
              <p className="mt-2 text-destructive/80">
                You don't have permission to access this page. Admin role required.
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="container py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Monitor contractor usage and email delivery.
            </p>
          </div>

          {/* Email Delivery Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">Trial Expiration Warnings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emailStats.data?.trialExpirationWarnings.sent ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sent • {emailStats.data?.trialExpirationWarnings.failed ?? 0} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">Renewal Reminders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emailStats.data?.renewalReminders.sent ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sent • {emailStats.data?.renewalReminders.failed ?? 0} failed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* High Usage Contractors */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>High-Usage Contractors</CardTitle>
              </div>
              <CardDescription>
                Contractors using &gt;70% of their monthly limit (upsell opportunities)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highUsage.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (highUsage.data ?? []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No high-usage contractors at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {(highUsage.data ?? []).map(contractor => (
                    <div
                      key={contractor.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition"
                      onClick={() => setSelectedUserId(contractor.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contractor.name || "Unknown"}</span>
                          <Badge variant="outline" className="capitalize">
                            {contractor.plan}
                          </Badge>
                          <Badge
                            variant={
                              contractor.usagePercent >= 90
                                ? "destructive"
                                : contractor.usagePercent >= 80
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {contractor.usagePercent}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {contractor.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {contractor.usage} / {contractor.limit} posts this month
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contractor Details */}
          {selectedUserId && contractorAnalytics.data && (
            <Card className="mt-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{contractorAnalytics.data.user.name || "Contractor"}</CardTitle>
                    <CardDescription>{contractorAnalytics.data.user.email}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserId(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Info */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="text-lg font-semibold capitalize">
                      {contractorAnalytics.data.user.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription Status</p>
                    <p className="text-lg font-semibold capitalize">
                      {contractorAnalytics.data.user.subscriptionStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-lg font-semibold">
                      {new Date(contractorAnalytics.data.user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Usage Statistics</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Usage</p>
                      <p className="text-2xl font-bold">
                        {contractorAnalytics.data.stats.monthlyUsage} /{" "}
                        {contractorAnalytics.data.stats.monthlyLimit}
                      </p>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(contractorAnalytics.data.stats.usagePercent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                      <p className="text-2xl font-bold">
                        {contractorAnalytics.data.stats.totalPosts}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {contractorAnalytics.data.stats.publishedPosts} published •{" "}
                        {contractorAnalytics.data.stats.draftPosts} draft •{" "}
                        {contractorAnalytics.data.stats.failedPosts} failed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upsell Recommendation */}
                {contractorAnalytics.data.stats.usagePercent >= 70 && (
                  <div className="border-t pt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900">Upsell Opportunity</p>
                        <p className="text-sm text-amber-800 mt-1">
                          This contractor is using {contractorAnalytics.data.stats.usagePercent}% of
                          their monthly limit. Consider reaching out about upgrading to a higher
                          plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
