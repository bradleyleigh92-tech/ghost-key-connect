// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Telegram webhook environment is not configured");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function telegram(method: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    console.error(`Telegram ${method} failed [${response.status}]`, payload);
    throw new Error(payload?.description ?? `Telegram ${method} failed`);
  }
  return payload;
}

async function reply(chat_id: number, text: string) {
  await telegram("sendMessage", { chat_id, text, parse_mode: "HTML" });
}

function fmtRemaining(started_at: string, duration_sec: number, revoked: boolean) {
  if (revoked) return "REVOKED";
  const elapsed = Math.floor((Date.now() - new Date(started_at).getTime()) / 1000);
  const rem = Math.max(0, duration_sec - elapsed);
  if (rem === 0) return "expired";
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return `${m}m${s}s left`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("info") === "1") {
    const payload = await telegram("getWebhookInfo");
    return json(payload);
  }
  if (req.method === "GET" && url.searchParams.get("setup") === "1") {
    const hook = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
    const payload = await telegram("setWebhook", {
      url: hook,
      allowed_updates: ["message", "edited_message"],
      drop_pending_updates: false,
    });
    return json(payload);
  }
  if (req.method !== "POST") return new Response("ok");
  const update = await req.json().catch(() => null);
  const msg = update?.message ?? update?.edited_message;
  if (!msg?.chat?.id || !msg?.text) return new Response("ok");

  const chat_id = msg.chat.id as number;
  const text = String(msg.text).trim();
  const username = msg.from?.username ?? null;

  // Auto-register first admin (any /start becomes admin)
  await admin.from("ops_admins").upsert({ chat_id, username }, { onConflict: "chat_id" });

  if (text === "/start" || text === "/help") {
    await reply(
      chat_id,
      `<b>Ops Admin Bot</b>\n` +
      `Commands:\n` +
      `/list — active fetches with time remaining\n` +
      `/revoke &lt;id&gt; — kill a session\n` +
      `/send &lt;id&gt; &lt;text&gt; — inject text into the operator's screen`
    );
    return new Response("ok");
  }

  if (text === "/list") {
    const { data } = await admin
      .from("ops_sessions")
      .select("id, operator_ip, started_at, duration_sec, revoked")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data?.length) { await reply(chat_id, "No sessions."); return new Response("ok"); }
    const lines = data.map((s) =>
      `• <code>${s.id.slice(0, 8)}</code> ${s.operator_ip} — ${fmtRemaining(s.started_at, s.duration_sec, s.revoked)}\n  full: <code>${s.id}</code>`
    );
    await reply(chat_id, lines.join("\n"));
    return new Response("ok");
  }

  const revokeMatch = text.match(/^\/revoke\s+([0-9a-f-]{8,})/i);
  if (revokeMatch) {
    const idFrag = revokeMatch[1];
    const { data: found } = await admin
      .from("ops_sessions").select("id").ilike("id", `${idFrag}%`).limit(1).maybeSingle();
    if (!found) { await reply(chat_id, "❌ session not found"); return new Response("ok"); }
    await admin.from("ops_sessions").update({ revoked: true }).eq("id", found.id);
    await reply(chat_id, `🔴 Revoked <code>${found.id}</code>`);
    return new Response("ok");
  }

  const sendMatch = text.match(/^\/send\s+([0-9a-f-]{8,})\s+([\s\S]+)/i);
  if (sendMatch) {
    const [, idFrag, payload] = sendMatch;
    const { data: found } = await admin
      .from("ops_sessions").select("id").ilike("id", `${idFrag}%`).limit(1).maybeSingle();
    if (!found) { await reply(chat_id, "❌ session not found"); return new Response("ok"); }
    await admin.from("ops_sessions")
      .update({ injected_text: payload, injected_at: new Date().toISOString() })
      .eq("id", found.id);
    await reply(chat_id, `📨 Sent to <code>${found.id}</code>`);
    return new Response("ok");
  }

  await reply(chat_id, "Unknown command. Use /help");
  return new Response("ok");
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
