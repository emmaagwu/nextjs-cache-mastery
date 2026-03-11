"use client";
// ─────────────────────────────────────────────────────────────────────────
// components/RouterCacheDemo.tsx — CLIENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────
//
// DEMONSTRATES: CACHE LAYER 4 — Router Cache
//
// WHY "use client" IS REQUIRED HERE:
// The Router Cache lives entirely in the browser's memory (JavaScript heap).
// To interact with it — read it, clear it, or force a refresh — you need
// access to Next.js's client-side router (useRouter hook).
// Hooks only work in Client Components. Server Components have no router.
//
// WHAT THE ROUTER CACHE IS:
// When a user hovers over a <Link>, Next.js prefetches that page's
// RSC (React Server Component) payload and stores it in memory.
// The next time the user navigates there, they get the cached payload
// instantly — no server round-trip at all.
//
// HOW IT CONNECTS TO THE OTHER 3 CACHE LAYERS:
//
//   Layer 1 — Request Memoization  → server, per render, automatic
//   Layer 2 — Data Cache           → server, persistent, opt-in
//   Layer 3 — Full Route Cache     → server/CDN, HTML on disk, ISR
//   Layer 4 — Router Cache         → BROWSER MEMORY, per session ← YOU ARE HERE
//
// THE LIFETIME:
//   - Page segments: 30 seconds (Next.js 14) / 0 seconds (Next.js 15 default)
//   - Layout segments: 5 minutes
//   - Cleared by: hard refresh, router.refresh(), tab close, or navigation
//     to a route with revalidatePath() called on it
//
// THE #1 BUG IT CAUSES:
//   User edits their profile → gets redirected to /profile
//   Profile page shows OLD data — the Router Cache served a stale snapshot.
//   Fix: call router.refresh() after any mutation that changes page data.
//
// NEXT.JS 15 CHANGE:
//   In v14, page segments were cached for 30s by default.
//   In v15, page segments are NOT cached by default (staleTime = 0).
//   Layouts are still cached for 5 minutes.
//   This means the "stale profile" bug is less common in v15 — but
//   layouts can still serve stale data for up to 5 minutes.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function RouterCacheDemo() {
  const router = useRouter();

  // We track what action the user took and what the result was
  const [log, setLog] = useState<{ time: string; action: string; result: string; color: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Adds a line to the terminal log
  const addLog = useCallback((action: string, result: string, color: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLog((prev) => [{ time, action, result, color }, ...prev].slice(0, 8));
  }, []);

  // ── ACTION 1: router.refresh() ────────────────────────────────────────
  // This is the main fix for the "stale data after mutation" bug.
  // What it does:
  //   1. Tells Next.js to re-fetch the current route's RSC payload from server
  //   2. Clears the Router Cache entry for the CURRENT route only
  //   3. The server re-runs the Server Component (fresh DB read)
  //   4. React merges the new payload without a full page reload
  // What it does NOT do:
  //   - Does not clear other routes' cache entries
  //   - Does not reload the page (no white flash)
  //   - Does not clear the Data Cache (Layer 2) on the server
  async function handleRouterRefresh() {
    setIsRefreshing(true);
    addLog(
      "router.refresh()",
      "Re-fetching current route RSC payload from server...",
      "#6366f1"
    );
    router.refresh();
    // Small delay so the user can see the log before the page re-renders
    await new Promise((r) => setTimeout(r, 500));
    setIsRefreshing(false);
    addLog(
      "router.refresh() complete",
      "Router Cache for this route cleared. Server re-rendered. DOM updated.",
      "#10b981"
    );
  }

  // ── ACTION 2: Simulate the stale data bug ────────────────────────────
  // This shows WHAT GOES WRONG without router.refresh()
  function handleSimulateBug() {
    addLog(
      "router.push('/dashboard') [no refresh]",
      "Navigated back using Router Cache — may show stale data!",
      "#f59e0b"
    );
    addLog(
      "Problem",
      "The dashboard RSC payload was cached on first visit. User sees old data until cache expires or router.refresh() is called.",
      "#ef4444"
    );
  }

  // ── ACTION 3: Simulate the correct pattern ───────────────────────────
  // Call router.refresh() BEFORE navigating back, or after a mutation.
  function handleCorrectPattern() {
    addLog(
      "await updateProfile(data)  [Server Action]",
      "Mutation complete. Now clearing Router Cache before redirect...",
      "#a855f7"
    );
    addLog(
      "router.refresh()  [after mutation]",
      "Router Cache for current route cleared.",
      "#6366f1"
    );
    addLog(
      "router.push('/dashboard')",
      "✅ Navigated to dashboard. Fresh RSC payload fetched. User sees new data.",
      "#10b981"
    );
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "24px",
        marginTop: "24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div
          className="cache-badge badge-l4"
          style={{ marginBottom: "10px" }}
        >
          Layer 4 — Router Cache (Client Browser)
        </div>
        <h3 style={{ fontSize: "16px", marginBottom: "6px" }}>
          Router Cache — The Client-Side Layer
        </h3>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "12px",
            lineHeight: 1.7,
          }}
        >
          Unlike Layers 1–3 which live on the server, the Router Cache lives
          in your browser's JavaScript memory. It stores RSC payloads for
          routes you've visited or hovered over (prefetch). It's why
          navigating back to a page feels instant — and also why you sometimes
          see stale data after a mutation.
        </p>
      </div>

      {/* The lifetime table */}
      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "14px 16px",
          marginBottom: "20px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div
          style={{
            color: "var(--muted)",
            textTransform: "uppercase",
            fontSize: "10px",
            letterSpacing: "0.06em",
            marginBottom: "10px",
          }}
        >
          Cache Lifetime by Segment Type
        </div>
        {[
          {
            type: "Page segment (Next.js 14)",
            lifetime: "30 seconds",
            note: "Stale after 30s, re-fetched on next navigation",
            color: "var(--c4)",
          },
          {
            type: "Page segment (Next.js 15)",
            lifetime: "0 seconds (default)",
            note: "Not cached — always re-fetches on navigation",
            color: "var(--success)",
          },
          {
            type: "Layout segment",
            lifetime: "5 minutes",
            note: "Shared layouts stay cached longer — can serve stale data",
            color: "var(--warn)",
          },
          {
            type: "Prefetched (Link hover)",
            lifetime: "5 minutes",
            note: "Stored when user hovers <Link> — instant navigation",
            color: "var(--c4)",
          },
        ].map((row) => (
          <div
            key={row.type}
            style={{
              display: "grid",
              gridTemplateColumns: "220px 140px 1fr",
              gap: "12px",
              padding: "7px 0",
              borderBottom: "1px dashed var(--border)",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text)" }}>{row.type}</span>
            <span style={{ color: row.color, fontWeight: 700 }}>
              {row.lifetime}
            </span>
            <span style={{ color: "var(--dim)" }}>{row.note}</span>
          </div>
        ))}
      </div>

      {/* The bug scenario */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {/* Wrong pattern */}
        <div
          style={{
            background: "var(--miss-bg)",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            padding: "14px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--miss)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            ❌ The Bug Pattern
          </p>
          <pre
            style={{
              fontSize: "10px",
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#7f1d1d",
              lineHeight: 1.8,
            }}
          >{`// Server Action
async function updateProfile(data) {
  await db.user.update({ ... });
  // ← Mutation done, but Router
  //   Cache still has old data
  redirect('/dashboard');
  // User sees STALE dashboard ❌
}`}</pre>
        </div>

        {/* Correct pattern */}
        <div
          style={{
            background: "var(--hit-bg)",
            border: "1px solid #86efac",
            borderRadius: "6px",
            padding: "14px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--hit)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            ✅ The Fix Pattern
          </p>
          <pre
            style={{
              fontSize: "10px",
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#14532d",
              lineHeight: 1.8,
            }}
          >{`// Client Component
async function handleSave() {
  await updateProfile(data);
  router.refresh(); // ← clears Router
  // Cache for current route
  router.push('/dashboard');
  // User sees FRESH dashboard ✅
}`}</pre>
        </div>
      </div>

      {/* Interactive controls */}
      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "12px",
          }}
        >
          🧪 Interactive Demo — Click to see what happens
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* The fix */}
          <button
            className="btn"
            onClick={handleRouterRefresh}
            disabled={isRefreshing}
            style={{
              color: "var(--c4)",
              borderColor: "var(--c4)",
              opacity: isRefreshing ? 0.5 : 1,
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "12px 16px",
              height: "auto",
            }}
          >
            <span style={{ fontWeight: 700 }}>router.refresh()</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 400,
                color: "var(--muted)",
                marginTop: "2px",
              }}
            >
              Clear Router Cache for this route
            </span>
          </button>

          {/* Simulate the bug */}
          <button
            className="btn"
            onClick={handleSimulateBug}
            style={{
              color: "var(--miss)",
              borderColor: "var(--miss)",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "12px 16px",
              height: "auto",
            }}
          >
            <span style={{ fontWeight: 700 }}>Simulate Bug</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 400,
                color: "var(--muted)",
                marginTop: "2px",
              }}
            >
              Navigate without clearing cache
            </span>
          </button>

          {/* Simulate correct pattern */}
          <button
            className="btn"
            onClick={handleCorrectPattern}
            style={{
              color: "var(--hit)",
              borderColor: "var(--hit)",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "12px 16px",
              height: "auto",
            }}
          >
            <span style={{ fontWeight: 700 }}>Correct Pattern</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 400,
                color: "var(--muted)",
                marginTop: "2px",
              }}
            >
              Mutation → refresh → navigate
            </span>
          </button>
        </div>
      </div>

      {/* Terminal log */}
      <div
        style={{
          background: "#050509",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "16px",
          minHeight: "120px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
        }}
      >
        <div
          style={{
            color: "var(--dim)",
            marginBottom: "10px",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Event Log
        </div>
        {log.length === 0 ? (
          <div
            style={{
              color: "var(--dim)",
              fontStyle: "italic",
              lineHeight: 2,
            }}
          >
            Click a button above to see the Router Cache in action...
          </div>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr",
                gap: "12px",
                marginBottom: "6px",
                opacity: 1 - i * 0.1,
              }}
            >
              <span style={{ color: "var(--dim)" }}>{entry.time}</span>
              <div>
                <span style={{ color: entry.color, fontWeight: 700 }}>
                  {entry.action}
                </span>
                <span style={{ color: "var(--muted)", marginLeft: "8px" }}>
                  — {entry.result}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* How it connects to all 4 layers */}
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          background: "var(--surface2)",
          borderRadius: "6px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          lineHeight: 2,
        }}
      >
        <div
          style={{
            color: "var(--muted)",
            textTransform: "uppercase",
            fontSize: "10px",
            letterSpacing: "0.06em",
            marginBottom: "8px",
          }}
        >
          How a "refresh" flows through all 4 cache layers
        </div>
        {[
          {
            label: "router.refresh() called",
            note: "Layer 4 (Router Cache) entry for this route is cleared",
            color: "var(--c4)",
          },
          {
            label: "Next.js fetches fresh RSC payload from server",
            note: "HTTP request to the server",
            color: "var(--muted)",
          },
          {
            label: "Server checks Full Route Cache (Layer 3)",
            note: "If ISR cache is still fresh → returns cached HTML (no DB call)",
            color: "var(--c3)",
          },
          {
            label: "If Layer 3 is stale → checks Data Cache (Layer 2)",
            note: "If Data Cache hit → uses cached query result (no DB call)",
            color: "var(--c2)",
          },
          {
            label: "If Layer 2 is stale → hits database",
            note: "Request Memoization (Layer 1) deduplicates within this render",
            color: "var(--c1)",
          },
          {
            label: "Fresh RSC payload returned → Router Cache updated",
            note: "React merges the new UI without a full page reload",
            color: "var(--success)",
          },
        ].map((step, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span style={{ color: "var(--dim)" }}>{i + 1}.</span>
            <div>
              <span style={{ color: step.color, fontWeight: 700 }}>
                {step.label}
              </span>
              <span style={{ color: "var(--dim)", marginLeft: "8px" }}>
                ← {step.note}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}