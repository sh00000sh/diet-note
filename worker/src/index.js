// 식단 노트 서버 (Cloudflare Worker)
// 1) /ai/json, /ai/text : 앱에서 보낸 글·사진을 Claude API로 보내 칼로리를 계산 (API 키는 여기에만 있음)
// 2) 30분마다 : 알림 켠 사람에게 물·식사 기록·운동 시간 알림 보내기
import { deserializeVapidKeys, sendPushNotification } from "web-push-browser";

const DEFAULT_MODEL = "claude-sonnet-5-5";

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return json({ ok: true }, 200, cors);
      if (req.method === "POST" && (url.pathname === "/ai/json" || url.pathname === "/ai/text")) {
        const user = await verifyUser(req, env);
        if (!user) return json({ code: "not_signed_in", message: "로그인이 필요해요" }, 401, cors);
        const allowed = await bumpUsage(env, user.id);
        if (!allowed) return json({ code: "rate_limited", message: "오늘 AI 사용 한도를 다 썼어요. 내일 다시 써주세요" }, 429, cors);
        const body = await req.json();
        const prompt = String(body.prompt || "").slice(0, 6000);
        if (!prompt) return json({ code: "invalid_argument", message: "내용이 비어 있어요" }, 400, cors);
        const text = await askClaude(env, prompt, body.image);
        if (url.pathname === "/ai/text") return json({ text }, 200, cors);
        const obj = parseJson(text);
        if (!obj) return json({ code: "bad_output", message: "결과를 읽지 못했어요", text }, 502, cors);
        return json(obj, 200, cors);
      }
      if (req.method === "POST" && url.pathname === "/push/test") {
        const user = await verifyUser(req, env);
        if (!user) return json({ code: "not_signed_in" }, 401, cors);
        const subs = await sb(env, `push_subs?user_id=eq.${user.id}&select=*`);
        let sent = 0;
        for (const s of subs) if (await push(env, s, { title: "알림이 잘 와요 👍", body: "정해둔 시간에 이렇게 알려드릴게요", url: "./" })) sent++;
        return json({ sent }, 200, cors);
      }
      return json({ code: "not_found" }, 404, cors);
    } catch (e) {
      return json({ code: "server_error", message: String(e && e.message || e) }, 500, cors);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
};

// ---------- 공통 ----------
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allow = (env.ALLOWED_ORIGIN || "*").split(",").map(s => s.trim());
  const ok = allow.includes("*") ? "*" : allow.includes(origin) ? origin : allow[0];
  return { "Access-Control-Allow-Origin": ok, "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type", "Vary": "Origin" };
}
function json(obj, status, headers) { return new Response(JSON.stringify(obj), { status, headers: { ...headers, "content-type": "application/json; charset=utf-8" } }); }

async function sb(env, path, init = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
async function verifyUser(req, env) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}
async function bumpUsage(env, uid) {
  const max = +(env.AI_DAILY_LIMIT || 60);
  const day = localParts(new Date(), "Asia/Seoul").ymd;
  return await sb(env, "rpc/bump_ai_usage", { method: "POST", body: JSON.stringify({ p_user: uid, p_day: day, p_max: max }) });
}

// ---------- AI ----------
async function askClaude(env, prompt, image) {
  const content = [];
  if (image && typeof image === "string") {
    const m = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  content.push({ type: "text", text: prompt });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.AI_MODEL || DEFAULT_MODEL, max_tokens: 800, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const out = await res.json();
  return (out.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
}
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ---------- 알림 ----------
function localParts(date, tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { ymd: `${p.year}-${p.month}-${p.day}`, hm: `${hour}:${p.minute}`, h: +hour, m: +p.minute, wd };
}
const slotOf = hm => { const [h, m] = hm.split(":").map(Number); return `${String(h).padStart(2, "0")}:${m < 30 ? "00" : "30"}`; };
const PARTS = ["가슴", "등", "어깨", "하체", "팔"];
const COMBO = { "가슴": "팔", "등": "팔", "어깨": "복근", "하체": "복근", "팔": "가슴" };

function waterTarget(profile) {
  const b = (profile?.body || []).slice().sort((a, c) => a.date.localeCompare(c.date));
  const w = b.length ? b[b.length - 1].weight : null;
  return w ? Math.round(w * 33 / 100) * 100 : 2000;
}
function recommend(days, today) {
  const dn = k => Math.round(new Date(k + "T00:00:00Z").getTime() / 86400000);
  const last = {};
  for (const d of days) for (const e of d.data?.workout?.exercises || []) if (PARTS.includes(e.part)) last[e.part] = Math.max(last[e.part] ?? -1e9, dn(d.id));
  const t = dn(today);
  const ready = PARTS.filter(p => last[p] == null || t - last[p] >= 2).sort((a, b) => (last[a] ?? -1e9) - (last[b] ?? -1e9));
  if (!ready.length) return "복근 + 유산소";
  const p = ready[0], c = COMBO[p];
  return c && (c === "복근" || ready.includes(c)) ? `${p} + ${c}` : p;
}

async function runReminders(env) {
  const subs = await sb(env, "push_subs?select=*");
  if (!subs.length) return;
  const now = new Date();
  const byUser = new Map();
  for (const s of subs) { if (!byUser.has(s.user_id)) byUser.set(s.user_id, []); byUser.get(s.user_id).push(s); }

  for (const [uid, list] of byUser) {
    const tz = list[0].tz || "Asia/Seoul";
    const L = localParts(now, tz), slot = slotOf(L.hm);
    const since = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const docs = await sb(env, `docs?user_id=eq.${uid}&or=(id.eq.profile,id.gte.${since})&select=id,data`);
    const profile = docs.find(d => d.id === "profile")?.data || {};
    const days = docs.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d.id));
    const today = days.find(d => d.id === L.ymd)?.data || {};
    const extras = today.extras || [];
    const water = today.water || 0, target = waterTarget(profile);
    const name = profile.nickname ? `${profile.nickname}님, ` : "";

    for (const s of list) {
      const prefs = s.prefs || {};
      const msgs = [];
      if (prefs.water !== false && ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].includes(slot) && water < target)
        msgs.push({ key: "water-" + slot, title: "물 마실 시간이에요 💧", body: `오늘 ${(water / 1000).toFixed(1)}L / ${(target / 1000).toFixed(1)}L · 한 컵(500ml) 마시고 기록해요`, url: "./#meal" });
      if (prefs.meals !== false && slot === (prefs.lunchTime || "12:30") && !extras.some(x => x.meal === "lunch"))
        msgs.push({ key: "lunch", title: `${name}점심 뭐 먹었어요?`, body: "사진 한 장이면 칼로리까지 기록 끝", url: "./#meal" });
      if (prefs.meals !== false && slot === (prefs.dinnerTime || "21:30") && !extras.some(x => x.meal === "dinner" || x.meal === "pre"))
        msgs.push({ key: "dinner", title: "오늘 저녁 기록했어요?", body: "운동 후 식사까지 기록하면 오늘 하루 완성이에요", url: "./#meal" });
      const w = prefs.workout || {};
      if (w.on && slotOf(w.time || "19:00") === slot && (w.days || [1, 2, 3, 4, 5]).includes(L.wd) && !(today.workout?.exercises || []).length)
        msgs.push({ key: "workout", title: "운동 갈 시간이에요 💪", body: `오늘은 ${recommend(days, L.ymd)} 어때요?`, url: "./#workout" });

      const sent = { ...(s.last_sent || {}) };
      let changed = false, gone = false;
      for (const m of msgs) {
        if (sent[m.key] === L.ymd) continue;
        const r = await push(env, s, { title: m.title, body: m.body, url: m.url, tag: m.key });
        if (r === "gone") { gone = true; break; }
        if (r) { sent[m.key] = L.ymd; changed = true; }
      }
      const enc = encodeURIComponent(s.endpoint);
      if (gone) await sb(env, `push_subs?endpoint=eq.${enc}`, { method: "DELETE" });
      else if (changed) await sb(env, `push_subs?endpoint=eq.${enc}`, { method: "PATCH", body: JSON.stringify({ last_sent: sent }) });
    }
  }
}

let vapidCache = null;
async function push(env, s, payload) {
  vapidCache = vapidCache || await deserializeVapidKeys({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
  const res = await sendPushNotification(vapidCache, { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, env.VAPID_EMAIL || "diet-note@example.com", JSON.stringify(payload), { algorithm: "aes128gcm", ttl: 3600, urgency: "normal" });
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok;
}
