import { useEffect, useRef, useState } from "react";

interface Step {
  prompt: string;
  cmd: string;
  output: string[];
  delay?: number;
}

const SESSIONS = [
  { host: "root@nyc-01-edge", color: "text-terminal-green" },
  { host: "root@ber-02-relay", color: "text-terminal-cyan" },
  { host: "root@tyo-11-bastion", color: "text-terminal-yellow" },
  { host: "root@lon-04-gateway", color: "text-terminal-green" },
  { host: "root@dxb-03-proxy", color: "text-terminal-cyan" },
];

const STEPS: Step[] = [
  {
    prompt: "uname -a",
    cmd: "uname -a",
    output: [
      "Linux node-edge-01 6.5.0-21-generic #21-Ubuntu SMP x86_64 GNU/Linux",
    ],
  },
  {
    prompt: "ss -tunlp | head -n 6",
    cmd: "ss -tunlp | head -n 6",
    output: [
      "Netid State  Recv-Q  Send-Q  Local Address:Port   Peer Address:Port",
      "tcp   LISTEN 0       128     0.0.0.0:22           0.0.0.0:*   sshd",
      "tcp   LISTEN 0       128     0.0.0.0:443          0.0.0.0:*   nginx",
      "tcp   LISTEN 0       128     127.0.0.1:6379       0.0.0.0:*   redis",
      "udp   UNCONN 0       0       0.0.0.0:51820        0.0.0.0:*   wireguard",
    ],
  },
  {
    prompt: "nmap -sS -p 22,80,443 10.42.0.0/24 -oG -",
    cmd: "nmap -sS -p 22,80,443 10.42.0.0/24 -oG -",
    output: [
      "Host: 10.42.0.14  Ports: 22/open/tcp//ssh//OpenSSH 9.3/, 443/open/tcp//https/",
      "Host: 10.42.0.22  Ports: 22/open/tcp//ssh//, 80/open/tcp//http/",
      "Host: 10.42.0.37  Ports: 22/open/tcp//ssh//, 443/open/tcp//https/",
      "Nmap done: 256 IP addresses (3 hosts up) scanned in 4.21 seconds",
    ],
  },
  {
    prompt: "tunnel --inject --target ber-02 --route tyo-11",
    cmd: "tunnel --inject --target ber-02 --route tyo-11",
    output: [
      "→ negotiating curve25519 handshake ...... ok",
      "→ rotating ephemeral session key ......... ok",
      "→ wrapping payload (chacha20-poly1305) ... ok",
      "tunnel up: BER-02 ⇄ TYO-11   latency=187ms   mtu=1420",
    ],
  },
  {
    prompt: "ps -eo pid,user,comm | grep -E 'sshd|nginx'",
    cmd: "ps -eo pid,user,comm | grep -E 'sshd|nginx'",
    output: [
      "  812 root      sshd",
      " 1042 www-data  nginx",
      " 1043 www-data  nginx",
      " 4421 root      sshd: phantom [priv]",
    ],
  },
  {
    prompt: "tail -f /var/log/auth.log",
    cmd: "tail -f /var/log/auth.log",
    output: [
      "sshd[4421]: Accepted publickey for phantom from 10.42.0.14 port 51422 ssh2",
      "sshd[4421]: pam_unix(sshd:session): session opened for user phantom",
      "sudo[4488]: phantom : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/tail",
    ],
  },
  {
    prompt: "curl -s https://intel.local/api/targets | jq '.active'",
    cmd: "curl -s https://intel.local/api/targets | jq '.active'",
    output: [
      "[",
      '  { "id": "T-9421", "region": "EU-WEST", "status": "owned" },',
      '  { "id": "T-9438", "region": "AP-EAST", "status": "owned" },',
      '  { "id": "T-9501", "region": "US-EAST", "status": "pending" }',
      "]",
    ],
  },
  {
    prompt: "wipe --logs --target ber-02 --confirm",
    cmd: "wipe --logs --target ber-02 --confirm",
    output: [
      "→ truncating /var/log/syslog ......... ok",
      "→ truncating /var/log/auth.log ....... ok",
      "→ overwriting wtmp/btmp (3 passes) ... ok",
      "audit trail erased — 0 artifacts remaining",
    ],
  },
];

interface Line {
  id: number;
  kind: "prompt" | "output";
  host: string;
  hostColor: string;
  text: string;
  typing?: boolean;
}

export default function TerminalConsole() {
  const [lines, setLines] = useState<Line[]>([]);
  const [cursor, setCursor] = useState(true);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const sessionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function loop() {
      while (!cancelled) {
        const session = SESSIONS[sessionRef.current % SESSIONS.length];
        const step = STEPS[stepRef.current % STEPS.length];
        stepRef.current++;
        if (stepRef.current % 3 === 0) sessionRef.current++;

        // Add empty prompt line and type it out
        const promptId = ++idRef.current;
        setLines((prev) => [
          ...prev.slice(-120),
          { id: promptId, kind: "prompt", host: session.host, hostColor: session.color, text: "", typing: true },
        ]);

        for (let i = 1; i <= step.cmd.length; i++) {
          if (cancelled) return;
          await sleep(18 + Math.random() * 35);
          setLines((prev) =>
            prev.map((l) => (l.id === promptId ? { ...l, text: step.cmd.slice(0, i) } : l)),
          );
        }
        setLines((prev) => prev.map((l) => (l.id === promptId ? { ...l, typing: false } : l)));
        await sleep(280);

        for (const out of step.output) {
          if (cancelled) return;
          await sleep(110 + Math.random() * 160);
          setLines((prev) => [
            ...prev.slice(-120),
            { id: ++idRef.current, kind: "output", host: session.host, hostColor: session.color, text: out },
          ]);
        }
        await sleep(step.delay ?? 600);
      }
    }

    loop();
    const blink = setInterval(() => setCursor((c) => !c), 530);
    return () => {
      cancelled = true;
      clearInterval(blink);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-terminal-green/30 bg-terminal font-mono">
      <div className="flex items-center justify-between border-b border-terminal-green/20 px-3 py-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-terminal-red" />
          <span className="h-2 w-2 rounded-full bg-terminal-yellow" />
          <span className="h-2 w-2 rounded-full bg-terminal-green" />
          <span className="ml-2">// tty0 — active operator shell //</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{SESSIONS.length} sessions</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
        {lines.map((l) => {
          if (l.kind === "prompt") {
            return (
              <div key={l.id} className="flex flex-wrap gap-1">
                <span className={l.hostColor}>{l.host}</span>
                <span className="text-muted-foreground">:~#</span>
                <span className="text-foreground break-all">{l.text}</span>
                {l.typing && cursor && <span className="text-terminal-green">▋</span>}
              </div>
            );
          }
          const out = l.text;
          const color =
            out.includes("ok") || out.includes("up:") || out.includes("Accepted") || out.includes("erased")
              ? "text-terminal-green"
              : out.includes("owned") || out.includes("pending")
              ? "text-terminal-cyan"
              : "text-muted-foreground";
          return (
            <div key={l.id} className={`pl-3 break-all ${color}`}>
              {out}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
