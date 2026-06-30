import { useEffect, useRef, useState, KeyboardEvent } from "react";

interface Line {
  id: number;
  kind: "prompt" | "out" | "err" | "ok" | "warn" | "ask";
  text: string;
}

type Mode =
  | { kind: "shell" }
  | { kind: "msf" }
  | { kind: "ask_lhost"; payload: string }
  | { kind: "ask_rhost"; payload: string; lhost: string }
  | { kind: "ask_lport"; payload: string; lhost: string; rhost: string }
  | { kind: "meterpreter" };

let idCounter = 0;
const nextId = () => ++idCounter;
const mk = (text: string, kind: Line["kind"] = "out"): Line[] =>
  text.split("\n").map((t) => ({ id: nextId(), kind, text: t }));

const FILES = ["Desktop", "Documents", "Downloads", "exploits", "loot", "payloads", "sessions.db", "tunnel.conf", "notes.md"];

function basicCommand(bin: string, args: string[], arg: string): Line[] | null {
  switch (bin) {
    case "help":
      return mk(
        "shell:        ls, pwd, cd, whoami, id, uname, ifconfig, ip, ps,\n" +
        "              netstat, cat, echo, date, uptime, history, clear,\n" +
        "              ssh, nmap, msfconsole, exit\n" +
        "metasploit:   use <module>, set LHOST/RHOST/LPORT, exploit, run,\n" +
        "              sessions, sysinfo, back",
      );
    case "ls": return mk(FILES.join("  "));
    case "pwd": return mk("/root");
    case "cd": return [];
    case "whoami": return mk("root");
    case "id": return mk("uid=0(root) gid=0(root) groups=0(root)");
    case "uname":
      return args.includes("-a")
        ? mk("Linux kali 6.5.0-kali3-amd64 #1 SMP PREEMPT_DYNAMIC Debian x86_64 GNU/Linux")
        : mk("Linux");
    case "date": return mk(new Date().toString());
    case "uptime": return mk(" 04:21:09 up 3 days,  7:14,  2 users,  load average: 0.42, 0.38, 0.31");
    case "ifconfig":
    case "ip":
      return mk(
        "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n" +
        "        inet 10.0.0.154  netmask 255.255.255.0  broadcast 10.0.0.255\n" +
        "        ether 00:0c:29:5b:11:e2  txqueuelen 1000  (Ethernet)\n" +
        "tun0:   inet 10.10.14.7  netmask 255.255.254.0  mtu 1420",
      );
    case "ps":
      return mk(
        "  PID TTY          TIME CMD\n  812 ?        00:00:01 sshd\n 1042 ?        00:00:04 nginx\n 4421 pts/0    00:00:00 bash",
      );
    case "netstat":
      return mk(
        "Proto Recv-Q Send-Q Local Address           Foreign Address         State\n" +
        "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\n" +
        "tcp        0      0 0.0.0.0:4444            0.0.0.0:*               LISTEN",
      );
    case "cat":
      if (arg === "/etc/shadow") return mk("cat: /etc/shadow: Permission denied", "err");
      if (arg === "notes.md") return mk("- finish privesc on TYO-11\n- rotate keys before sunrise");
      return mk(`cat: ${arg || "missing operand"}: No such file or directory`, "err");
    case "echo": return mk(arg);
    case "history": return mk("  1  ifconfig\n  2  nmap -sS 10.10.14.0/24\n  3  msfconsole");
    case "ssh": return mk(`ssh: connect to host ${arg || "host"} port 22: Operation in progress...`);
    case "nmap": {
      const tgt = arg || "scanme.nmap.org";
      return mk(
        `Starting Nmap 7.95 at ${new Date().toISOString()}\nNmap scan report for ${tgt}\nHost is up (0.0042s latency).\nPORT     STATE  SERVICE\n22/tcp   open   ssh\n80/tcp   open   http\n443/tcp  open   https\n4444/tcp open   krb524\nNmap done: 1 IP address scanned in 3.21 seconds`,
      );
    }
    default: return null;
  }
}

export default function InteractiveShell({ onSessionOpen }: { onSessionOpen?: () => void } = {}) {
  const [lines, setLines] = useState<Line[]>([
    ...mk("░ K A L I   O P E R A T O R   S H E L L ░", "ok"),
    ...mk("Kali GNU/Linux Rolling — type 'help'  ·  enter 'exploit' to launch payload chain"),
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "shell" });
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState<number>(-1);
  const [opts, setOpts] = useState<{ payload?: string; LHOST?: string; RHOST?: string; LPORT?: string }>({
    payload: "linux/x64/meterpreter/reverse_tcp",
    LPORT: "4444",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [lines]);

  const append = (next: Line[]) => setLines((p) => [...p, ...next].slice(-500));

  const promptLabel = (): { user: string; host: string; sym: string; color: string } => {
    if (mode.kind === "meterpreter") return { user: "meterpreter", host: "", sym: ">", color: "text-terminal-cyan" };
    if (mode.kind === "msf") return { user: "msf6", host: "", sym: ">", color: "text-terminal-red" };
    if (mode.kind === "ask_lhost") return { user: "set", host: "LHOST", sym: "»", color: "text-terminal-yellow" };
    if (mode.kind === "ask_rhost") return { user: "set", host: "RHOST", sym: "»", color: "text-terminal-yellow" };
    if (mode.kind === "ask_lport") return { user: "set", host: "LPORT", sym: "»", color: "text-terminal-yellow" };
    return { user: "root@kali", host: "~", sym: "#", color: "text-terminal-green" };
  };

  const startExploitFlow = (payload?: string) => {
    const p = payload || opts.payload || "linux/x64/meterpreter/reverse_tcp";
    append(mk(`[*] preparing payload: ${p}`, "warn"));
    if (!opts.LHOST) {
      append(mk("[?] LHOST not set — enter attacker IP (e.g. 10.10.14.7):", "ask"));
      setMode({ kind: "ask_lhost", payload: p });
      return;
    }
    if (!opts.RHOST) {
      append(mk("[?] RHOST not set — enter target IP (e.g. 10.0.0.154):", "ask"));
      setMode({ kind: "ask_rhost", payload: p, lhost: opts.LHOST });
      return;
    }
    finalizeExploit(p, opts.LHOST, opts.RHOST, opts.LPORT || "4444");
  };

  const finalizeExploit = (payload: string, lhost: string, rhost: string, lport: string) => {
    append([
      ...mk(`[*] payload   => ${payload}`),
      ...mk(`[*] LHOST     => ${lhost}`),
      ...mk(`[*] RHOST     => ${rhost}`),
      ...mk(`[*] LPORT     => ${lport}`),
      ...mk(`[*] Started reverse TCP handler on ${lhost}:${lport}`),
      ...mk(`[*] ${rhost} - sending exploit ...`),
      ...mk(`[*] ${rhost} - staging x64/meterpreter (3045348 bytes) ...`),
      ...mk(`[+] Meterpreter session 1 opened (${lhost}:${lport} -> ${rhost}:51422)`, "ok"),
    ]);
    setMode({ kind: "meterpreter" });
    onSessionOpen?.();
  };

  const submit = () => {
    const raw = input;
    const trimmed = raw.trim();
    const p = promptLabel();
    const echo: Line = {
      id: nextId(),
      kind: "prompt",
      text: `${p.user}${p.host ? ":" + p.host : ""}${p.sym} ${raw}`,
    };
    setLines((prev) => [...prev, echo].slice(-500));
    setInput("");
    setHIdx(-1);
    if (trimmed) setHistory((h) => [...h, trimmed]);

    // Interactive prompts
    if (mode.kind === "ask_lhost") {
      if (!trimmed) { append(mk("LHOST is required.", "err")); return; }
      setOpts((o) => ({ ...o, LHOST: trimmed }));
      append(mk(`LHOST => ${trimmed}`));
      if (!opts.RHOST) {
        append(mk("[?] enter RHOST (target IP):", "ask"));
        setMode({ kind: "ask_rhost", payload: mode.payload, lhost: trimmed });
      } else {
        finalizeExploit(mode.payload, trimmed, opts.RHOST, opts.LPORT || "4444");
      }
      return;
    }
    if (mode.kind === "ask_rhost") {
      if (!trimmed) { append(mk("RHOST is required.", "err")); return; }
      setOpts((o) => ({ ...o, RHOST: trimmed }));
      append(mk(`RHOST => ${trimmed}`));
      append(mk("[?] enter LPORT (or press Enter for 4444):", "ask"));
      setMode({ kind: "ask_lport", payload: mode.payload, lhost: mode.lhost, rhost: trimmed });
      return;
    }
    if (mode.kind === "ask_lport") {
      const lport = trimmed || "4444";
      setOpts((o) => ({ ...o, LPORT: lport }));
      finalizeExploit(mode.payload, mode.lhost, mode.rhost, lport);
      return;
    }

    if (!trimmed) return;
    const [bin, ...args] = trimmed.split(/\s+/);
    const arg = args.join(" ");

    if (bin === "clear") { setLines([]); return; }
    if (bin === "exit" || bin === "quit") {
      if (mode.kind === "meterpreter") { append(mk("[*] Shutting down Meterpreter...", "warn")); setMode({ kind: "msf" }); return; }
      if (mode.kind === "msf") { append(mk("logout")); setMode({ kind: "shell" }); return; }
      append(mk("logout")); return;
    }
    if (bin === "back") {
      if (mode.kind === "msf") { setMode({ kind: "shell" }); return; }
    }

    // Meterpreter-specific
    if (mode.kind === "meterpreter") {
      switch (bin) {
        case "sysinfo": append(mk("Computer     : KALI-OPS\nOS           : Linux 6.5.0\nArchitecture : x64\nMeterpreter  : x64/linux")); return;
        case "getuid": append(mk("Server username: root")); return;
        case "pwd": append(mk("/root")); return;
        case "ls": append(mk(FILES.join("  "))); return;
        case "shell": append(mk("Process 4488 created.\nChannel 1 created.")); return;
        case "screenshot": append(mk("Screenshot saved to: /root/loot/screen_" + Date.now() + ".jpeg", "ok")); return;
        case "download": append(mk(`[*] downloading: ${arg || "file"} -> /root/loot/`, "ok")); return;
        case "help": append(mk("meterpreter: sysinfo, getuid, pwd, ls, shell, screenshot, download <f>, sessions, exit")); return;
        case "sessions": append(mk("Active sessions\n===============\n  1   meterpreter  x64/linux  root @ " + (opts.RHOST || "target"))); return;
        default: append(mk(`[-] Unknown meterpreter command: ${bin}`, "err")); return;
      }
    }

    // Set LHOST/RHOST/LPORT/payload directly
    if (bin === "set" && args.length >= 2) {
      const key = args[0].toUpperCase();
      const val = args.slice(1).join(" ");
      if (key === "LHOST" || key === "RHOST" || key === "LPORT" || key === "PAYLOAD") {
        setOpts((o) => ({ ...o, [key === "PAYLOAD" ? "payload" : key]: val }));
        append(mk(`${key} => ${val}`));
        return;
      }
    }
    if (bin === "show" && args[0] === "options") {
      append(mk(
        `Module options:\n  PAYLOAD   ${opts.payload}\n  LHOST     ${opts.LHOST || "<not set>"}\n  RHOST     ${opts.RHOST || "<not set>"}\n  LPORT     ${opts.LPORT}`,
      ));
      return;
    }

    if (bin === "msfconsole") {
      append([
        ...mk("       =[ metasploit v6.4.12-dev                          ]"),
        ...mk("+ -- --=[ 2384 exploits - 1232 auxiliary - 415 post       ]"),
        ...mk("+ -- --=[ 1391 payloads - 46 encoders - 11 nops            ]"),
      ]);
      setMode({ kind: "msf" });
      return;
    }
    if (bin === "use") {
      append(mk(`[*] Using module: ${arg || "exploit/multi/handler"}`));
      setMode({ kind: "msf" });
      return;
    }

    if (bin === "exploit" || bin === "run") {
      startExploitFlow();
      return;
    }
    if (bin === "sessions") {
      append(mk("Active sessions\n===============\n  No active sessions.")); return;
    }

    const basic = basicCommand(bin, args, arg);
    if (basic) { append(basic); return; }

    // Unknown command → trigger exploit-style flow (still asks LHOST/RHOST first)
    append(mk(`[*] '${bin}' not recognized — escalating via payload chain`, "warn"));
    startExploitFlow();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const ni = hIdx === -1 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(ni); setInput(history[ni]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx === -1) return;
      const ni = hIdx + 1;
      if (ni >= history.length) { setHIdx(-1); setInput(""); }
      else { setHIdx(ni); setInput(history[ni]); }
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([]); }
  };

  const p = promptLabel();
  const modeBadge =
    mode.kind === "meterpreter" ? { text: "METERPRETER", color: "text-terminal-cyan border-terminal-cyan/50" }
    : mode.kind === "msf" ? { text: "MSF6", color: "text-terminal-red border-terminal-red/50" }
    : mode.kind.startsWith("ask_") ? { text: "AWAITING INPUT", color: "text-terminal-yellow border-terminal-yellow/50" }
    : { text: "SHELL", color: "text-terminal-green border-terminal-green/50" };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-md font-mono"
      onClick={() => inputRef.current?.focus()}
      style={{
        background:
          "linear-gradient(180deg, oklch(0.05 0.02 260) 0%, oklch(0.03 0.01 260) 100%)",
        boxShadow:
          "0 0 0 1px oklch(0.65 0.18 145 / 0.45), inset 0 0 40px oklch(0.65 0.18 145 / 0.08), 0 0 24px oklch(0.65 0.18 145 / 0.2)",
      }}
    >
      {/* Corner brackets — distinct look */}
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-terminal-green" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-terminal-green" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-terminal-green" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-terminal-green" />

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 scanlines opacity-25" />

      {/* Title bar */}
      <div className="relative flex items-center justify-between border-b border-terminal-green/40 bg-terminal-green/[0.04] px-3 py-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-terminal-green" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-terminal-green">
            tty.phantom //
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            operator shell · pid 4421
          </span>
        </div>
        <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${modeBadge.color}`}>
          {modeBadge.text}
        </span>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
        {lines.map((l) => {
          if (l.kind === "prompt") {
            return (
              <div key={l.id} className="text-foreground/90 break-all">
                <span className="text-terminal-green">›</span> {l.text}
              </div>
            );
          }
          const color =
            l.kind === "err" ? "text-terminal-red"
            : l.kind === "ok" ? "text-terminal-green"
            : l.kind === "warn" ? "text-terminal-yellow"
            : l.kind === "ask" ? "text-terminal-cyan"
            : "text-muted-foreground";
          return (
            <div key={l.id} className={`whitespace-pre-wrap break-all ${color}`}>{l.text}</div>
          );
        })}
        <div className="mt-1 flex items-center gap-1.5">
          <span className={p.color}>{p.user}{p.host ? <span className="text-muted-foreground">:{p.host}</span> : null}</span>
          <span className="text-muted-foreground">{p.sym}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-foreground caret-terminal-green outline-none"
          />
          <span className="h-3 w-2 animate-pulse bg-terminal-green" />
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Status bar */}
      <div className="relative flex items-center justify-between border-t border-terminal-green/40 bg-terminal-green/[0.04] px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>LHOST: <span className="text-terminal-green">{opts.LHOST || "—"}</span></span>
        <span>RHOST: <span className="text-terminal-red">{opts.RHOST || "—"}</span></span>
        <span>LPORT: <span className="text-terminal-yellow">{opts.LPORT}</span></span>
        <span>SESSIONS: <span className="text-terminal-cyan">{mode.kind === "meterpreter" ? 1 : 0}</span></span>
      </div>
    </div>
  );
}
