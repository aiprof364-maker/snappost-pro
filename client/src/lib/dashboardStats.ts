export type DashboardPostStatus = {
  status: string;
};

/** Derive dashboard counts directly from the authenticated user's saved posts. */
export function getDashboardPostStats(posts: readonly DashboardPostStatus[] | undefined) {
  const records = posts ?? [];

  return {
    totalPosts: records.length,
    publishedPosts: records.filter(post => post.status === "published").length,
  };
}
