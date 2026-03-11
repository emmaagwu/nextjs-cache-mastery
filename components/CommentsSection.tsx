/**
 * components/CommentsSection.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: Suspense streaming + granular Data Cache TTL
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This is a React Server Component (RSC) — async, runs on server only.
 * It's wrapped in <Suspense> in the parent page, which means:
 *  - The parent page HTML is sent to the client immediately
 *  - Comments stream in SEPARATELY once this component resolves
 *  - The user sees the article instantly — comments appear shortly after
 *
 * WHY SEPARATE CACHE?
 *  The post body is cached for 3600s (1 hour).
 *  Comments are cached for 60s — they're more dynamic.
 *  Both can be independently invalidated: revalidateTag('comments')
 *  only busts comments, not the post body. This is the power of
 *  granular cache tags.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getCachedComments } from "@/lib/cached-queries";
import AddComment from "./AddComment";

export default async function CommentsSection({ slug }: { slug: string }) {
  // This fetch has its own Data Cache entry with 60s TTL
  // Completely independent of the post body cache
  const comments = await getCachedComments(slug);
  const fetchedAt = new Date().toISOString();

  return (
    <div>
      {/* Comments cache proof */}
      <div className="proof-panel" style={{ marginBottom: "16px", fontSize: "11px" }}>
        <div><span className="label">{"// COMMENTS: separate Data Cache entry (60s TTL)"}</span></div>
        <div><span className="label">Comments DB read at: </span>
          <span className="value">{fetchedAt}</span>
          <span className="stale">  ← different TTL from post (60s vs 3600s)</span>
        </div>
        <div><span className="label">Cache tag:           </span>
          <span className="value">['comments', 'comments-{slug}']</span>
        </div>
        <div><span className="comment">
          {"// Adding a comment calls revalidateTag('comments-" + slug + "') → busts THIS"}
        </span></div>
        <div><span className="comment">
          {"// The POST body cache is untouched — only comments refresh"}
        </span></div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "12px", border: "1px dashed var(--border)", borderRadius: "6px" }}>
          No comments yet. Add one below.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {comments.map(comment => (
            <div key={comment.id} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>{comment.author}</span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {new Date(comment.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "12px", lineHeight: 1.6 }}>{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form — Server Action */}
      <AddComment slug={slug} />
    </div>
  );
}