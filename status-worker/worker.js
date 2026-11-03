// Cloudflare Worker that remembers when your computer last checked in.
//
//   POST /ping   (Authorization: Bearer <PING_TOKEN>)  -> "I'm at my puter"
//   POST /away   (Authorization: Bearer <PING_TOKEN>)  -> "I'm away" right now
//   GET  /status                                        -> { online, last_seen }
//
// You count as online if the last ping was within ONLINE_WINDOW_MS.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (pathname === "/status" && req.method === "GET") {
      const last = Number((await env.STATUS.get("last_seen")) || 0);
      return json({ online: Date.now() - last < ONLINE_WINDOW_MS, last_seen: last || null });
    }

    if ((pathname === "/ping" || pathname === "/away") && req.method === "POST") {
      if (!env.PING_TOKEN || req.headers.get("Authorization") !== `Bearer ${env.PING_TOKEN}`) {
        return json({ error: "unauthorized" }, 401);
      }
      if (pathname === "/ping") {
        await env.STATUS.put("last_seen", String(Date.now()));
      } else {
        // keep the old timestamp around for "last seen", but mark it stale
        const last = Number((await env.STATUS.get("last_seen")) || 0);
        await env.STATUS.put("last_seen", String(Math.min(last, Date.now() - ONLINE_WINDOW_MS - 1)));
      }
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
