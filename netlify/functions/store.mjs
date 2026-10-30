// Shared store for the static copy of the site: follow lists, board posts, corrections.
// Data lives in Netlify Blobs under three stores. The claude.ai artifact uses its own store instead.
import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } });
const bad = (msg, status = 400) => ok({ error: msg }, status);
const COLL = { lists: "ltac-lists", board: "ltac-board", corrections: "ltac-corrections" };
const emailOk = e => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 200;
const key = e => e.trim().toLowerCase();
const isAdmin = req => { const k = process.env.ADMIN_KEY; const given = new URL(req.url).searchParams.get("key") || req.headers.get("x-admin-key"); return !!k && given === k; };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,x-admin-key", "access-control-allow-methods": "GET,POST,OPTIONS" } });
  const url = new URL(req.url);
  const c = url.searchParams.get("c");
  if (!COLL[c]) return bad("unknown collection");
  const store = getStore(COLL[c]);

  if (req.method === "GET") {
    if (url.searchParams.get("export") === "1") {
      if (!isAdmin(req)) return bad("admin key required", 403);
      const { blobs } = await store.list();
      const out = [];
      for (const b of blobs) { const v = await store.get(b.key, { type: "json" }); if (v) out.push(v); }
      return ok({ collection: c, count: out.length, items: out });
    }
    if (c === "lists") {
      const e = url.searchParams.get("email"); if (!emailOk(e)) return bad("email required");
      const v = await store.get(key(e), { type: "json" });
      return ok({ exists: !!v, data: v || null });
    }
    if (c === "board") {
      const { blobs } = await store.list();
      const out = [];
      for (const b of blobs) { const v = await store.get(b.key, { type: "json" }); if (v && !v.hidden) out.push(v); }
      out.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
      return ok({ items: out.slice(0, 100) });
    }
    return bad("corrections are write-only without the admin key", 403);
  }

  if (req.method === "POST") {
    let body; try { body = await req.json(); } catch { return bad("json body required"); }
    const now = new Date().toISOString();
    if (c === "lists") {
      const e = body.email; if (!emailOk(e)) return bad("valid email required");
      const k = key(e);
      const cur = (await store.get(k, { type: "json" })) || { email: k, follows: [], created: now, visits: 0 };
      if (Array.isArray(body.follows)) cur.follows = body.follows.filter(x => typeof x === "string").slice(0, 300);
      if (body.touch) cur.visits = (cur.visits || 0) + 1;
      cur.lastSeen = now; cur.updated = now;
      await store.setJSON(k, cur);
      return ok({ ok: true, data: cur });
    }
    const id = now + "-" + Math.random().toString(36).slice(2, 8);
    const rec = { ...body, id, created: now, ip: req.headers.get("x-nf-client-connection-ip") || null };
    if (JSON.stringify(rec).length > 6000) return bad("too long");
    await store.setJSON(id, rec);
    return ok({ ok: true, id });
  }
  return bad("method not allowed", 405);
};

export const config = { path: "/api/store" };
