import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import GlobalDominationMap from "@/components/GlobalDominationMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Remote Administration Client" },
      { name: "description", content: "Secure remote server administration client" },
      { property: "og:title", content: "Remote Administration Client" },
      { property: "og:description", content: "Secure remote server administration client" },
    ],
  }),
  component: Index,
});

const LOG_MESSAGES: string[] = [
  "[SYS] Kernel module loaded: netfilter v4.19",
  "[NET] Routing table initialized — 0.0.0.0/0 via tun0",
  "[SEC] TLS handshake cipher: ECDHE-RSA-AES256-GCM-SHA384",
  "[NET] Resolving hostname via DNS-over-HTTPS...",
  "[SEC] Certificate chain validated: CN=vps.remote-admin.net",
  "[NET] TCP SYN sent → 10.0.0.154:22",
  "[NET] TCP SYN-ACK received — RTT 142ms",
  "[SSH] Protocol version exchange: SSH-2.0-OpenSSH_9.3",
  "[SEC] Host key fingerprint: SHA256:aBcD1eFgH2iJkL3mNoP4qRsT5uVwX6yZ",
  "[SSH] Client algorithm negotiation complete",
  "[AUTH] Attempting publickey authentication...",
  "[AUTH] Private key loaded from memory (4096-bit RSA)",
  "[SEC] Diffie-Hellman key exchange — curve25519-sha256",
  "[SSH] Session channel request: shell",
  "[NET] Keepalive interval set: 30s",
  "[AUTH] Server accepted publickey — identity confirmed",
  "[SYS] Pseudo-terminal allocated: /dev/pts/0",
  "[SEC] Forward secrecy verified — ephemeral keys discarded",
  "[NET] Latency spike detected: RTT 847ms → 3124ms",
  "[SSH] Connection reset by peer (ECONNRESET)",
  "[NET] TCP retransmission #1 — seq=0x4A2F1B00",
  "[NET] TCP retransmission #2 — seq=0x4A2F1B00",
  "[NET] TCP retransmission #3 — seq=0x4A2F1B00",
  "[SSH] Broken pipe — session terminated unexpectedly",
  "[NET] No response to ICMP echo request — timeout",
  "[SEC] Session keys invalidated — forward secrecy maintained",
  "[SYS] Cleanup: releasing file descriptors and memory buffers",
];

function generateRandomLogs(count: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
    const ts = new Date(Date.now() - Math.random() * 5000).toISOString();
    lines.push(`[${ts}] ${msg}`);
  }
  return lines;
}

function TerminalLog({ logs }: { logs: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="w-full rounded-md border border-border bg-terminal p-3 font-mono text-xs leading-relaxed overflow-hidden flex flex-col">
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Connection Log</span>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-terminal-red" />
          <span className="h-2.5 w-2.5 rounded-full bg-terminal-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-terminal-green" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-1">
        {logs.map((line, i) => {
          const colorClass = line.includes("[ERR]") || line.includes("reset") || line.includes("Broken") || line.includes("timeout")
            ? "text-terminal-red"
            : line.includes("[WARN]") || line.includes("spike")
            ? "text-terminal-yellow"
            : line.includes("[SEC]") || line.includes("cipher") || line.includes("TLS")
            ? "text-terminal-cyan"
            : line.includes("[AUTH]") || line.includes("accepted")
            ? "text-success"
            : "text-muted-foreground";
          return (
            <div key={i} className={`${colorClass} break-all`}>
              {line}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Index() {
  const [vpsAddress, setVpsAddress] = useState("");
  const [username, setUsername] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "failed" | "success">("idle");
  const [phase, setPhase] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    logIntervalRef.current = null;
    timeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toISOString();
    setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const handleConnect = useCallback(() => {
    setStatus("connecting");
    setPhase(0);
    setLogs([]);
    clearTimers();

    const delay = 3000 + Math.random() * 2000;
    const phases = [
      "Initializing connection...",
      "Verifying credentials...",
      "Contacting server...",
    ];

    // Generate initial batch of logs
    setLogs(generateRandomLogs(6));

    // Add more logs periodically
    logIntervalRef.current = setInterval(() => {
      const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
      const ts = new Date().toISOString();
      setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
    }, 280);

    // Phase transitions
    phases.forEach((text, idx) => {
      setTimeout(() => setPhase(idx), idx * 800);
    });

    const willSucceed = username.trim().toLowerCase() === "phantom";

    // Final outcome
    timeoutRef.current = setTimeout(() => {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      if (willSucceed) {
        setStatus("success");
        setPhase(0);
        addLog("[AUTH] Identity confirmed — operator: phantom");
        addLog("[SSH] Secure channel established");
        addLog("[SYS] Loading surveillance grid...");
      } else {
        setStatus("failed");
        setPhase(0);
        addLog("[ERR] Connection terminated unexpectedly");
        addLog("[NET] Ping timeout — no response from host");
        addLog("[SSH] ssh: connect to host 10.0.0.154 port 22: Connection refused");
      }
    }, delay);
  }, [clearTimers, addLog, username]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setPhase(0);
    setLogs([]);
    clearTimers();
  }, [clearTimers]);

  const phaseLabels = ["Initializing connection...", "Verifying credentials...", "Contacting server..."];

  if (status === "success") {
    return <GlobalDominationMap />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono text-terminal-green uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terminal-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-terminal-green" />
            </span>
            Secure Channel
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Remote Administration Client
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            SSH terminal access to remote VPS infrastructure
          </p>
        </div>

        {/* Main Panel */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-lg space-y-5">
          {status === "idle" && (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="vps" className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    VPS Address
                  </label>
                  <input
                    id="vps"
                    type="text"
                    placeholder="10.0.0.154"
                    value={vpsAddress}
                    onChange={(e) => setVpsAddress(e.target.value)}
                    className="w-full rounded-md border border-input bg-panel px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="user" className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Username
                  </label>
                  <input
                    id="user"
                    type="text"
                    placeholder="root"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-md border border-input bg-panel px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="key" className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Private Key
                  </label>
                  <textarea
                    id="key"
                    rows={4}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="w-full rounded-md border border-input bg-panel px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring font-mono resize-none"
                  />
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={!vpsAddress.trim() || !username.trim() || !privateKey.trim()}
                className={`w-full rounded-md border px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-300 ${
                  !vpsAddress.trim() || !username.trim() || !privateKey.trim()
                    ? "bg-muted/40 text-muted-foreground border-border btn-glow-idle cursor-not-allowed"
                    : "bg-terminal-green/20 text-terminal-green border-terminal-green/60 btn-glow-ready hover:bg-terminal-green/30"
                }`}
              >
                {vpsAddress.trim() && username.trim() && privateKey.trim() ? "Connect »" : "Awaiting credentials..."}
              </button>
            </>
          )}

          {status === "connecting" && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-mono text-foreground">
                  {phaseLabels[phase] ?? phaseLabels[2]}
                </p>
              </div>
              <button
                disabled
                className={`w-full rounded-md border px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-300 cursor-not-allowed ${
                  phase === 0
                    ? "bg-terminal-yellow/15 text-terminal-yellow border-terminal-yellow/60 btn-glow-init"
                    : phase === 1
                    ? "bg-terminal-cyan/15 text-terminal-cyan border-terminal-cyan/60 btn-glow-verify"
                    : "bg-terminal-green/15 text-terminal-green border-terminal-green/60 btn-glow-contact"
                }`}
              >
                {phaseLabels[phase] ?? "Contacting server..."}
              </button>
              <div className="w-full space-y-1.5">
                {phaseLabels.map((label, idx) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 text-xs font-mono ${
                      idx <= phase ? "text-terminal-green" : "text-muted-foreground/50"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${idx <= phase ? "bg-terminal-green" : "bg-muted-foreground/30"}`} />
                    {label}
                  </div>
                ))}
              </div>
              <TerminalLog logs={logs} />
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terminal-red/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-terminal-red"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-foreground">Connection Failed</h2>
                  <p className="text-sm font-mono text-terminal-red">Reason: VPS Offline</p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-panel p-4 space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Technical Details
                </h3>
                <ul className="space-y-2 text-sm font-mono">
                  <li className="flex items-start gap-2 text-terminal-red">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-terminal-red" />
                    Ping Timeout
                  </li>
                  <li className="flex items-start gap-2 text-terminal-red">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-terminal-red" />
                    SSH Service Unreachable
                  </li>
                  <li className="flex items-start gap-2 text-terminal-red">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-terminal-red" />
                    Connection Refused
                  </li>
                </ul>
              </div>

              <TerminalLog logs={logs} />

              <button
                onClick={handleReset}
                className="w-full rounded-md border border-terminal-red/60 bg-terminal-red/10 px-4 py-2.5 text-sm font-semibold text-terminal-red transition-all duration-300 hover:bg-terminal-red/20 btn-glow-fail font-mono"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 font-mono">
          Encrypted via AES-256-GCM · Session keys discarded on disconnect
        </p>
      </div>
    </div>
  );
}
