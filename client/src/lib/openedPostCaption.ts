/** Copy a saved caption into the editor once the post row has loaded. */
export function captionWhenPostOpens(
  post: { id: number; caption: string | null } | undefined,
  loadedPostId: number | null
): { caption: string; loadedPostId: number } | null {
  if (!post || loadedPostId === post.id) return null;
  return { caption: post.caption ?? "", loadedPostId: post.id };
}
