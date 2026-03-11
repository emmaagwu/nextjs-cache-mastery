/**
 * lib/cached-queries.ts
 * ─────────────────────────────────────────────────────────────────────────
 * CACHE LAYER 2: DATA CACHE — wrapping DB queries
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The Data Cache stores the RESULTS of async operations (DB queries, API
 * calls) persistently on the server — across requests, across users,
 * even across deployments (on Vercel).
 *
 * In Next.js 15, the Data Cache is OPT-IN. Nothing is cached by default.
 * You must explicitly ask for caching using:
 *   1. fetch() with { cache: 'force-cache' } or { next: { revalidate: N } }
 *   2. unstable_cache() — for non-fetch operations like DB queries
 *   3. 'use cache' directive — the new Next.js 15/16 API (experimental)
 *
 * THE CRITICAL RULE: Tags are how you invalidate precisely.
 * Instead of revalidating the entire cache, you tag data
 * and then call revalidateTag('that-tag') to bust only what changed.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { unstable_cache } from "next/cache";
import { getAllPosts, getPostBySlug, getCommentsBySlug, getTopPosts } from "./db";

// ─── PATTERN 1: Cache ALL posts with a shared tag ────────────────────────────
// When ANY post changes, call revalidateTag('posts') to bust this cache.
// All pages using getCachedPosts() will re-fetch on next visit.
export const getCachedPosts = unstable_cache(
  async () => {
    console.log("[DATA CACHE] getCachedPosts() — cache MISS, calling DB");
    return getAllPosts();
  },
  ["all-posts"],       // ← cache key (array, can be multi-part)
  {
    tags: ["posts"],   // ← invalidation tag: revalidateTag('posts') busts this
    revalidate: 3600,  // ← also time-based: revalidate every hour regardless
  }
);

// ─── PATTERN 2: Cache a SINGLE post by its slug ──────────────────────────────
// Tag includes the slug so you can bust ONE post without busting all others.
// revalidateTag('post-vercel-edge-explained') only busts THAT post's cache.
// revalidateTag('posts') busts ALL posts (both tags match).
export const getCachedPost = (slug: string) =>
  unstable_cache(
    async () => {
      console.log(`[DATA CACHE] getCachedPost(${slug}) — cache MISS, calling DB`);
      return getPostBySlug(slug);
    },
    [`post-${slug}`],           // ← unique cache key per slug
    {
      tags: ["posts", `post-${slug}`], // ← TWO tags: global + specific
      revalidate: 3600,
    }
  )();

// ─── PATTERN 3: Comments — shorter cache, tag-based invalidation ─────────────
// Comments change more often than posts. We use a shorter revalidate (60s)
// AND a tag so a new comment immediately busts this via revalidateTag.
export const getCachedComments = (slug: string) =>
  unstable_cache(
    async () => {
      console.log(`[DATA CACHE] getCachedComments(${slug}) — cache MISS, calling DB`);
      return getCommentsBySlug(slug);
    },
    [`comments-${slug}`],
    {
      tags: ["comments", `comments-${slug}`],
      revalidate: 60, // ← comments refresh every 60s even without mutation
    }
  )();

// ─── PATTERN 4: Top posts — cached independently ─────────────────────────────
// The "top posts" sidebar is used in layout AND in pages.
// Without caching, every page render would call getTopPosts() separately.
// With unstable_cache, the FIRST call fetches from DB, all others get cache.
// This is the Data Cache working in concert with Request Memoization.
export const getCachedTopPosts = unstable_cache(
  async () => {
    console.log("[DATA CACHE] getCachedTopPosts() — cache MISS, calling DB");
    return getTopPosts();
  },
  ["top-posts"],
  {
    tags: ["posts"],   // ← invalidated when ANY post changes
    revalidate: 300,   // ← 5 minute TTL
  }
);