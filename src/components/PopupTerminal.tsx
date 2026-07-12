import { useEffect, useRef, useState } from "react";

interface Props {
  onClose: () => void;
  rhost?: string;
  lhost?: string;
}

const BOOT_LINES = [
  "[*] post-exploitation channel attached (session 1)",
  "[*] negotiating AES-256-GCM transport keys ...",
  "[+] secure tunnel ready — pty allocated /dev/pts/2",
  "[*] mounting remote filesystem (read/write) ...",
  "[+] remote host responsive — latency 41ms",
  "uid=0(root) gid=0(root) groups=0(root)",
  "Last login: Sat Jun 27 04:21:09 2026 from 10.10.14.7",
];

type ConfigStep = "module" | "target" | "port" | "channel" | "interval" | "done";

interface ConfigState {
  step: ConfigStep;
  values: Partial<Record<"module" | "target" | "port" | "channel" | "interval", string>>;
}

const CONFIG_PROMPTS: Record<Exclude<ConfigStep, "done">, { label: string; hint: string; def: string }> = {
  module:   { label: "module",            hint: "e.g. recon / persistence / relay", def: "relay" },
  target:   { label: "target host",       hint: "ip or hostname",                   def: "" },
  port:     { label: "listening port",    hint: "1-65535",                          def: "4444" },
  channel:  { label: "transport channel", hint: "tcp / tls / ws",                   def: "tls" },
  interval: { label: "beacon interval",   hint: "seconds",                          def: "30" },
};

export default function PopupTerminal({ onClose, rhost = "target", lhost = "operator" }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cwd = "/root";

  // Boot sequence
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setLines((p) => [...p, BOOT_LINES[i]]);
      i++;
      if (i >= BOOT_LINES.length) clearInterval(id);
    }, 240);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [lines]);

  const startConfig = () => {
    setConfig({ step: "module", values: {} });
    setLines((p) => [
      ...p,
      "[*] launching configuration wizard ...",
      "[*] type 'cancel' at any prompt to abort.",
    ]);
  };

  const advanceConfig = (raw: string) => {
    if (!config) return;
    const val = raw.trim();
    if (val.toLowerCase() === "cancel") {
      setLines((p) => [...p, "[!] configuration cancelled."]);
      setConfig(null);
      return;
    }
    const step = config.step as Exclude<ConfigStep, "done">;
    const meta = CONFIG_PROMPTS[step];
    const chosen = val || meta.def;
    if (!chosen) {
      setLines((p) => [...p, `[!] ${meta.label} is required.`]);
      return;
    }
    const nextValues = { ...config.values, [step]: chosen };
    const order: ConfigStep[] = ["module", "target", "port", "channel", "interval", "done"];
    const nextStep = order[order.indexOf(step) + 1];
    setLines((p) => [...p, `    ${meta.label} => ${chosen}`]);
    if (nextStep === "done") {
      const id = Math.random().toString(16).slice(2, 10).toUpperCase();
      const ts = new Date().toISOString();
      setLines((p) => [
        ...p,
        "",
        "[*] generating configuration ...",
        "┌──────────────── CONFIGURATION ────────────────┐",
        `│ profile_id   : cfg-${id}`,
        `│ module       : ${nextValues.module}`,
        `│ target       : ${nextValues.target}`,
        `│ port         : ${nextValues.port}`,
        `│ channel      : ${nextValues.channel}`,
        `│ interval     : ${nextValues.interval}s`,
        `│ operator     : ${lhost}`,
        `│ remote       : ${rhost}`,
        `│ generated_at : ${ts}`,
        "└───────────────────────────────────────────────┘",
        "[+] configuration written to /root/.spm/profile.cfg",
        "[+] ready. invoke 'start spm' to load this profile.",
      ]);
      setConfig(null);
    } else {
      setConfig({ step: nextStep, values: nextValues });
    }
  };

  const runStartSpm = () => {
    const seq = [
      "[*] spm :: secure profile manager v2.4.1",
      "[*] loading /root/.spm/profile.cfg ...",
      "[*] verifying signature ...",
      "[+] signature OK",
      "[*] negotiating relay handshake ...",
      "[*] binding listener ...",
      "[+] spm runtime online — awaiting tasks.",
    ];
    seq.forEach((line, i) => {
      setTimeout(() => setLines((p) => [...p, line]), 220 * (i + 1));
    });
  };

  const run = (raw: string) => {
    const trimmed = raw.trim();
    setLines((p) => [...p, `root@${rhost}:${cwd}# ${raw}`]);
    if (!trimmed) return;
    setHistory((h) => [...h, trimmed]);

    if (trimmed === "start spm") { runStartSpm(); return; }

    const [bin, ...args] = trimmed.split(/\s+/);
    const arg = args.join(" ");
    const out: string[] = [];
    switch (bin) {
      case "help":
        out.push("commands: ls, pwd, whoami, id, uname, ifconfig, ps, cat, echo, date,");
        out.push("          configure, start spm, history, clear, exit");
        break;
      case "configure": startConfig(); return;
      case "ls": out.push("Desktop  Documents  Downloads  loot  notes.md  profile.cfg  sessions.db"); break;
      case "pwd": out.push(cwd); break;
      case "whoami": out.push("root"); break;
      case "id": out.push("uid=0(root) gid=0(root) groups=0(root)"); break;
      case "uname": out.push(args.includes("-a") ? "Linux target 6.5.0 #1 SMP x86_64 GNU/Linux" : "Linux"); break;
      case "date": out.push(new Date().toString()); break;
      case "history": out.push(history.map((h, i) => `  ${i + 1}  ${h}`).join("\n") || "  (empty)"); break;
      case "ifconfig":
        out.push(`eth0: inet ${rhost}  netmask 255.255.255.0`);
        out.push(`tun0: inet ${lhost}  mtu 1420`);
        break;
      case "ps":
        out.push("  PID TTY          TIME CMD\n  812 ?        00:00:01 sshd\n 4488 pts/2    00:00:00 bash");
        break;
      case "cat":
        if (arg === "notes.md") out.push("- secondary channel verified\n- maintain persistence");
        else if (!arg) out.push("cat: missing operand");
        else out.push(`cat: ${arg}: No such file or directory`);
        break;
      case "echo": out.push(arg); break;
      case "clear": setLines([]); return;
      case "exit": onClose(); return;
      default: out.push(`bash: ${bin}: command not found`);
    }
    setLines((p) => [...p, ...out.flatMap((s) => s.split("\n"))]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="pointer-events-auto absolute inset-0 bg-background/70"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-terminal-cyan/60 font-mono shadow-[0_0_60px_oklch(0.65_0.12_220_/_0.45)]"
        style={{
          background: "linear-gradient(180deg, oklch(0.06 0.02 230) 0%, oklch(0.04 0.01 230) 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-terminal-cyan/40 bg-terminal-cyan/[0.06] px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <button onClick={onClose} className="h-2.5 w-2.5 rounded-full bg-terminal-red hover:opacity-80" aria-label="Close" />
              <span className="h-2.5 w-2.5 rounded-full bg-terminal-yellow" />
              <span className="h-2.5 w-2.5 rounded-full bg-terminal-green" />
            </div>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.3em] text-terminal-cyan">
              session_1 // remote://{rhost}
            </span>
          </div>
          <span className="rounded-sm border border-terminal-cyan/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-terminal-cyan">
            CONNECTED
          </span>
        </div>

        {/* Body */}
        <div
          className="h-[420px] overflow-y-auto px-3 py-2 text-[12px] leading-relaxed"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="text-terminal-cyan">░ R E M O T E   S E S S I O N   1 ░</div>
          <div className="mb-2 text-muted-foreground">Connected to {rhost} via meterpreter — type 'help', 'configure', or 'exit'.</div>
          {lines.map((l, i) => {
            const color = l.startsWith("root@") ? "text-foreground/90"
              : l.startsWith("[+]") ? "text-terminal-green"
              : l.startsWith("[*]") ? "text-terminal-yellow"
              : l.startsWith("[!]") || l.startsWith("bash:") || l.startsWith("cat:") ? "text-terminal-red"
              : l.startsWith("┌") || l.startsWith("│") || l.startsWith("└") ? "text-terminal-cyan"
              : "text-muted-foreground";
            return <div key={i} className={`whitespace-pre-wrap break-all ${color}`}>{l}</div>;
          })}
          {config && (() => {
            const meta = CONFIG_PROMPTS[config.step as Exclude<ConfigStep, "done">];
            return (
              <div className="mt-1 text-[11px] text-terminal-cyan/80">
                ? {meta.label} <span className="text-muted-foreground">({meta.hint}{meta.def ? `, default: ${meta.def}` : ""})</span>
              </div>
            );
          })()}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-terminal-cyan">{config ? "spm-cfg" : `root@${rhost}`}</span>
            <span className="text-muted-foreground">{config ? " >" : `:${cwd}#`}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (config) { setLines((p) => [...p, `spm-cfg > ${input}`]); advanceConfig(input); }
                  else { run(input); }
                  setInput(""); setHIdx(-1);
                }
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
              }}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-foreground caret-terminal-cyan outline-none"
            />
            <span className="h-3 w-2 animate-pulse bg-terminal-cyan" />
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-terminal-cyan/40 bg-terminal-cyan/[0.06] px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>CHANNEL: <span className="text-terminal-cyan">aes256-gcm</span></span>
          <span>HOST: <span className="text-terminal-green">{rhost}</span></span>
          <span>VIA: <span className="text-terminal-yellow">{lhost}</span></span>
          <span>PTY: <span className="text-terminal-cyan">/dev/pts/2</span></span>
        </div>
      </div>
    </div>
  );
}
