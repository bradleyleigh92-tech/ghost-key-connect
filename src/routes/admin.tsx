import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import VisitorLocations from "@/components/VisitorLocations";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Geo Intel" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const ADMIN_PASS = "zuwep123";

function AdminPage() {
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tryUnlock = () => {
    if (pass === ADMIN_PASS) {
      setUnlocked(true);
      setErr(null);
    } else {
      setErr("ERR: invalid admin passphrase");
    }
  };

  if (!unlocked) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="pointer-events-none absolute inset-0 scanlines opacity-20" />
        <div className="relative z-10 w-full max-w-sm rounded-md border border-terminal-green/40 bg-terminal/80 p-6 font-mono shadow-xl backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.3em] text-terminal-green">
            // restricted · admin only //
          </div>
          <h1 className="mt-2 text-lg font-bold text-foreground">Geo Intel Console</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            authorized administrators only · visitor location data is not exposed to the public site.
          </p>
          <label className="mt-4 block text-[10px] uppercase tracking-wider text-muted-foreground">
            admin passphrase
          </label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="mt-1 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green"
          />
          {err && (
            <div className="mt-2 rounded border border-terminal-red/40 bg-terminal-red/10 px-2 py-1 text-[11px] text-terminal-red">
              {err}
            </div>
          )}
          <button
            onClick={tryUnlock}
            className="mt-3 w-full rounded-md bg-terminal-green/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-background hover:bg-terminal-green"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-terminal-green">
              // admin · geo intel //
            </div>
            <h1 className="text-xl font-bold text-foreground">Visitor Location Console</h1>
            <p className="text-xs text-muted-foreground">
              precise geolocation data for every device that has loaded the site from this browser.
            </p>
          </div>
          <button
            onClick={() => setUnlocked(false)}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground hover:bg-accent"
          >
            lock
          </button>
        </div>
        <VisitorLocations />
      </div>
    </div>
  );
}
