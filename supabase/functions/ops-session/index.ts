// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function tg(method: string, body: any) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (_) { /* swallow */ }
}

async function notifyAdmins(text: string) {
  const { data } = await admin.from("ops_admins").select("chat_id");
  for (const row of data ?? []) {
    await tg("sendMessage", { chat_id: row.chat_id, text, parse_mode: "HTML" });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required" }, 400);
      const { data, error } = await admin
        .from("ops_sessions")
        .select("id, started_at, duration_sec, revoked, injected_text, injected_at")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return json({ error: "not found" }, 404);
      const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
      const remaining = Math.max(0, data.duration_sec - elapsed);
      return json({
        id: data.id,
        revoked: data.revoked,
        remaining,
        injected_text: data.injected_text,
        injected_at: data.injected_at,
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const operator_ip = String(body.operator_ip ?? "").slice(0, 64);
      const duration_sec = Math.min(3600, Math.max(60, Number(body.duration_sec) || 900));
      const user_agent = req.headers.get("user-agent")?.slice(0, 200) ?? null;
      if (!operator_ip) return json({ error: "operator_ip required" }, 400);

      const { data, error } = await admin
        .from("ops_sessions")
        .insert({ operator_ip, duration_sec, user_agent })
        .select("id, started_at, duration_sec")
        .single();
      if (error) return json({ error: error.message }, 500);

      const mins = Math.floor(duration_sec / 60);
      await notifyAdmins(
        `🟢 <b>Fetch started</b>\n` +
        `IP: <code>${operator_ip}</code>\n` +
        `ID: <code>${data.id}</code>\n` +
        `Duration: ${mins}m\n` +
        `UA: ${user_agent ?? "—"}\n\n` +
        `Reply: <code>/revoke ${data.id}</code>  ·  <code>/send ${data.id} your text</code>`
      );
      return json(data);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
