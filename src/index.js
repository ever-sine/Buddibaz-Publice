const ROUTES = new Set(["login", "me", "answer", "logout"]);
const METHODS = { login: "POST", me: "GET", answer: "POST", logout: "POST" };

function jsonError(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function backendUrl(env) {
  const raw = String(env.NGROK_BACKEND_URL || "").trim().replace(/\/+$/, "");
  let url;
  try { url = new URL(raw); } catch { return null; }
  // Current ngrok free domains may end in .dev or .app. Restrict to ngrok hosts only.
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/") return null;
  if (!/(^|\.)ngrok-free\.(app|dev)$|(^|\.)ngrok\.(app|io)$/i.test(url.hostname)) return null;
  return url;
}

function sessionCookieFrom(request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)bb_public_session=([^;]+)/);
  return m ? m[1] : "";
}

async function proxyPublicApi(request, env, route) {
  if (!ROUTES.has(route)) return jsonError(404, "Unknown public route");
  if (request.method !== METHODS[route]) return jsonError(405, "Method not allowed");
  const base = backendUrl(env);
  if (!base) return jsonError(503, "NGROK_BACKEND_URL is not configured correctly.");

  const incoming = new URL(request.url);
  const upstream = new URL(`/api/public/${route}`, base);
  if (route === "me") upstream.searchParams.set("show", incoming.searchParams.get("show") || "");

  const headers = new Headers({
    "Accept": "application/json",
    "ngrok-skip-browser-warning": "true",
    "X-Forwarded-Proto": "https"
  });
  if (route !== "me") headers.set("Content-Type", "application/json");
  const csrf = request.headers.get("X-CSRF-Token");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const session = sessionCookieFrom(request);
  if (session) headers.set("Cookie", `bb_public_session=${session}`);
  // Deliberately do not forward browser Origin/Referer. The Node backend sees
  // this trusted server-to-server proxy request rather than a cross-origin browser POST.

  let body;
  if (route !== "me") {
    body = await request.text();
    if (body.length > 8192) return jsonError(413, "Request too large");
  }

  let response;
  try {
    response = await fetch(upstream.toString(), { method: request.method, headers, body, redirect: "manual" });
  } catch {
    return jsonError(502, "Buddhibaz server unavailable. Check the PC and ngrok.");
  }
  if (response.status >= 300 && response.status < 400) return jsonError(502, "Unexpected backend redirect");

  const out = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.match(/^bb_public_session=([^;]*)/i);
  if (cookie) {
    const age = setCookie.match(/Max-Age=(\d+)/i);
    const maxAge = age ? `; Max-Age=${Math.min(86400, Number(age[1]))}` : "";
    out.set("Set-Cookie", `bb_public_session=${cookie[1]}; Path=/; HttpOnly; Secure; SameSite=Strict${maxAge}`);
  }
  return new Response(response.body, { status: response.status, headers: out });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/public\/(login|me|answer|logout)\/?$/);
    if (m) return proxyPublicApi(request, env, m[1]);
    return env.ASSETS.fetch(request);
  }
};
