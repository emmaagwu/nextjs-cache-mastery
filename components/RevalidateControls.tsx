"use client";

import { useState } from "react";

interface Props {
  slug?: string;
}

export default function RevalidateControls({ slug }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function revalidate(type: "tag-posts" | "tag-post" | "path-blog" | "path-post") {
    setLoading(true);
    setResult(null);

    let body: Record<string, string> = {};

    // Each button demonstrates a different invalidation strategy
    if (type === "tag-posts") {
      // Busts ALL posts data and ALL rendered pages that use posts data
      body = { tag: "posts" };
    } else if (type === "tag-post" && slug) {
      // Busts only THIS post's data (surgical — other posts unaffected)
      body = { tag: `post-${slug}` };
    } else if (type === "path-blog") {
      // Busts only the /blog page's rendered HTML
      // Does NOT bust individual post pages or the Data Cache
      body = { path: "/blog" };
    } else if (type === "path-post" && slug) {
      // Busts only this one post page's rendered HTML
      body = { path: `/blog/${slug}` };
    }

    try {
      const res = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "#f0f4ff",
      border: "2px solid var(--c2)",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px",
    }}>
      <p style={{ fontWeight: 700, color: "var(--c2)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
        🧪 Live Cache Busting Controls
      </p>
      <p style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "16px", lineHeight: 1.6 }}>
        Click a button, then <strong>hard refresh</strong> the page (Cmd+Shift+R).
        Watch the "DB read at" timestamp change — that's the cache being busted.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>

        {/* Button 1: revalidateTag('posts') — broadest */}
        <button
          className="btn btn-l2"
          onClick={() => revalidate("tag-posts")}
          disabled={loading}
          style={{ textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "12px" }}
        >
          <span style={{ fontWeight: 700 }}>revalidateTag('posts')</span>
          <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--muted)" }}>
            Busts ALL posts data + ALL post pages
          </span>
        </button>

        {/* Button 2: revalidateTag('post-slug') — surgical */}
        {slug && (
          <button
            className="btn btn-l2"
            onClick={() => revalidate("tag-post")}
            disabled={loading}
            style={{ textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "12px" }}
          >
            <span style={{ fontWeight: 700 }}>revalidateTag('post-{slug}')</span>
            <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--muted)" }}>
              Busts only THIS post's cache (surgical)
            </span>
          </button>
        )}

        {/* Button 3: revalidatePath('/blog') */}
        <button
          className="btn"
          onClick={() => revalidate("path-blog")}
          disabled={loading}
          style={{ color: "var(--c3)", borderColor: "var(--c3)", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "12px" }}
        >
          <span style={{ fontWeight: 700 }}>revalidatePath('/blog')</span>
          <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--muted)" }}>
            Busts /blog page HTML only (Full Route Cache)
          </span>
        </button>

        {/* Button 4: revalidatePath('/blog/slug') */}
        {slug && (
          <button
            className="btn"
            onClick={() => revalidate("path-post")}
            disabled={loading}
            style={{ color: "var(--c3)", borderColor: "var(--c3)", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "12px" }}
          >
            <span style={{ fontWeight: 700 }}>revalidatePath('/blog/{slug}')</span>
            <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--muted)" }}>
              Busts this post page HTML only
            </span>
          </button>
        )}
      </div>

      {/* Tag vs Path comparison */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "4px", padding: "12px", fontSize: "11px", marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, marginBottom: "8px" }}>revalidateTag vs revalidatePath — which to use?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--c2)", fontWeight: 700, marginBottom: "4px" }}>revalidateTag('posts')</div>
            <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Data-centric. Busts the underlying data AND any pages that rendered that data.
              Use when content changed (CMS update, DB write).
            </div>
          </div>
          <div>
            <div style={{ color: "var(--c3)", fontWeight: 700, marginBottom: "4px" }}>revalidatePath('/blog')</div>
            <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Page-centric. Busts only the rendered HTML for one path.
              Data Cache is untouched. Use for layout or template changes.
            </div>
          </div>
        </div>
      </div>

      {/* Result display */}
      {loading && (
        <div style={{ fontSize: "12px", color: "var(--c2)", fontStyle: "italic" }}>
          Calling revalidation API...
        </div>
      )}
      {result && !loading && (
        <div style={{
          background: result.error ? "var(--miss-bg)" : "var(--hit-bg)",
          border: `1px solid ${result.error ? "#fca5a5" : "#86efac"}`,
          borderRadius: "4px",
          padding: "12px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
        }}>
          {result.error ? (
            <div style={{ color: "var(--miss)" }}>❌ {result.error}</div>
          ) : (
            <>
              <div style={{ color: "var(--hit)", fontWeight: 700, marginBottom: "8px" }}>✅ Cache busted!</div>
              {result.results?.map((r: string, i: number) => (
                <div key={i} style={{ color: "var(--hit)", marginBottom: "2px" }}>→ {r}</div>
              ))}
              <div style={{ color: "var(--muted)", marginTop: "8px" }}>
                Now hard-refresh (Cmd+Shift+R) to see the new DB timestamp
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}