/**
 * lib/db.ts — Simulated Database
 * ─────────────────────────────────────────────────────────────────────────
 * In a real app this would be Prisma + Vercel Postgres.
 * Here we use in-memory data with timestamps embedded in every record.
 * WHY TIMESTAMPS? Because the entire point of caching demos is proving
 * WHEN data was fetched. If you see the same timestamp across 10 page
 * loads, the cache is working. If the timestamp changes, it re-fetched.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Post = {
  id: string;
  slug: string;
  title: string;
  body: string;
  author: string;
  category: string;
  views: number;
  dbReadAt: string; // timestamp of when this record was "read from DB"
};

export type Comment = {
  id: string;
  postSlug: string;
  author: string;
  body: string;
  createdAt: string;
};

// The "database" — records include a fetch timestamp so cache hits are visible
const POSTS: Post[] = [
  {
    id: "1",
    slug: "understanding-rsc",
    title: "Understanding React Server Components",
    body: "React Server Components run exclusively on the server. They can access databases, file systems, and secrets directly. They produce zero JavaScript for the client — only the rendered HTML/RSC payload is sent over the wire.",
    author: "Guillermo Rauch",
    category: "React",
    views: 12847,
    dbReadAt: "",
  },
  {
    id: "2",
    slug: "vercel-edge-explained",
    title: "Vercel Edge Functions Explained",
    body: "Edge Functions run on V8 isolates at the network edge — not in Node.js containers. They start in under 1ms globally, can read geo data from every request, and run before your cache. Perfect for auth, redirects, and A/B tests.",
    author: "Lee Robinson",
    category: "Infrastructure",
    views: 9231,
    dbReadAt: "",
  },
  {
    id: "3",
    slug: "nextjs-caching-deep-dive",
    title: "The 4 Next.js Cache Layers",
    body: "Next.js has four distinct caches: Request Memoization (per-render deduplication), Data Cache (persistent server-side), Full Route Cache (pre-rendered HTML), and Router Cache (client-side navigation). Understanding all four is the difference between a fast app and an expensive one.",
    author: "Tim Neutkens",
    category: "Next.js",
    views: 24601,
    dbReadAt: "",
  },
];

let comments: Comment[] = [
  { id: "c1", postSlug: "nextjs-caching-deep-dive", author: "Alice", body: "This changed how I think about fetching!", createdAt: new Date().toISOString() },
  { id: "c2", postSlug: "understanding-rsc", author: "Bob", body: "RSC are still confusing to me but this helped.", createdAt: new Date().toISOString() },
];

// Simulate a DB read with artificial latency (100ms = realistic Postgres RTT)
async function simulateDbLatency() {
  await new Promise((r) => setTimeout(r, 100));
}

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export async function getAllPosts(): Promise<Post[]> {
  await simulateDbLatency();
  const fetchedAt = new Date().toISOString();
  console.log(`[DB] getAllPosts() called at ${fetchedAt}`);
  return POSTS.map((p) => ({ ...p, dbReadAt: fetchedAt }));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  await simulateDbLatency();
  const fetchedAt = new Date().toISOString();
  console.log(`[DB] getPostBySlug(${slug}) called at ${fetchedAt}`);
  const post = POSTS.find((p) => p.slug === slug);
  return post ? { ...post, dbReadAt: fetchedAt } : null;
}

export async function getCommentsBySlug(slug: string): Promise<Comment[]> {
  await simulateDbLatency();
  const fetchedAt = new Date().toISOString();
  console.log(`[DB] getCommentsBySlug(${slug}) called at ${fetchedAt}`);
  return comments.filter((c) => c.postSlug === slug);
}

export async function getTopPosts(): Promise<Post[]> {
  await simulateDbLatency();
  const fetchedAt = new Date().toISOString();
  console.log(`[DB] getTopPosts() called at ${fetchedAt}`);
  return [...POSTS]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((p) => ({ ...p, dbReadAt: fetchedAt }));
}

export async function addComment(postSlug: string, author: string, body: string): Promise<Comment> {
  await simulateDbLatency();
  const comment: Comment = {
    id: `c${Date.now()}`,
    postSlug,
    author,
    body,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  console.log(`[DB] addComment() — new comment on ${postSlug}`);
  return comment;
}