/**
 * app/blog/[slug]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: CACHE LAYER 3 — Full Route Cache
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The Full Route Cache stores the ENTIRE rendered output of this page
 * (HTML + RSC payload) on disk / Vercel's CDN.
 *
 * HOW IT DIFFERS FROM THE DATA CACHE:
 *  - Data Cache: stores the raw DATA (JSON from DB query)
 *  - Full Route Cache: stores the rendered HTML/RSC payload
 *
 * They interact: if Data Cache is invalidated → Full Route Cache is
 * also automatically invalidated (because the render depends on data).
 * But not vice versa: you can invalidate Full Route Cache without
 * touching Data Cache.
 *
 * WHAT ISR ACTUALLY IS:
 *  ISR = "revalidate the Full Route Cache on a timer"
 *  When you write `export const revalidate = 3600`, you're telling
 *  Next.js: "store this page in the Full Route Cache, and rebuild it
 *  in the background every 3600 seconds."
 *
 * THE TIMESTAMP PROOF:
 *  - "Page rendered at" will be FROZEN across requests (Full Route Cache)
 *  - "DB read at" will also be frozen (Data Cache)
 *  - After revalidatePath('/blog/[slug]'), BOTH timestamps update
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getCachedPost, getCachedComments } from "@/lib/cached-queries";
import { Suspense } from "react";
import CommentsSection from "@/components/CommentsSection";
import RevalidateControls from "@/components/RevalidateControls";

// ✅ THIS IS THE ISR DECLARATION
// This single export tells Vercel:
//   1. Render this page at build time (if generateStaticParams returns it)
//   2. Store the rendered HTML in the Full Route Cache
//   3. After 3600 seconds, the next request triggers a background re-render
//   4. While re-rendering, serve the stale HTML (stale-while-revalidate)
export const revalidate = 3600;

// Tells Next.js which slugs to pre-render at build time
// (Without this, pages are generated on first request and then cached)
export async function generateStaticParams() {
  return [
    { slug: "understanding-rsc" },
    { slug: "vercel-edge-explained" },
    { slug: "nextjs-caching-deep-dive" },
  ];
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  const renderTime = new Date().toISOString(); // ← This gets frozen in Full Route Cache!

  if (!post) {
    return (
      <div className="page">
        <h1>Post not found</h1>
        <p style={{ color: "var(--muted)" }}>The slug "{slug}" doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span className="cache-badge badge-l3">Layer 3 — Full Route Cache</span>
          <span className="cache-badge badge-l2">Layer 2 — Data Cache</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "12px" }}>
          {post.category} · {post.author}
        </div>
        <h1 style={{ marginBottom: "16px" }}>{post.title}</h1>
        <p style={{ lineHeight: 1.8, color: "var(--muted)", maxWidth: "640px", marginBottom: "24px" }}>
          {post.body}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "var(--dim)" }}>
          <span>👁 {post.views.toLocaleString()} views</span>
        </div>
      </div>

      {/* THE CRITICAL TEACHING MOMENT */}
      <div className="proof-panel" style={{ marginBottom: "24px" }}>
        <div><span className="label">{"// LAYER 3: FULL ROUTE CACHE PROOF"}</span></div>
        <div style={{ marginTop: "8px" }}>
          <span className="label">Page rendered at:   </span>
          <span className="value">{renderTime}</span>
          <span className="stale">  ← THIS IS FROZEN. Same across all requests while cached.</span>
        </div>
        <div>
          <span className="label">DB read at:         </span>
          <span className="value">{post.dbReadAt}</span>
          <span className="stale">  ← Also frozen (Data Cache inside Full Route Cache)</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="comment">{"// If you refresh this page 100 times → both timestamps stay identical"}</span>
        </div>
        <div>
          <span className="comment">{"// Because the ENTIRE page HTML is pre-rendered and cached."}</span>
        </div>
        <div>
          <span className="comment">{"// React never runs again. DB never queried. Just CDN file serving."}</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <span className="label">ISR config:         </span>
          <span className="value">export const revalidate = 3600 (1 hour)</span>
        </div>
        <div>
          <span className="label">Cache tags:         </span>
          <span className="value">['posts', 'post-{slug}']</span>
        </div>
      </div>

      <RevalidateControls slug={slug} />

      {/* Two-cache invalidation diagram */}
      <div style={{ marginTop: "24px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "20px", marginBottom: "24px" }}>
        <p style={{ fontWeight: 700, marginBottom: "12px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          How revalidation flows through both caches
        </p>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", lineHeight: 2 }}>
          <div>
            <span style={{ color: "var(--c3)" }}>revalidatePath({"'/blog/" + slug + "'"}):</span>
            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>Busts Full Route Cache for THIS page only</span>
          </div>
          <div>
            <span style={{ color: "var(--c2)" }}>revalidateTag({"'posts'"}):</span>
            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>Busts Data Cache → automatically also busts Full Route Cache</span>
          </div>
          <div>
            <span style={{ color: "var(--c2)" }}>revalidateTag({"'post-" + slug + "'"}):</span>
            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>Busts ONLY this post's Data Cache (surgical)</span>
          </div>
          <div style={{ marginTop: "8px", color: "var(--dim)" }}>
            Rule: <span style={{ color: "var(--text)" }}>Data Cache invalidation cascades to Full Route Cache.</span>
            <span style={{ marginLeft: "4px" }}>Full Route Cache invalidation does NOT affect Data Cache.</span>
          </div>
        </div>
      </div>

      {/* Comments — uses Suspense because they have a SHORTER cache TTL */}
      <div style={{ borderTop: "2px solid var(--border)", paddingTop: "32px", marginTop: "32px" }}>
        <div className="cache-badge badge-l2" style={{ marginBottom: "12px" }}>Layer 2 — Data Cache (60s TTL) + Suspense</div>
        <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Comments</h2>
        <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "20px" }}>
          Comments use a <strong>separate cache entry</strong> with a 60-second TTL.
          The page itself caches for 1 hour. This is the power of granular caching —
          different data at different freshness levels on the same page.
        </p>

        {/* Suspense: the comments stream in AFTER the page HTML is sent */}
        <Suspense fallback={
          <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
            Loading comments... (streaming from server)
          </div>
        }>
          <CommentsSection slug={slug} />
        </Suspense>
      </div>
    </div>
  );
}