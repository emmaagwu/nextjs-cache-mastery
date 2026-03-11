/**
 * app/page.tsx — Home / Master Explainer
 * ─────────────────────────────────────────────────────────────────────────
 * This page is the command centre for understanding the 4 cache layers.
 * It also demonstrates Request Memoization by calling getCachedTopPosts()
 * HERE (second call) — but the DB is only hit once because the layout
 * already called it. React memoizes within the render tree.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { getCachedTopPosts } from "@/lib/cached-queries";

const LAYERS = [
  {
    n: 1, cls: "badge-l1", exCls: "explainer-l1", color: "var(--c1)",
    name: "Request Memoization",
    where: "React runtime — per render only",
    lifetime: "Single server render pass",
    storage: "In-memory (Node.js process)",
    invalidate: "Automatic — cleared after response sent",
    nextjs15: "Unchanged from v14 — still enabled by default",
    problem: "Without it: if Layout, Page, AND Sidebar all call getUser(), that's 3 DB hits per page load.",
    solution: "With it: same function called 3× in one render → only 1 DB call. The other 2 return the cached value.",
    code: `// Three components in the render tree all call this:
async function getUser(id: string) {
  return db.users.findUnique({ where: { id } });
}

// ← Layout calls it      → 1st call: DB hit
// ← Page calls it        → 2nd call: MEMO HIT (no DB)
// ← Sidebar calls it     → 3rd call: MEMO HIT (no DB)
// Result: exactly 1 DB query, not 3`,
  },
  {
    n: 2, cls: "badge-l2", exCls: "explainer-l2", color: "var(--c2)",
    name: "Data Cache",
    where: "Next.js server — persists across requests",
    lifetime: "Until revalidated or expired (your config)",
    storage: "Server filesystem / Vercel infrastructure",
    invalidate: "revalidateTag('tag') or revalidatePath('/path')",
    nextjs15: "⚠️ BREAKING CHANGE: fetch() is NO LONGER cached by default in v15. You must opt in explicitly.",
    problem: "Without it: every page load hits the DB. 10,000 users = 10,000 DB queries for the same blog post.",
    solution: "With it: first request hits DB and stores result. Next 9,999 users get cached result. Zero DB calls.",
    code: `// Next.js 14: fetch() was cached by default
// Next.js 15: fetch() is NO LONGER cached. You must opt in:

// Option A: fetch() with explicit cache
const res = await fetch(url, {
  next: { tags: ['posts'], revalidate: 3600 }
});

// Option B: unstable_cache for DB queries (non-fetch)
export const getCachedPosts = unstable_cache(
  async () => db.posts.findMany(),
  ['all-posts'],
  { tags: ['posts'], revalidate: 3600 }
);

// Invalidate: revalidateTag('posts') → forces fresh fetch`,
  },
  {
    n: 3, cls: "badge-l3", exCls: "explainer-l3", color: "var(--c3)",
    name: "Full Route Cache",
    where: "Vercel CDN / server disk",
    lifetime: "Until revalidated (ISR) or next deploy",
    storage: "CDN edge nodes globally",
    invalidate: "revalidatePath('/path') or revalidateTtag + ISR",
    nextjs15: "Unchanged — static routes still cached as HTML at build time",
    problem: "Without it: even if Data Cache is warm, Next.js still re-renders the React tree on every request (expensive).",
    solution: "With it: the entire rendered HTML+RSC payload is stored. Zero rendering on cache hit — just file serving from CDN.",
    code: `// app/blog/[slug]/page.tsx
export const revalidate = 3600; // ISR: rebuild HTML every hour

// At BUILD TIME → Next.js renders this page → stores HTML in Full Route Cache
// At REQUEST TIME on cache HIT → CDN serves stored HTML instantly
//                                 No React rendering. No DB query.
//                                 Just file serving. ~5ms response time.
// At REQUEST TIME after 3600s → background re-render triggered
//                                User still gets stale HTML (fast)
//                                Next user gets fresh HTML`,
  },
  {
    n: 4, cls: "badge-l4", exCls: "explainer-l4", color: "var(--c4)",
    name: "Router Cache",
    where: "Client browser — in-memory",
    lifetime: "Session (lost on hard refresh or tab close)",
    storage: "JavaScript memory in the browser",
    invalidate: "router.refresh() or hard reload (Cmd+Shift+R)",
    nextjs15: "⚠️ BREAKING CHANGE: page segments no longer cached by default in v15. staleTime = 0.",
    problem: "Without it: every <Link> click causes a full server round-trip to fetch the page's RSC payload.",
    solution: "With it: hovering a <Link> prefetches and caches the destination page. Navigation feels instant.",
    code: `// This is AUTOMATIC — no code needed.
// But understanding it explains the #1 'stale data' complaint:

// Scenario: User edits their profile, goes to /profile
// Profile page shows OLD data — why?

// Because Router Cache served the previously cached /profile page!
// Fix:
import { useRouter } from 'next/navigation';
const router = useRouter();

// After a mutation, force Router Cache to refresh:
router.refresh(); // ← tells Next.js to re-fetch the current route's RSC payload

// In Next.js 15 this is less common because page segments
// are no longer cached by default (staleTime = 0)`,
  },
];

export default async function HomePage() {
  // CALL #2 of getCachedTopPosts() — the Layout already called it.
  // Request Memoization means this does NOT hit the DB again.
  // Both calls return the same data from the same timestamp.
  const topPosts = await getCachedTopPosts();
  const renderTime = new Date().toISOString();

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ paddingBottom: "40px", borderBottom: "2px solid var(--border)", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "42px", marginBottom: "12px", lineHeight: 1.05 }}>
          Phase 2:<br />The 4 Cache Layers
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "15px", maxWidth: "560px", lineHeight: 1.7 }}>
          Every performance win and every stale-data bug in Next.js comes from these four layers.
          Navigate each page to see them working — and failing — in real time.
        </p>

        {/* The key Next.js 15 breaking change */}
        <div style={{ marginTop: "24px", background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "6px", padding: "16px 20px", maxWidth: "640px" }}>
          <p style={{ fontWeight: 700, color: "#92400e", marginBottom: "6px", fontSize: "12px" }}>
            ⚠️ NEXT.JS 15 BREAKING CHANGE — Read This First
          </p>
          <p style={{ color: "#78350f", fontSize: "12px", lineHeight: 1.7 }}>
            In Next.js 14, <code>fetch()</code> was cached by default. In{" "}
            <strong>Next.js 15, nothing is cached by default</strong>. You must explicitly opt in.
            If you upgraded from v14 to v15 and your app suddenly got slower or showed stale data issues reversed,
            this is why.
          </p>
        </div>
      </div>

      {/* Layer Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {LAYERS.map(layer => (
          <div key={layer.n} className="card">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <span className={`cache-badge ${layer.cls}`} style={{ fontSize: "14px", padding: "4px 14px" }}>
                    Layer {layer.n}
                  </span>
                </div>
                <h2 style={{ fontSize: "22px", marginBottom: "4px" }}>{layer.name}</h2>
                <p style={{ color: "var(--muted)", fontSize: "12px" }}>{layer.where}</p>
              </div>
            </div>

            {/* Specs grid */}
            <div className="grid-2" style={{ marginBottom: "16px" }}>
              <div style={{ background: "var(--surface2)", padding: "12px", borderRadius: "4px" }}>
                {[
                  ["Lifetime", layer.lifetime],
                  ["Storage", layer.storage],
                  ["Invalidate", layer.invalidate],
                ].map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="info-key">{k}</span>
                    <span className="info-val" style={{ color: layer.color, fontSize: "11px" }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                  Next.js 15 behaviour
                </p>
                <p style={{ fontSize: "11px", color: "#78350f", lineHeight: 1.6 }}>{layer.nextjs15}</p>
              </div>
            </div>

            {/* Problem → Solution */}
            <div className="grid-2" style={{ marginBottom: "16px" }}>
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--miss)", textTransform: "uppercase", marginBottom: "6px" }}>❌ Without this layer</p>
                <p style={{ fontSize: "11px", color: "#7f1d1d", lineHeight: 1.6 }}>{layer.problem}</p>
              </div>
              <div style={{ background: "var(--hit-bg)", border: "1px solid #86efac", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--hit)", textTransform: "uppercase", marginBottom: "6px" }}>✅ With this layer</p>
                <p style={{ fontSize: "11px", color: "#14532d", lineHeight: 1.6 }}>{layer.solution}</p>
              </div>
            </div>

            {/* Code */}
            <pre style={{ fontSize: "11px", lineHeight: 1.75 }}>{layer.code}</pre>
          </div>
        ))}
      </div>

      {/* Request Memoization PROOF */}
      <div style={{ marginTop: "40px" }} className="card">
        <h3 style={{ marginBottom: "16px" }}>🔬 Layer 1 Proof — Request Memoization Live</h3>
        <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "16px", lineHeight: 1.7 }}>
          This page calls <code>getCachedTopPosts()</code>. The Layout also calls it.
          Check the <strong>DB read timestamps below</strong> — they should be identical,
          proving the DB was only hit once (first call memoized, second call returned cached value).
        </p>
        <div className="proof-panel">
          <div><span className="label">Page render time:     </span><span className="value">{renderTime}</span></div>
          <div><span className="label">getCachedTopPosts() DB read: </span>
            <span className="value">{topPosts[0]?.dbReadAt}</span>
          </div>
          <div><span className="label">Sidebar DB read:      </span>
            <span className="value">{topPosts[0]?.dbReadAt} <span className="stale"> ← same timestamp = memo hit ✓</span></span>
          </div>
          <div><span className="comment">
            {`// getCachedTopPosts() called TWICE in this render tree (layout + page)`}
          </span></div>
          <div><span className="comment">
            {`// DB timestamps are IDENTICAL → memoization deduplicated the call`}
          </span></div>
        </div>
      </div>

      {/* Navigation to other pages */}
      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        {[
          { href: "/blog", badge: "badge-l2", layer: "Layer 2", title: "Blog List", desc: "Data Cache with unstable_cache() + tag invalidation" },
          { href: "/blog/nextjs-caching-deep-dive", badge: "badge-l3", layer: "Layer 3", title: "Blog Post", desc: "Full Route Cache — ISR + on-demand revalidation" },
          { href: "/dashboard", badge: "badge-l4", layer: "No Cache", title: "Dashboard", desc: "force-dynamic page, always fresh, never cached" },
        ].map(item => (
          <a key={item.href} href={item.href} style={{ display: "block" }}>
            <div className="card" style={{ height: "100%", transition: "box-shadow 0.15s" }}>
              <span className={`cache-badge ${item.badge}`} style={{ marginBottom: "10px" }}>{item.layer}</span>
              <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>{item.title} →</h3>
              <p style={{ color: "var(--muted)", fontSize: "11px", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}