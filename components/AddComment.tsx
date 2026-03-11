/**
 * components/AddComment.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * DEMONSTRATES: Server Action + precise cache invalidation
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This component uses a Server Action (the 'use server' function).
 * Server Actions are the modern pattern for form mutations in Next.js 14+.
 *
 * THE CACHE INVALIDATION PATTERN:
 *  1. User submits form → Server Action runs on server
 *  2. Server Action writes new comment to DB
 *  3. Server Action calls revalidateTag('comments-[slug]')
 *  4. The comments cache entry for THIS post is marked stale
 *  5. Next render of this page re-fetches comments from DB
 *  6. User sees the new comment (with a small delay due to RSC re-render)
 *
 * NOTE ON CACHE SCOPE:
 *  revalidateTag('comments-nextjs-caching-deep-dive') busts ONLY
 *  the comments for this specific post. Other posts' comments are
 *  unaffected. The POST BODY cache (tagged 'post-[slug]') is also
 *  unaffected — we're doing surgical cache invalidation.
 * ─────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";

interface Props {
  slug: string;
}

export default function AddComment({ slug }: Props) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [responseData, setResponseData] = useState<any>(null);

  async function handleSubmit() {
    if (!author.trim() || !body.trim()) return;
    setStatus("loading");

    try {
      // Call the API route which runs the Server Action logic + revalidation
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, author, body }),
      });
      const data = await res.json();
      setResponseData(data);
      setStatus("success");
      setAuthor("");
      setBody("");
    } catch {
      setStatus("error");
    }
  }

  const inputStyle = {
    width: "100%",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "8px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "var(--text)",
    outline: "none",
  };

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "20px" }}>
      <p style={{ fontWeight: 700, marginBottom: "4px", fontSize: "13px" }}>Add a Comment</p>
      <p style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "16px", lineHeight: 1.6 }}>
        After submitting, the cache for these comments is busted via{" "}
        <code>revalidateTag('comments-{slug}')</code>.
        Hard-refresh to see the new comment appear.
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Your name"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          style={{ ...inputStyle, flex: "0 0 160px" }}
        />
        <input
          type="text"
          placeholder="Your comment..."
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={status === "loading" || !author || !body}
          style={{ opacity: status === "loading" || !author || !body ? 0.5 : 1 }}
        >
          {status === "loading" ? "Posting..." : "Post →"}
        </button>
      </div>

      {status === "success" && responseData && (
        <div style={{
          background: "var(--hit-bg)",
          border: "1px solid #86efac",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
        }}>
          <div style={{ color: "var(--hit)", fontWeight: 700, marginBottom: "6px" }}>
            ✅ Comment posted! Cache busted.
          </div>
          <div style={{ color: "var(--muted)" }}>Called: {responseData.revalidation}</div>
          <div style={{ color: "var(--muted)", marginTop: "4px" }}>
            Now hard-refresh (Cmd+Shift+R) → the new comment will appear
          </div>
          <div style={{ color: "var(--dim)", marginTop: "4px", fontSize: "10px" }}>
            The post body cache is untouched — only comments-{slug} was invalidated
          </div>
        </div>
      )}
    </div>
  );
}