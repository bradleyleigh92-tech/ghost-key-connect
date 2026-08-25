
CREATE TABLE public.ops_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_ip text NOT NULL,
  duration_sec integer NOT NULL DEFAULT 900,
  started_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  injected_text text,
  injected_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_sessions TO service_role;
ALTER TABLE public.ops_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ops_admins (
  chat_id bigint PRIMARY KEY,
  username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_admins TO service_role;
ALTER TABLE public.ops_admins ENABLE ROW LEVEL SECURITY;

CREATE INDEX ops_sessions_created_at_idx ON public.ops_sessions (created_at DESC);
