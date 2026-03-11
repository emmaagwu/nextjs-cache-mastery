/**
 * app/api/revalidate/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * ON-DEMAND REVALIDATION — The CMS webhook pattern
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This is the most important caching pattern for content-driven apps.
 * Instead of waiting for the ISR timer, you tell Next.js EXACTLY when
 * data has changed and which cache entries to bust.
 *
 * REAL-WORLD USAGE:
 *  - Contentful/Sanity/Hygraph publishes a new article
 *  - Their webhook fires POST /api/revalidate with { tag: 'posts' }
 *  - This route calls revalidateTag('posts')
 *  - Next.js marks all 'posts'-tagged cache entries as stale
 *  - Next visitor to /blog gets fresh data (triggers background rebuild)
 *
 * SECURITY: Always protect this endpoint with a secret token.
 * Otherwise anyone can bust your cache and cause a traffic spike.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tag, path, secret } = body;

  // ── SECURITY CHECK ──────────────────────────────────────────────────────
  // In production, validate a secret token to prevent unauthorized cache busting
  // const expectedSecret = process.env.REVALIDATION_SECRET;
  // if (secret !== expectedSecret) {
  //   return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  // }
  // For demo: we skip the secret check so you can test freely

  const results: string[] = [];

  // ── REVALIDATE BY TAG ───────────────────────────────────────────────────
  // revalidateTag busts ALL cache entries (Data Cache + Full Route Cache)
  // that were tagged with this tag — across ALL pages that use that data.
  //
  // Example: revalidateTag('posts') busts:
  //   - getCachedPosts() result (Data Cache)
  //   - getCachedPost('understanding-rsc') result (Data Cache)
  //   - getCachedPost('vercel-edge-explained') result (Data Cache)
  //   - getCachedTopPosts() result (Data Cache)
  //   - The rendered HTML of /blog (Full Route Cache) — cascades
  //   - The rendered HTML of /blog/[every-slug] (Full Route Cache) — cascades
  if (tag) {
    revalidateTag(tag, 'max');
    results.push(`revalidateTag('${tag}') called`);
  }

  // ── REVALIDATE BY PATH ──────────────────────────────────────────────────
  // revalidatePath busts only ONE specific page's Full Route Cache.
  // The Data Cache for the underlying data is NOT busted — only the
  // rendered HTML for this path is marked stale.
  //
  // Use revalidatePath when:
  //   - You know exactly which page changed
  //   - You don't want to bust ALL pages that use the same data
  //
  // Use revalidateTag when:
  //   - Multiple pages use the same data
  //   - You want surgical, data-centric invalidation
  if (path) {
    revalidatePath(path);
    results.push(`revalidatePath('${path}') called`);
  }

  if (!tag && !path) {
    return NextResponse.json(
      { error: "Provide 'tag' or 'path' in request body" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    revalidated: true,
    results,
    timestamp: new Date().toISOString(),
    explanation: {
      revalidateTag: "Busts Data Cache + cascades to Full Route Cache for all tagged entries",
      revalidatePath: "Busts Full Route Cache for one specific path only",
      nextStep: "Refresh the blog page — the DB read timestamp should now be updated",
    },
  });
}

// GET endpoint to check what tags are available (for the UI demo)
export async function GET() {
  return NextResponse.json({
    availableTags: ["posts", "comments"],
    availablePaths: ["/blog", "/blog/understanding-rsc", "/blog/vercel-edge-explained", "/blog/nextjs-caching-deep-dive"],
    usage: "POST /api/revalidate with { tag: 'posts' } or { path: '/blog' }",
  });
}