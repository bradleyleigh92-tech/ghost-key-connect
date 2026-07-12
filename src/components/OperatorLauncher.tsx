import { useState } from "react";

const TARGET_IP = "10.0.0.154";

interface Props {
  onLaunch: (ip: string) => void;
}

export default function OperatorLauncher({ onLaunch }: Props) {
  const [ip, setIp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = () => {
    setError(null);
    const trimmed = ip.trim();
    if (!trimmed) {
      setError("ERR: target IP required");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      if (trimmed === TARGET_IP) {
        onLaunch(trimmed);
      } else {
        setBusy(false);
        setError(`ERR: handshake refused — ${trimmed} is not a registered Kali operator`);
      }
    }, 900);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 scanlines opacity-20" />
      <div className="pointer-events-none absolute inset-0 noise opacity-[0.06]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-terminal-green">
            // operator workstation //
          </div>

          {/* Desktop icon */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="group relative flex h-28 w-28 flex-col items-center justify-center rounded-lg border border-terminal-green/40 bg-terminal/70 transition hover:border-terminal-green hover:bg-terminal disabled:opacity-50"
              title="Launch active operator shell"
            >
              <svg
                viewBox="0 0 64 64"
                className="h-14 w-14 text-terminal-green drop-shadow-[0_0_8px_oklch(0.65_0.18_145_/_0.6)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="10" width="52" height="34" rx="2" />
                <path d="M6 38 L58 38" />
                <path d="M24 50 L40 50" />
                <path d="M28 44 L28 50 M36 44 L36 50" />
                <path d="M14 18 L20 24 L14 30" />
                <path d="M24 30 L34 30" />
              </svg>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-foreground/80 group-hover:text-terminal-green">
                kali.shell
              </span>
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-terminal-green shadow-[0_0_6px_var(--terminal-green)]" />
            </button>
            <div className="mt-2 font-mono text-[10px] text-muted-foreground">
              double-click to initialize
            </div>
          </div>

          {/* IP input panel */}
          <div className="rounded-lg border border-terminal-green/30 bg-terminal/70 p-5 font-mono shadow-lg backdrop-blur">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              kali operator ip
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="10.0.0.x"
                disabled={busy}
                className="flex-1 rounded-md border border-input bg-background/60 px-3 py-2 text-sm text-terminal-green placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-terminal-green"
              />
              <button
                onClick={handleStart}
                disabled={busy}
                className="rounded-md bg-terminal-green/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-background transition hover:bg-terminal-green disabled:opacity-60"
              >
                {busy ? "..." : "Start"}
              </button>
            </div>
            {error && (
              <div className="mt-3 rounded border border-terminal-red/40 bg-terminal-red/10 px-2 py-1.5 text-[11px] text-terminal-red">
                {error}
              </div>
            )}
            {busy && !error && (
              <div className="mt-3 text-[11px] text-terminal-yellow">
                → negotiating handshake with {ip}…
              </div>
            )}
            <div className="mt-3 border-t border-terminal-green/15 pt-2 text-[10px] text-muted-foreground">
              authorized operator workstations only · session keys ephemeral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
