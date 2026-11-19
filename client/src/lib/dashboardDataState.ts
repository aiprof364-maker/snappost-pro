/**
 * The account overview is authoritative for plan, usage, logo, Facebook and
 * post-access UI. Keep the dashboard in a neutral loading state until it is
 * available, rather than defaulting a paid account to Free for one render.
 */
export function isDashboardDataLoading(input: {
  authLoading: boolean;
  isAuthenticated: boolean;
  overviewLoading: boolean;
}) {
  // A signed-out visit is not a loading state. The page must send them to
  // sign in instead of painting an empty dashboard.
  if (!input.isAuthenticated) return input.authLoading;
  return input.authLoading || input.overviewLoading;
}
