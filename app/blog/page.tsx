/**
 * app/blog/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: CACHE LAYER 2 — Data Cache
 * ─────────────────────────────────────────────────────────────────────────
 *
 * getCachedPosts() wraps the DB query in unstable_cache().
 * The result is stored in Next.js's Data Cache on the server.
 *
 * WHAT THIS MEANS IN PRACTICE:
 *  - User #1 visits: DB is queried, result stored in Data Cache
 *  - Users #2–#10,000 visit: Data Cache serves the result, DB never called
 *  - A CMS webhook fires (POST /api/revalidate): revalidateTag('posts') runs
 *  - User #10,001 visits: Data Cache is stale, DB is queried again, result stored
 *
 * THE TIMESTAMP PROOF:
 *  - If you refresh this page multiple times quickly, dbReadAt stays the same
 *    → Data Cache is serving the result (no DB call)
 *  - After you hit "Revalidate" and refresh, dbReadAt changes
 *    → Cache was busted, DB was re-queried
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getCachedPosts } from "@/lib/cached-queries";

export default async function BlogPage() {
  const posts = await getCachedPosts();
  const renderTime = new Date().toISOString();

  // The Data Cache key: "all-posts"
  // The Data Cache tags: ["posts"]
  // Invalidation: revalidateTag('posts') or revalidatePath('/blog')
  // TTL: 3600 seconds (1 hour) — but can be busted on-demand

  return (
    <div className="page">
      <div style={{ marginBottom: "32px" }}>
        <div className="cache-badge badge-l2" style={{ marginBottom: "12px" }}>Layer 2 — Data Cache</div>
        <h1 style={{ marginBottom: "8px" }}>Blog Posts</h1>
        <p style={{ color: "var(--muted)", maxWidth: "560px", lineHeight: 1.7 }}>
          This page uses <code>unstable_cache()</code> to cache DB results in the Data Cache.
          The post list is fetched from the "DB" once, then served from cache on every subsequent request.
          Click "Bust Cache" to force a fresh DB read.
        </p>
      </div>

      {/* THE PROOF PANEL — this is the teaching moment */}
      <div className="proof-panel" style={{ marginBottom: "24px" }}>
        <div><span className="label">{"// LAYER 2: DATA CACHE PROOF"}</span></div>
        <div><span className="label">Page render time:   </span><span className="value">{renderTime}</span></div>
        <div><span className="label">DB read at:         </span><span className="value">{posts[0]?.dbReadAt}</span></div>
        <div style={{ marginTop: "8px" }}><span className="comment">
          {`// If "DB read at" stays the same across refreshes → Data Cache is working`}
        </span></div>
        <div><span className="comment">
          {`// If "DB read at" changes after you hit Revalidate → cache was busted`}
        </span></div>
        <div><span className="comment">
          {`// "Page render time" will ALWAYS change (it's computed at render, not cached)`}
        </span></div>
        <div style={{ marginTop: "8px" }}>
          <span className="label">Cache config:       </span>
          <span className="value">tags: ['posts'], revalidate: 3600</span>
        </div>
        <div>
          <span className="label">Invalidate via:     </span>
          <span className="value">POST /api/revalidate {"{ tag: 'posts' }"}</span>
        </div>
      </div>

      {/* On-demand revalidation controls */}
      <RevalidateControls />

      {/* Post list */}
      <table className="data-table" style={{ marginBottom: "32px" }}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Category</th>
            <th>Views</th>
            <th>DB Read At (the proof)</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.id}>
              <td>
                <a href={`/blog/${post.slug}`} style={{ fontWeight: 600, color: "var(--c2)" }}>
                  {post.title}
                </a>
              </td>
              <td style={{ color: "var(--muted)" }}>{post.author}</td>
              <td>
                <span style={{ background: "var(--c2-bg)", color: "var(--c2)", padding: "2px 8px", borderRadius: "3px", fontSize: "11px" }}>
                  {post.category}
                </span>
              </td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{post.views.toLocaleString()}</td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c2)" }}>
                {post.dbReadAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Explainer */}
      <div className="explainer explainer-l2">
        <p style={{ fontWeight: 700, color: "var(--c2)", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase" }}>
          How the Data Cache works
        </p>
        <p style={{ fontSize: "12px", lineHeight: 1.7, color: "#1e3a5f", marginBottom: "12px" }}>
          <strong>First call (cache MISS):</strong> <code>getCachedPosts()</code> executes the wrapped function, hits the DB,
          and stores the result in Next.js's Data Cache under the key <code>"all-posts"</code> with tags <code>["posts"]</code>.
        </p>
        <p style={{ fontSize: "12px", lineHeight: 1.7, color: "#1e3a5f", marginBottom: "12px" }}>
          <strong>Subsequent calls (cache HIT):</strong> The wrapped function is never called. The Data Cache returns the
          stored result immediately. The DB read timestamp stays frozen.
        </p>
        <p style={{ fontSize: "12px", lineHeight: 1.7, color: "#1e3a5f" }}>
          <strong>On-demand invalidation:</strong> When a CMS publishes new content, it calls <code>revalidateTag('posts')</code>.
          This marks the cache entry as stale. The next request re-executes the DB query and stores the fresh result.
          This is more precise than <code>revalidatePath('/blog')</code> which only busts this one page.
        </p>
      </div>

      {/* The code that makes this work */}
      <div style={{ marginTop: "24px" }}>
        <p style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          The code behind this page
        </p>
        <pre>{`// lib/cached-queries.ts
import { unstable_cache } from 'next/cache';
import { getAllPosts } from './db';

export const getCachedPosts = unstable_cache(
  async () => getAllPosts(),     // ← the actual DB call
  ['all-posts'],                 // ← unique cache key
  {
    tags: ['posts'],             // ← invalidation tag
    revalidate: 3600,            // ← max age: 1 hour
  }
);

// app/blog/page.tsx
const posts = await getCachedPosts(); // ← returns cached result if available

// To invalidate from a Server Action or Route Handler:
import { revalidateTag } from 'next/cache';
revalidateTag('posts'); // ← busts the cache for ALL data tagged 'posts'`}</pre>
      </div>
    </div>
  );
}

// Client component for triggering revalidation
import RevalidateControls from "@/components/RevalidateControls";