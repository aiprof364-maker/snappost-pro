import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, AlertCircle, Mail, Users } from "lucide-react";
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

  const funnel = trpc.admin.funnelOverview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const signupFunnel = trpc.admin.signupFunnel.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const accountList = trpc.admin.accountList.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const contractorAnalytics = trpc.admin.contractorAnalytics.useQuery(
    { userId: selectedUserId! },
    {
      enabled:
        isAuthenticated && user?.role === "admin" && selectedUserId !== null,
    }
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
              <h1 className="font-display text-2xl font-bold text-destructive">
                Access Denied
              </h1>
              <p className="mt-2 text-destructive/80">
                You don't have permission to access this page. Admin role
                required.
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

          {/* Subscriber Funnel */}
          <div className="mb-8">
            <h2 className="font-display text-xl font-bold">
              Subscriber Funnel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All-time account and subscription progress.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Accounts", funnel.data?.accounts],
                ["Free accounts", funnel.data?.freeAccounts],
                ["Created a draft", funnel.data?.activatedAccounts],
                ["Connected a Page", funnel.data?.connectedPages],
                ["Started checkout", funnel.data?.checkoutStarted],
                ["Paid subscribers", funnel.data?.paidSubscribers],
              ].map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {funnel.isLoading ? "—" : (value ?? 0)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Free access funnel */}
          <div className="mb-8">
            <h2 className="font-display text-xl font-bold">
              Free-access Funnel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Last {signupFunnel.data?.periodDays ?? 30} days. Aggregate-only
              stages for finding where paid visitors stop.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  "Free access links requested",
                  signupFunnel.data?.freeAccessRequested,
                ],
                [
                  "Free access links opened",
                  signupFunnel.data?.freeAccessOpened,
                ],
                ["New Free accounts", signupFunnel.data?.freeAccountsCreated],
                ["Connected a Page", signupFunnel.data?.connectedPages],
                ["Created a draft", signupFunnel.data?.draftsCreated],
                ["Published a post", signupFunnel.data?.postsPublished],
              ].map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {signupFunnel.isLoading ? "—" : (value ?? 0)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Source-attributed Free accounts recorded from this release:
              contractors {signupFunnel.data?.landingAccounts.contractors ?? 0}{" "}
              · hairdressers{" "}
              {signupFunnel.data?.landingAccounts.hairdressers ?? 0}
            </p>
          </div>

          {/* Email Delivery Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">
                    Trial Expiration Warnings
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emailStats.data?.trialExpirationWarnings.sent ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sent • {emailStats.data?.trialExpirationWarnings.failed ?? 0}{" "}
                  failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">
                    Renewal Reminders
                  </CardTitle>
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

          {/* Account List */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account List</CardTitle>
              <CardDescription>
                Owner-only list of every account, including test accounts.
                Newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountList.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (accountList.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accounts yet.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {(accountList.data ?? []).map(account => (
                    <div
                      key={account.id}
                      className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {account.email || "No email recorded"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {new Date(account.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit capitalize">
                        {account.plan}
                      </Badge>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.role === "admin"
                          ? "Admin"
                          : account.subscriptionStatus || "none"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Usage Contractors */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>High-Usage Contractors</CardTitle>
              </div>
              <CardDescription>
                Contractors using &gt;70% of their monthly limit (upsell
                opportunities)
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
                          <span className="font-medium">
                            {contractor.name || "Unknown"}
                          </span>
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
                          {contractor.usage} / {contractor.limit} posts this
                          month
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
                    <CardTitle>
                      {contractorAnalytics.data.user.name || "Contractor"}
                    </CardTitle>
                    <CardDescription>
                      {contractorAnalytics.data.user.email}
                    </CardDescription>
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
                    <p className="text-sm text-muted-foreground">
                      Subscription Status
                    </p>
                    <p className="text-lg font-semibold capitalize">
                      {contractorAnalytics.data.user.subscriptionStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-lg font-semibold">
                      {new Date(
                        contractorAnalytics.data.user.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Usage Statistics</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monthly Usage
                      </p>
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
                      <p className="text-sm text-muted-foreground">
                        Total Posts
                      </p>
                      <p className="text-2xl font-bold">
                        {contractorAnalytics.data.stats.totalPosts}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {contractorAnalytics.data.stats.publishedPosts}{" "}
                        published • {contractorAnalytics.data.stats.draftPosts}{" "}
                        draft • {contractorAnalytics.data.stats.failedPosts}{" "}
                        failed
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
                        <p className="font-semibold text-amber-900">
                          Upsell Opportunity
                        </p>
                        <p className="text-sm text-amber-800 mt-1">
                          This contractor is using{" "}
                          {contractorAnalytics.data.stats.usagePercent}% of
                          their monthly limit. Consider reaching out about
                          upgrading to a higher plan.
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
