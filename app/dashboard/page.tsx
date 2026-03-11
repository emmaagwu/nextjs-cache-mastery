/**
 * app/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: Opting OUT of all server-side caching (force-dynamic)
 * AND the problem that Router Cache (Layer 4) causes on the CLIENT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY FORCE-DYNAMIC?
 *  A user dashboard shows PER-USER data. User A must never see User B's
 *  cached data. The Full Route Cache would serve the same HTML to everyone.
 *  So we opt out of it entirely with `export const dynamic = 'force-dynamic'`.
 *
 * THIS MEANS:
 *  - Full Route Cache: DISABLED (page is never stored)
 *  - Data Cache: can still be used for non-user-specific data
 *  - Request Memoization: still works within this single render
 *  - Router Cache: still caches on the CLIENT (Layer 4 demo below)
 *
 * THE LAYER 4 PROBLEM:
 *  Even though this page is force-dynamic (fresh every server render),
 *  the Router Cache (client-side) caches the RSC payload after first visit.
 *  So navigating BACK to this page via <Link> may show stale data.
 *  Fix: router.refresh() after mutations.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getAllPosts } from "@/lib/db";   // ← Direct DB call, NO caching
import RouterCacheDemo from "@/components/RouterCacheDemo";

// ← THIS IS THE KEY EXPORT
// force-dynamic = "never cache this route, always run it fresh"
// Equivalent to: every request runs a new serverless function
// Without this: Next.js might cache this as a static page (wrong!)
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Direct DB call — not going through any cache
  // Every visit to this page hits the DB
  const posts = await getAllPosts();
  const serverTime = new Date().toISOString();

  return (
    <div className="page">
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span className="cache-badge" style={{ color: "var(--miss)", borderColor: "var(--miss)", background: "var(--miss-bg)" }}>
            NO CACHE — force-dynamic
          </span>
          <span className="cache-badge badge-l4">Layer 4 — Router Cache (client)</span>
        </div>
        <h1 style={{ marginBottom: "8px" }}>Dashboard</h1>
        <p style={{ color: "var(--muted)", maxWidth: "560px", lineHeight: 1.7 }}>
          This page uses <code>export const dynamic = "force-dynamic"</code>.
          It bypasses the Full Route Cache. The server timestamp below
          changes on every single page load — proving it re-renders every time.
        </p>
      </div>

      {/* Server timestamp proof */}
      <div className="proof-panel" style={{ marginBottom: "24px" }}>
        <div><span className="label">{"// NO FULL ROUTE CACHE — force-dynamic"}</span></div>
        <div style={{ marginTop: "8px" }}>
          <span className="label">Server render time:  </span>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{serverTime}</span>
          <span style={{ color: "#f59e0b" }}>  ← THIS CHANGES on every refresh</span>
        </div>
        <div>
          <span className="label">DB read at:          </span>
          <span style={{ color: "#f59e0b" }}>{posts[0]?.dbReadAt}</span>
          <span style={{ color: "#f59e0b" }}>  ← Also changes (direct DB call)</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="comment">{"// This page is a Serverless Function invocation on EVERY request"}</span>
        </div>
        <div>
          <span className="comment">{"// Cost implication: 1 serverless invocation per user visit"}</span>
        </div>
        <div>
          <span className="comment">{"// Use force-dynamic only when data MUST be per-request-fresh"}</span>
        </div>
      </div>

      {/* When to use force-dynamic vs cache */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "var(--hit-bg)", border: "1px solid #86efac", padding: "16px", borderRadius: "6px" }}>
          <p style={{ fontWeight: 700, color: "var(--hit)", fontSize: "11px", textTransform: "uppercase", marginBottom: "10px" }}>
            ✅ Use force-dynamic when
          </p>
          {[
            "Page shows user-specific data (dashboard, profile, cart)",
            "Data must be real-time fresh (live prices, notifications)",
            "Page reads headers or cookies that vary per-user",
            "You're building an admin panel or internal tool",
          ].map((item, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#14532d", marginBottom: "6px", display: "flex", gap: "6px" }}>
              <span>→</span><span>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--miss-bg)", border: "1px solid #fca5a5", padding: "16px", borderRadius: "6px" }}>
          <p style={{ fontWeight: 700, color: "var(--miss)", fontSize: "11px", textTransform: "uppercase", marginBottom: "10px" }}>
            ❌ Don't use force-dynamic when
          </p>
          {[
            "Content is the same for all users (blog, docs, marketing)",
            "Data changes on a schedule (use ISR / revalidate instead)",
            "You need to handle high traffic efficiently",
            "You're worried about Vercel serverless costs",
          ].map((item, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#7f1d1d", marginBottom: "6px", display: "flex", gap: "6px" }}>
              <span>→</span><span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Post list — proves data is fresh */}
      <table className="data-table" style={{ marginBottom: "32px" }}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>DB Read At (changes every load)</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.id}>
              <td style={{ fontWeight: 600 }}>{post.title}</td>
              <td style={{ color: "var(--muted)" }}>{post.author}</td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c4)" }}>
                {post.dbReadAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Router Cache (Layer 4) interactive demo */}
      <RouterCacheDemo />

      {/* Code */}
      <div style={{ marginTop: "24px" }}>
        <p style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          The code that makes this page always fresh
        </p>
        <pre>{`// app/dashboard/page.tsx

// ← This single export disables Full Route Cache for this route
export const dynamic = 'force-dynamic';

// Direct DB call — no caching wrapper
const posts = await getAllPosts(); // hits DB on EVERY request

// The render timestamp will change on every page load
// proving this page is never served from cache
const serverTime = new Date().toISOString();

// ── LAYER 4 GOTCHA ────────────────────────────────────────
// Even though this page is force-dynamic on the SERVER,
// the ROUTER CACHE (client-side) will cache it after first visit.
//
// Navigate to /dashboard → router cache stores it
// Navigate away → navigate back via Link → you MAY see stale data
//
// Fix: after a mutation, call router.refresh()
// This tells the client to re-fetch the RSC payload from server
import { useRouter } from 'next/navigation';
const router = useRouter();
router.refresh(); // ← clears Router Cache for current route`}</pre>
      </div>
    </div>
  );
}