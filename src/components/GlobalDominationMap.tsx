import { useEffect, useMemo, useRef, useState } from "react";
import InteractiveShell from "./InteractiveShell";
import OperatorLauncher from "./OperatorLauncher";
import PopupTerminal from "./PopupTerminal";




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
  { name: "MUM-20", lat: 19.1, lon: 72.9 },
  { name: "BOM-21", lat: 19.1, lon: 72.9 },
  { name: "CHI-22", lat: 41.9, lon: -87.6 },
  { name: "ATL-23", lat: 33.7, lon: -84.4 },
  { name: "DFW-24", lat: 32.8, lon: -96.8 },
  { name: "MIA-25", lat: 25.8, lon: -80.2 },
  { name: "SEA-26", lat: 47.6, lon: -122.3 },
  { name: "SFO-27", lat: 37.8, lon: -122.4 },
  { name: "AMS-28", lat: 52.4, lon: 4.9 },
  { name: "MAD-29", lat: 40.4, lon: -3.7 },
  { name: "ROM-30", lat: 41.9, lon: 12.5 },
  { name: "VIE-31", lat: 48.2, lon: 16.4 },
  { name: "WAW-32", lat: 52.2, lon: 21.0 },
  { name: "OSL-33", lat: 59.9, lon: 10.8 },
  { name: "HEL-34", lat: 60.2, lon: 24.9 },
  { name: "CPH-35", lat: 55.7, lon: 12.6 },
  { name: "PRG-36", lat: 50.1, lon: 14.4 },
  { name: "BUD-37", lat: 47.5, lon: 19.1 },
  { name: "BKK-38", lat: 13.8, lon: 100.5 },
  { name: "KUL-39", lat: 3.2, lon: 101.7 },
  { name: "MNL-40", lat: 14.6, lon: 120.9 },
  { name: "CGK-41", lat: -6.2, lon: 106.8 },
  { name: "HAN-42", lat: 21.0, lon: 105.8 },
  { name: "PVG-43", lat: 31.2, lon: 121.5 },
  { name: "PEK-44", lat: 39.9, lon: 116.4 },
  { name: "CAN-45", lat: 23.1, lon: 113.3 },
  { name: "CTU-46", lat: 30.6, lon: 104.1 },
  { name: "TPE-47", lat: 25.0, lon: 121.5 },
  { name: "AKL-48", lat: -36.8, lon: 174.8 },
  { name: "PER-49", lat: -31.9, lon: 115.9 },
  { name: "BUE-50", lat: -34.6, lon: -58.4 },
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
  const [launched, setLaunched] = useState(false);
  const [operatorIp, setOperatorIp] = useState<string>("");
  const [activeNodes, setActiveNodes] = useState<Set<number>>(new Set());
  const [securedNodes, setSecuredNodes] = useState<Set<number>>(new Set());
  const [links, setLinks] = useState<Link[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const linkId = useRef(0);
  const logIdx = useRef(0);
  const logBottomRef = useRef<HTMLDivElement>(null);


  const points = useMemo(() => NODES.map((n) => ({ ...n, ...project(n.lat, n.lon) })), []);

  useEffect(() => {
    if (!launched) return;

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

    // Spawn data lines — prefer cross-continent (geographically distant) pairs
    const linkInterval = setInterval(() => {
      setLinks((prev) => {
        const active = Array.from(activeNodes);
        if (active.length < 2) return prev;
        let best: [number, number] | null = null;
        let bestDist = -1;
        for (let t = 0; t < 6; t++) {
          const a = active[Math.floor(Math.random() * active.length)];
          const b = active[Math.floor(Math.random() * active.length)];
          if (a === b) continue;
          const pa = points[a], pb = points[b];
          const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
          if (d > bestDist) { bestDist = d; best = [a, b]; }
        }
        if (!best) return prev;
        const id = linkId.current++;
        const next = [...prev, { id, a: best[0], b: best[1], start: Date.now() }];
        return next.slice(-14);

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
  }, [launched]);

  // Asymptotic progress that never reaches 100%
  useEffect(() => {
    if (!launched) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const remaining = 99.4 - p;
        if (remaining <= 0.01) return p;
        // slow easing — gets exponentially slower as it approaches 99.4
        return p + Math.max(0.02, remaining * 0.012);
      });
    }, 450);
    return () => clearInterval(id);
  }, [launched]);


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

  if (!launched) {
    return <OperatorLauncher onLaunch={(ip) => { setOperatorIp(ip); setLaunched(true); }} />;
  }

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
          <span className="flex items-center gap-2">
            INJECT:
            <span className="relative inline-block h-1.5 w-32 overflow-hidden rounded bg-border">
              <span
                className="absolute inset-y-0 left-0 bg-terminal-green transition-all duration-500"
                style={{ width: `${progress}%`, boxShadow: "0 0 6px var(--terminal-green)" }}
              />
            </span>
            <span className="w-12 text-terminal-green tabular-nums">{progress.toFixed(2)}%</span>
          </span>
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

          {/* World map silhouette — detailed continents */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.18 145 / 0.22)" />
                <stop offset="100%" stopColor="oklch(0.65 0.18 145 / 0.06)" />
              </linearGradient>
              <filter id="landGlow">
                <feGaussianBlur stdDeviation="0.5" />
              </filter>
            </defs>
            <g
              fill="url(#landFill)"
              stroke="oklch(0.65 0.18 145 / 0.75)"
              strokeWidth="0.6"
              strokeLinejoin="round"
              filter="url(#landGlow)"
            >
              {/* North America */}
              <path d="M 90,95 L 130,75 L 175,72 L 220,85 L 260,95 L 290,108 L 298,132 L 285,158 L 268,178 L 278,198 L 262,218 L 238,238 L 212,248 L 185,250 L 158,243 L 138,222 L 120,200 L 105,175 L 92,145 L 86,118 Z" />
              {/* Greenland */}
              <path d="M 340,55 L 382,50 L 408,68 L 412,92 L 395,112 L 365,118 L 345,102 L 335,80 Z" />
              {/* Central America */}
              <path d="M 212,248 L 232,262 L 248,278 L 262,290 L 256,300 L 240,294 L 224,278 L 214,262 Z" />
              {/* South America */}
              <path d="M 268,288 L 296,278 L 322,288 L 336,312 L 342,348 L 326,388 L 306,422 L 286,448 L 268,456 L 256,440 L 250,410 L 246,375 L 250,340 L 258,310 Z" />
              {/* Iceland */}
              <path d="M 410,80 L 426,78 L 432,90 L 418,94 L 408,86 Z" />
              {/* UK / Ireland */}
              <path d="M 440,108 L 454,105 L 458,122 L 446,130 L 436,120 Z" />
              {/* Europe (mainland) */}
              <path d="M 462,108 L 488,100 L 514,96 L 540,100 L 562,112 L 572,128 L 562,142 L 540,152 L 514,158 L 488,158 L 466,150 L 456,135 L 458,120 Z" />
              {/* Scandinavia */}
              <path d="M 510,72 L 532,68 L 548,82 L 540,100 L 522,102 L 508,90 Z" />
              {/* Africa */}
              <path d="M 478,178 L 512,172 L 545,172 L 572,180 L 592,202 L 602,232 L 606,268 L 594,302 L 574,338 L 548,368 L 524,388 L 500,380 L 482,356 L 472,326 L 468,290 L 470,255 L 474,218 Z" />
              {/* Middle East */}
              <path d="M 572,168 L 608,166 L 628,180 L 632,202 L 615,218 L 590,214 L 575,196 Z" />
              {/* Asia (mainland) */}
              <path d="M 562,112 L 605,102 L 655,96 L 705,94 L 755,98 L 798,108 L 832,124 L 858,144 L 872,168 L 866,192 L 845,216 L 815,230 L 780,234 L 745,224 L 712,214 L 680,208 L 648,202 L 618,192 L 595,178 L 578,160 L 568,138 Z" />
              {/* India */}
              <path d="M 678,208 L 716,214 L 722,242 L 712,266 L 696,282 L 680,266 L 672,240 Z" />
              {/* Southeast Asia peninsula */}
              <path d="M 770,238 L 800,244 L 820,256 L 814,276 L 796,286 L 776,278 L 768,260 Z" />
              {/* Korea */}
              <path d="M 838,170 L 850,170 L 854,188 L 845,198 L 836,188 Z" />
              {/* Japan */}
              <path d="M 866,158 L 880,152 L 890,170 L 884,192 L 872,200 L 864,184 Z" />
              {/* Indonesia */}
              <path d="M 790,300 L 830,294 L 858,302 L 852,316 L 822,322 L 792,316 Z" />
              {/* Philippines */}
              <path d="M 848,262 L 862,260 L 868,278 L 856,288 L 846,278 Z" />
              {/* Australia */}
              <path d="M 798,352 L 842,346 L 878,350 L 898,366 L 900,388 L 880,408 L 845,414 L 810,410 L 790,392 L 788,370 Z" />
              {/* New Zealand */}
              <path d="M 906,408 L 920,406 L 924,422 L 912,432 L 902,424 Z" />
              {/* Antarctica strip */}
              <path d="M 40,478 L 960,478 L 960,498 L 40,498 Z" />
            </g>
          </svg>

          {/* Animated data lines — curved arcs across continents */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="oklch(0.75 0.18 145)" stopOpacity="0" />
                <stop offset="50%" stopColor="oklch(0.75 0.18 145)" stopOpacity="1" />
                <stop offset="100%" stopColor="oklch(0.65 0.12 220)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {links.map((l) => {
              const a = points[l.a];
              const b = points[l.b];
              const ax = a.x, ay = a.y / 2;
              const bx = b.x, by = b.y / 2;
              const mx = (ax + bx) / 2;
              const my = (ay + by) / 2;
              const dist = Math.hypot(bx - ax, by - ay);
              // Curve upward proportionally to distance for that great-circle arc feel
              const cy = my - Math.min(18, dist * 0.35);
              const d = `M ${ax} ${ay} Q ${mx} ${cy} ${bx} ${by}`;
              const age = (Date.now() - l.start) / 2500;
              const opacity = Math.max(0, 1 - age);
              return (
                <g key={l.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="url(#arcGrad)"
                    strokeWidth="0.25"
                    opacity={opacity}
                    strokeLinecap="round"
                  />
                  <circle r="0.35" fill="oklch(0.85 0.18 145)" opacity={opacity}>
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={d} />
                  </circle>
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

          {/* Operator workstation pin — placed in middle of North America */}
          {(() => {
            const op = project(39, -98);
            return (
              <div
                className="absolute z-20 -translate-x-1/2 -translate-y-full"
                style={{ left: `${op.x}%`, top: `${op.y}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="rounded border border-terminal-green/60 bg-background/85 px-2 py-1 font-mono shadow-[0_0_12px_oklch(0.65_0.18_145_/_0.5)] backdrop-blur">
                    <div className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-terminal-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="1.5" />
                        <path d="M8 21h8M12 17v4" />
                        <path d="M6 7l3 3-3 3M11 13h5" />
                      </svg>
                      <span className="text-[10px] uppercase tracking-wider text-terminal-green">kali.shell</span>
                      <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-terminal-green" />
                    </div>
                    <div className="mt-0.5 text-[10px] text-terminal-cyan tabular-nums">{operatorIp}</div>
                  </div>
                  <div className="mt-0.5 h-3 w-px bg-terminal-green/70" />
                  <div className="h-1.5 w-1.5 rounded-full bg-terminal-green shadow-[0_0_8px_var(--terminal-green)]" />
                </div>
              </div>
            );
          })()}

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

        {/* Dashboard grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Interactive Kali shell */}
          <div className="lg:col-span-2 h-96">
            <InteractiveShell onSessionOpen={() => setPopupOpen(true)} />
          </div>

          {/* Active sessions */}
          <div className="rounded-md border border-terminal-green/30 bg-terminal p-3 font-mono text-[11px]">
            <div className="mb-2 border-b border-terminal-green/20 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              // active_sessions //
            </div>
            <div className="space-y-1.5">
              {points.slice(0, 8).map((p, i) => {
                const isActive = activeNodes.has(i);
                const isSecured = securedNodes.has(i);
                const state = !isActive ? "QUEUED" : isSecured ? "OWNED" : "BREACHING";
                const color = !isActive
                  ? "text-muted-foreground"
                  : isSecured
                  ? "text-terminal-green"
                  : "text-terminal-red";
                return (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? (isSecured ? "bg-terminal-green" : "bg-terminal-red animate-pulse") : "bg-muted-foreground/40"}`} />
                      <span className="text-foreground/80">{p.name}</span>
                    </div>
                    <span className={`text-[10px] ${color}`}>{state}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log feed */}
          <div className="lg:col-span-2 rounded-md border border-terminal-green/30 bg-terminal p-3 font-mono text-[11px] leading-relaxed">
            <div className="mb-2 flex items-center justify-between border-b border-terminal-green/20 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">// op_log //</span>
              <span className="text-[10px] text-terminal-green">streaming</span>
            </div>
            <div className="h-40 overflow-y-auto pr-1">
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

          {/* Threat matrix */}
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

          {/* Admin-only geo intel link */}
          <div className="lg:col-span-3 rounded-md border border-terminal-green/20 bg-terminal/60 p-3 font-mono text-[11px] text-muted-foreground">
            visitor geolocation intel is restricted to administrators —{" "}
            <a href="/admin" className="text-terminal-green underline underline-offset-2 hover:text-terminal-green/80">
              open /admin console
            </a>
          </div>
        </div>

      </div>
      {popupOpen && (
        <PopupTerminal
          onClose={() => setPopupOpen(false)}
          rhost={operatorIp || "10.0.0.154"}
          lhost="10.10.14.7"
        />
      )}
    </div>
  );
}

