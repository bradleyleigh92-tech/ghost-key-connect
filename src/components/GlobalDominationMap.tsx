import { useEffect, useMemo, useRef, useState } from "react";

// Approximate lat/lon for major nodes (converted to % on a 2:1 equirectangular map)
const NODES: { name: string; lat: number; lon: number }[] = [
  { name: "NYC-01", lat: 40.7, lon: -74 },
  { name: "LON-04", lat: 51.5, lon: -0.1 },
  { name: "BER-02", lat: 52.5, lon: 13.4 },
  { name: "MOS-07", lat: 55.7, lon: 37.6 },
  { name: "DXB-03", lat: 25.2, lon: 55.3 },
  { name: "HKG-09", lat: 22.3, lon: 114.2 },
  { name: "TYO-11", lat: 35.7, lon: 139.7 },
  { name: "SYD-05", lat: -33.9, lon: 151.2 },
  { name: "SAO-08", lat: -23.5, lon: -46.6 },
  { name: "LAX-02", lat: 34.0, lon: -118.2 },
  { name: "JNB-06", lat: -26.2, lon: 28.0 },
  { name: "SIN-10", lat: 1.3, lon: 103.8 },
  { name: "DEL-12", lat: 28.6, lon: 77.2 },
  { name: "IST-13", lat: 41.0, lon: 28.9 },
  { name: "TOR-14", lat: 43.6, lon: -79.4 },
  { name: "CAI-15", lat: 30.0, lon: 31.2 },
  { name: "PAR-16", lat: 48.8, lon: 2.3 },
  { name: "SEO-17", lat: 37.5, lon: 127.0 },
  { name: "MEX-18", lat: 19.4, lon: -99.1 },
  { name: "STO-19", lat: 59.3, lon: 18.0 },
];

const TERMINAL_LINES = [
  "[INIT] Loading global node manifest...",
  "[NET]  Pinging 1,284 endpoints across 67 regions",
  "[SCAN] Accessing global nodes…",
  "[SEC]  Bypassing firewall layers…",
  "[EXPL] CVE-2024-31337 — payload deployed",
  "[NET]  Injecting secure tunnel…",
  "[KEY]  Rotating ephemeral session keys (curve25519)",
  "[SCAN] Compromised host: 198.51.100.23 → escalated",
  "[ROOT] Privilege escalation successful @ NYC-01",
  "[ROOT] Privilege escalation successful @ LON-04",
  "[NET]  Active hacking route established BER-02 ↔ TYO-11",
  "[EXPL] Backdoor installed @ DXB-03",
  "[SEC]  Disabling intrusion detection systems",
  "[NET]  Rerouting traffic through 14 hop chain",
  "[ROOT] Privilege escalation successful @ MOS-07",
  "[KEY]  Hijacked TLS handshake — MITM active",
  "[SCAN] Mapping internal subnets 10.0.0.0/8",
  "[EXPL] Zero-day deployed — SCADA cluster owned",
  "[NET]  Tunnel mesh: 47 nodes online",
  "[SEC]  Erasing audit logs across all targets",
  "[ROOT] Network domination complete",
];

function project(lat: number, lon: number) {
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

interface Link {
  id: number;
  a: number;
  b: number;
  start: number;
}

export default function GlobalDominationMap() {
  const [activeNodes, setActiveNodes] = useState<Set<number>>(new Set());
  const [securedNodes, setSecuredNodes] = useState<Set<number>>(new Set());
  const [links, setLinks] = useState<Link[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);
  const [complete, setComplete] = useState(false);
  const linkId = useRef(0);
  const logIdx = useRef(0);
  const logBottomRef = useRef<HTMLDivElement>(null);

  const points = useMemo(() => NODES.map((n) => ({ ...n, ...project(n.lat, n.lon) })), []);

  useEffect(() => {
    // Scan nodes progressively
    const scanInterval = setInterval(() => {
      setActiveNodes((prev) => {
        if (prev.size >= NODES.length) return prev;
        const next = new Set(prev);
        const candidates = NODES.map((_, i) => i).filter((i) => !next.has(i));
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        next.add(pick);
        return next;
      });
    }, 220);

    // Secure (red → green) nodes after a delay
    const secureInterval = setInterval(() => {
      setSecuredNodes((prev) => {
        const active = Array.from(activeNodes);
        const candidates = active.filter((i) => !prev.has(i));
        if (candidates.length === 0) return prev;
        const next = new Set(prev);
        next.add(candidates[Math.floor(Math.random() * candidates.length)]);
        return next;
      });
    }, 380);

    // Spawn data lines
    const linkInterval = setInterval(() => {
      setLinks((prev) => {
        const active = Array.from(activeNodes);
        if (active.length < 2) return prev;
        const a = active[Math.floor(Math.random() * active.length)];
        let b = active[Math.floor(Math.random() * active.length)];
        if (a === b) return prev;
        const id = linkId.current++;
        const next = [...prev, { id, a, b, start: Date.now() }];
        return next.slice(-12);
      });
    }, 300);

    // Terminal log stream
    const logInterval = setInterval(() => {
      const msg = TERMINAL_LINES[logIdx.current % TERMINAL_LINES.length];
      logIdx.current++;
      const ts = new Date().toISOString().split("T")[1].replace("Z", "");
      setLogs((prev) => [...prev.slice(-80), `[${ts}] ${msg}`]);
    }, 260);

    // Glitch bursts
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 2400);

    // Completion banner
    const completeTimer = setTimeout(() => setComplete(true), 12000);

    return () => {
      clearInterval(scanInterval);
      clearInterval(secureInterval);
      clearInterval(linkInterval);
      clearInterval(logInterval);
      clearInterval(glitchInterval);
      clearTimeout(completeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Re-run secure check when activeNodes changes
  }, [activeNodes]);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Prune old links
  useEffect(() => {
    const prune = setInterval(() => {
      const now = Date.now();
      setLinks((prev) => prev.filter((l) => now - l.start < 2500));
    }, 500);
    return () => clearInterval(prune);
  }, []);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-background ${glitch ? "glitch-active" : ""}`}>
      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 z-30 scanlines opacity-30" />
      {/* Digital noise */}
      <div className="pointer-events-none absolute inset-0 z-20 noise opacity-[0.08]" />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* Header HUD */}
      <div className="relative z-40 flex items-center justify-between border-b border-terminal-green/30 bg-background/80 px-6 py-3 font-mono text-xs backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-terminal-green">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terminal-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-terminal-green" />
            </span>
            SURVEILLANCE GRID — LIVE
          </span>
          <span className="text-muted-foreground">OPERATOR: phantom</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>NODES: <span className="text-terminal-cyan">{activeNodes.size}</span>/{NODES.length}</span>
          <span>SECURED: <span className="text-terminal-green">{securedNodes.size}</span></span>
          <span>TUNNELS: <span className="text-terminal-yellow">{links.length}</span></span>
        </div>
      </div>

      {/* Map area */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-terminal-green/30 bg-terminal">
          {/* Grid overlay */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.65 0.18 145 / 0.15)" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* World map silhouette (simplified continents) */}
          <svg
            className="absolute inset-0 h-full w-full opacity-30"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
          >
            <g fill="oklch(0.65 0.18 145 / 0.4)" stroke="oklch(0.65 0.18 145 / 0.6)" strokeWidth="0.8">
              {/* North America */}
              <path d="M 100,120 Q 140,90 200,100 L 260,115 L 280,160 L 270,200 L 230,240 L 180,250 L 140,230 L 110,190 Z" />
              {/* South America */}
              <path d="M 260,270 Q 290,260 310,290 L 320,360 L 300,420 L 270,440 L 250,400 L 245,330 Z" />
              {/* Europe */}
              <path d="M 460,110 L 530,100 L 555,140 L 540,170 L 490,175 L 465,150 Z" />
              {/* Africa */}
              <path d="M 480,200 L 560,195 L 590,260 L 580,340 L 540,400 L 500,380 L 485,310 L 475,250 Z" />
              {/* Asia */}
              <path d="M 560,90 Q 650,80 760,100 L 820,130 L 850,180 L 830,220 L 780,250 L 700,240 L 620,210 L 580,170 Z" />
              {/* Australia */}
              <path d="M 780,340 L 860,335 L 880,375 L 850,405 L 790,400 L 770,370 Z" />
            </g>
          </svg>

          {/* Animated data lines (SVG with full coords) */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            {links.map((l) => {
              const a = points[l.a];
              const b = points[l.b];
              const age = (Date.now() - l.start) / 2500;
              const opacity = Math.max(0, 1 - age);
              return (
                <g key={l.id}>
                  <line
                    x1={a.x} y1={a.y / 2} x2={b.x} y2={b.y / 2}
                    stroke="oklch(0.65 0.18 145)"
                    strokeWidth="0.15"
                    opacity={opacity * 0.8}
                    strokeDasharray="0.5 0.5"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-2" dur="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {points.map((p, i) => {
            const isActive = activeNodes.has(i);
            const isSecured = securedNodes.has(i);
            if (!isActive) return null;
            const color = isSecured ? "var(--terminal-green)" : "var(--terminal-red)";
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-colors duration-700"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span
                  className="absolute inset-0 m-auto block h-3 w-3 animate-ping rounded-full"
                  style={{ backgroundColor: color, opacity: 0.7 }}
                />
                <span
                  className="relative block h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: color, color }}
                />
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[8px] tracking-wider"
                  style={{ color }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}

          {/* Horizontal scan line */}
          <div className="pointer-events-none absolute inset-x-0 h-px bg-terminal-green/70 shadow-[0_0_12px_2px_oklch(0.65_0.18_145)] scan-y" />

          {/* Completion overlay */}
          {complete && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] animate-fade-in">
              <div className="border border-terminal-green bg-background/80 px-8 py-4 text-center font-mono">
                <div className="text-xs uppercase tracking-[0.3em] text-terminal-green">// status //</div>
                <div className="mt-2 text-2xl font-bold text-terminal-green">NETWORK DOMINATION COMPLETE</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {NODES.length} nodes secured · global mesh online
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terminal log */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-md border border-terminal-green/30 bg-terminal p-3 font-mono text-[11px] leading-relaxed">
            <div className="mb-2 flex items-center justify-between border-b border-terminal-green/20 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">// op_log //</span>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-terminal-red" />
                <span className="h-2 w-2 rounded-full bg-terminal-yellow" />
                <span className="h-2 w-2 rounded-full bg-terminal-green" />
              </div>
            </div>
            <div className="h-48 overflow-y-auto pr-1">
              {logs.map((line, i) => {
                const color = line.includes("[ROOT]") || line.includes("complete")
                  ? "text-terminal-green"
                  : line.includes("[EXPL]") || line.includes("payload")
                  ? "text-terminal-red"
                  : line.includes("[SEC]") || line.includes("[KEY]")
                  ? "text-terminal-cyan"
                  : line.includes("[SCAN]")
                  ? "text-terminal-yellow"
                  : "text-muted-foreground";
                return <div key={i} className={`${color} break-all`}>{line}</div>;
              })}
              <div ref={logBottomRef} />
            </div>
          </div>

          <div className="rounded-md border border-terminal-green/30 bg-terminal p-3 font-mono text-[11px]">
            <div className="mb-2 border-b border-terminal-green/20 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              // threat_matrix //
            </div>
            <div className="space-y-2">
              {["Firewall Bypass", "TLS Hijack", "Privilege Esc.", "Log Erasure", "Tunnel Mesh"].map((label, i) => {
                const pct = Math.min(100, Math.floor((activeNodes.size / NODES.length) * 100) + i * 3);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-terminal-green">{pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1 w-full overflow-hidden bg-border">
                      <div
                        className="h-full bg-terminal-green transition-all duration-500"
                        style={{ width: `${pct}%`, boxShadow: "0 0 6px var(--terminal-green)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
