export type PostCreationQueryInvalidator = {
  invalidatePosts: () => void | Promise<unknown>;
  invalidateAccountOverview: () => void | Promise<unknown>;
};

/**
 * New posts consume the monthly allowance as soon as the draft is created.
 * Refresh both views so the dashboard counter never lags behind post history.
 */
export function refreshPostCreationQueries(
  invalidator: PostCreationQueryInvalidator,
) {
  void invalidator.invalidatePosts();
  void invalidator.invalidateAccountOverview();
}
