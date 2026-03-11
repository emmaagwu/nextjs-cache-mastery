/**
 * app/layout.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: CACHE LAYER 1 — Request Memoization
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This layout AND the pages below it BOTH call getCachedTopPosts().
 * Request Memoization ensures that even though the function is called
 * twice in the same render pass, the DB is only hit ONCE.
 *
 * The second call returns the memoized result from the first call.
 * This memoization is cleared after the response is sent — it's
 * per-render only (unlike the Data Cache, which persists across requests).
 * ─────────────────────────────────────────────────────────────────────────
 */
import "./globals.css";
import { getCachedTopPosts } from "@/lib/cached-queries";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CALL #1 of getCachedTopPosts() in this render tree
  // ↳ If Data Cache is cold: hits DB, stores result in both Data Cache + memoization
  // ↳ If Data Cache is warm: returns cached data immediately (no DB call)
  const topPosts = await getCachedTopPosts();

  return (
    <html lang="en">
      <body>
        <nav>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
            <a href="/" style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 900, color: "#f5f2eb", letterSpacing: "-0.02em" }}>
              CacheLab
            </a>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              {[
                { href: "/", label: "Home" },
                { href: "/blog", label: "Blog (Layer 3)" },
                { href: "/dashboard", label: "Dashboard (No Cache)" },
              ].map(link => (
                <a key={link.href} href={link.href} style={{ color: "#a8a09a", fontSize: "12px", fontWeight: 500 }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* SIDEBAR LAYOUT */}
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "40px", paddingTop: "0" }}>
          <div>{children}</div>

          {/* SIDEBAR — uses getCachedTopPosts() result from above */}
          <aside style={{ paddingTop: "48px" }}>
            <div className="card" style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <div className="cache-badge badge-l1" style={{ marginBottom: "8px" }}>Layer 1 — Request Memoization</div>
                <h3 style={{ fontSize: "14px" }}>Top Posts</h3>
                <p style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px" }}>
                  This sidebar AND the page both call getCachedTopPosts(). The DB is only queried once per render thanks to memoization.
                </p>
              </div>
              {topPosts.map(post => (
                <a key={post.id} href={`/blog/${post.slug}`} style={{ display: "block", padding: "8px 0", borderBottom: "1px dashed var(--border)", fontSize: "12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "2px" }}>{post.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: "11px" }}>{post.views.toLocaleString()} views</div>
                </a>
              ))}
              <div style={{ marginTop: "12px", background: "var(--surface2)", padding: "10px", borderRadius: "4px", fontSize: "10px" }}>
                <span style={{ color: "var(--muted)" }}>DB read at: </span>
                <span style={{ color: "var(--c1)", fontWeight: 700, wordBreak: "break-all" }}>
                  {topPosts[0]?.dbReadAt ?? "no timestamp"}
                </span>
                <div style={{ color: "var(--dim)", marginTop: "4px" }}>
                  ← Same timestamp as page body = memoization worked
                </div>
              </div>
            </div>

            {/* Layer Legend */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "12px" }}>The 4 Cache Layers</div>
              {[
                { n: 1, label: "Request Memoization", cls: "badge-l1", scope: "Per render" },
                { n: 2, label: "Data Cache", cls: "badge-l2", scope: "Persistent server" },
                { n: 3, label: "Full Route Cache", cls: "badge-l3", scope: "CDN/disk (static)" },
                { n: 4, label: "Router Cache", cls: "badge-l4", scope: "Client browser" },
              ].map(l => (
                <div key={l.n} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <span className={`cache-badge ${l.cls}`}>{l.n}</span>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600 }}>{l.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>{l.scope}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}