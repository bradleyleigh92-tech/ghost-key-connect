import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Status {
  sessionId: string | null;
  remaining: number;
  revoked: boolean;
  injectedText: string | null;
  injectedAt: string | null;
}

export function useOpsSession(operatorIp: string | null, active: boolean, durationSec = 900) {
  const [state, setState] = useState<Status>({
    sessionId: null, remaining: durationSec, revoked: false, injectedText: null, injectedAt: null,
  });
  const created = useRef(false);

  // create once
  useEffect(() => {
    if (!active || !operatorIp || created.current) return;
    created.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ops-session", {
          body: { operator_ip: operatorIp, duration_sec: durationSec },
        });
        if (!error && data?.id) {
          setState((s) => ({ ...s, sessionId: data.id }));
        }
      } catch { /* ignore */ }
    })();
  }, [active, operatorIp, durationSec]);

  // poll status
  useEffect(() => {
    if (!state.sessionId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ops-session?id=${state.sessionId}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } },
        );
        const j = await res.json();
        if (cancelled) return;
        setState((s) => ({
          ...s,
          remaining: j.remaining ?? s.remaining,
          revoked: !!j.revoked,
          injectedText: j.injected_text ?? null,
          injectedAt: j.injected_at ?? null,
        }));
      } catch { /* ignore */ }
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [state.sessionId]);

  // local countdown between polls
  useEffect(() => {
    if (!state.sessionId || state.revoked) return;
    const iv = setInterval(() => {
      setState((s) => ({ ...s, remaining: Math.max(0, s.remaining - 1) }));
    }, 1000);
    return () => clearInterval(iv);
  }, [state.sessionId, state.revoked]);

  return state;
}

export function formatRemaining(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
