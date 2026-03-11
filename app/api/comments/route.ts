/**
 * app/api/comments/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * POST a new comment → write to DB → revalidate comment cache only
 * ─────────────────────────────────────────────────────────────────────────
 *
 * REVALIDATETAG UPDATE (as of Next.js docs Feb 2026):
 * The single-argument form revalidateTag(tag) is now DEPRECATED.
 * The new signature requires a second argument: the revalidation profile.
 *
 * TWO OPTIONS:
 *
 * Option A — profile="max" (recommended for most cases):
 *   revalidateTag('comments-slug', 'max')
 *   → Uses stale-while-revalidate semantics.
 *   → The cache entry is marked STALE, not immediately deleted.
 *   → The next user to visit gets the stale content immediately (fast).
 *   → Fresh data is fetched IN THE BACKGROUND for the user after them.
 *   → Best for: comments, blog posts, product pages — content where a
 *     one-request delay in freshness is acceptable.
 *
 * Option B — { expire: 0 } (for webhooks / third-party systems):
 *   revalidateTag('comments-slug', { expire: 0 })
 *   → Expires the cache entry IMMEDIATELY (blocking revalidate).
 *   → The very next request is a cache MISS — it fetches fresh data
 *     before returning to the user (slower, but always fresh).
 *   → Best for: webhooks from external systems (Stripe, Contentful,
 *     GitHub) that call your route handler and need immediate expiry.
 *
 * FOR THIS ROUTE (user posting a comment):
 * We use profile="max" because:
 *   - The user who just posted already sees their comment optimistically
 *     (the client can show it immediately via useOptimistic or local state)
 *   - A one-request delay before other users see it is perfectly fine
 *   - stale-while-revalidate is faster and cheaper than a blocking miss
 * ─────────────────────────────────────────────────────────────────────────
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { addComment } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { slug, author, body } = await request.json();

  if (!slug || !author || !body) {
    return NextResponse.json(
      { error: "slug, author, body required" },
      { status: 400 }
    );
  }

  // 1. Write to DB
  const comment = await addComment(slug, author, body);

  // 2. Invalidate ONLY the comments cache for this post.
  //    "max" = stale-while-revalidate: current user gets stale content
  //    instantly, next user gets the freshly rebuilt content.
  //    The post body cache (tagged 'posts', 'post-[slug]') is completely
  //    unaffected — surgical invalidation, exactly as intended.
  revalidateTag(`comments-${slug}`, "max");

  return NextResponse.json({
    success: true,
    comment,
    revalidation: `revalidateTag('comments-${slug}', 'max')`,
    explanation: {
      busted: [`comments-${slug}`],
      untouched: [`post-${slug}`, "posts", "top-posts"],
      reason: "Only comment data changed — post body cache is unaffected",
      profile: "max — stale-while-revalidate, not a blocking cache miss",
    },
  });
}