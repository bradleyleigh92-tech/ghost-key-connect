import { useEffect, useRef, useState, KeyboardEvent } from "react";

interface Line {
  id: number;
  kind: "prompt" | "out" | "err" | "ok";
  text: string;
}

const PROMPT_USER = "root@kali";
const PROMPT_HOST = "~";

let idCounter = 0;
const nextId = () => ++idCounter;

function fakeFiles() {
  return [
    "Desktop", "Documents", "Downloads", "exploits", "loot",
    "payloads", "sessions.db", "tunnel.conf", "notes.md",
  ];
}

function exec(raw: string): Line[] {
  const cmd = raw.trim();
  if (!cmd) return [];
  const [bin, ...args] = cmd.split(/\s+/);
  const arg = args.join(" ");
  const out = (text: string, kind: Line["kind"] = "out") =>
    text.split("\n").map((t) => ({ id: nextId(), kind, text: t }));

  switch (bin) {
    case "help":
      return out(
        "available: ls, pwd, cd, whoami, id, uname, ifconfig, ip, ps, netstat,\n" +
        "          cat, echo, date, uptime, history, clear, ssh, nmap,\n" +
        "          msfconsole, use, set, run, exploit, sessions, sysinfo, exit",
      );
    case "ls":
      return out(fakeFiles().join("  "));
    case "pwd":
      return out("/root");
    case "cd":
      return [];
    case "whoami":
      return out("root");
    case "id":
      return out("uid=0(root) gid=0(root) groups=0(root)");
    case "uname":
      if (args.includes("-a"))
        return out("Linux kali 6.5.0-kali3-amd64 #1 SMP PREEMPT_DYNAMIC Debian x86_64 GNU/Linux");
      return out("Linux");
    case "date":
      return out(new Date().toString());
    case "uptime":
      return out(" 04:21:09 up 3 days,  7:14,  2 users,  load average: 0.42, 0.38, 0.31");
    case "ifconfig":
    case "ip":
      return out(
        "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n" +
        "        inet 192.168.109.128  netmask 255.255.255.0  broadcast 192.168.109.255\n" +
        "        inet6 fe80::20c:29ff:fe5b:11e2  prefixlen 64  scopeid 0x20<link>\n" +
        "        ether 00:0c:29:5b:11:e2  txqueuelen 1000  (Ethernet)\n" +
        "tun0:  flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1420\n" +
        "        inet 10.10.14.7  netmask 255.255.254.0  destination 10.10.14.7",
      );
    case "ps":
      return out(
        "  PID TTY          TIME CMD\n" +
        "  812 ?        00:00:01 sshd\n" +
        " 1042 ?        00:00:04 nginx\n" +
        " 4421 pts/0    00:00:00 bash\n" +
        " 4488 pts/0    00:00:00 msfconsole",
      );
    case "netstat":
      return out(
        "Proto Recv-Q Send-Q Local Address           Foreign Address         State\n" +
        "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\n" +
        "tcp        0      0 0.0.0.0:4444            0.0.0.0:*               LISTEN\n" +
        "tcp        0     52 192.168.109.128:51422   10.10.14.7:443          ESTABLISHED",
      );
    case "cat":
      if (arg === "/etc/shadow") return out("cat: /etc/shadow: Permission denied", "err");
      if (arg === "notes.md") return out("- finish privesc on TYO-11\n- rotate keys before sunrise");
      return out(`cat: ${arg || "missing operand"}: No such file or directory`, "err");
    case "echo":
      return out(arg);
    case "history":
      return out("  1  ifconfig\n  2  nmap -sS 10.10.14.0/24\n  3  msfconsole");
    case "ssh":
      return out(`ssh: connect to host ${arg || "host"} port 22: Operation in progress...\nLast login: ${new Date().toUTCString()}`);
    case "nmap": {
      const tgt = arg || "scanme.nmap.org";
      return out(
        `Starting Nmap 7.95 ( https://nmap.org ) at ${new Date().toISOString()}\n` +
        `Nmap scan report for ${tgt}\n` +
        `Host is up (0.0042s latency).\n` +
        `PORT     STATE  SERVICE\n` +
        `22/tcp   open   ssh\n` +
        `80/tcp   open   http\n` +
        `443/tcp  open   https\n` +
        `4444/tcp open   krb524\n` +
        `Nmap done: 1 IP address (1 host up) scanned in 3.21 seconds`,
      );
    }
    case "msfconsole":
      return [
        ...out("       =[ metasploit v6.4.12-dev                          ]"),
        ...out("+ -- --=[ 2384 exploits - 1232 auxiliary - 415 post       ]"),
        ...out("+ -- --=[ 1391 payloads - 46 encoders - 11 nops            ]"),
        ...out("msf6 > ", "ok"),
      ];
    case "use":
      return out(`[*] No payload configured, defaulting to ${arg.includes("windows") ? "windows/x64/meterpreter/reverse_tcp" : "linux/x64/meterpreter/reverse_tcp"}`);
    case "set":
      return out(`${args[0] ?? ""} => ${args.slice(1).join(" ")}`);
    case "sessions":
      return out("Active sessions\n===============\n  Id  Name  Type                   Information\n  --  ----  ----                   -----------\n  1         meterpreter x64/linux  root @ 192.168.109.128");
    case "sysinfo":
      return out("Computer     : KALI-OPS\nOS           : Linux 6.5.0 kali3-amd64\nArchitecture : x64\nMeterpreter  : x64/linux");
    case "exit":
    case "quit":
      return out("logout");
    case "clear":
      return [{ id: -1, kind: "out", text: "__CLEAR__" }];
    case "run":
    case "exploit":
      return [
        ...out("[*] Started reverse TCP handler on 10.10.14.7:4444"),
        ...out("[*] Sending stage (3045348 bytes) to target..."),
        ...out("[*] Meterpreter session 1 opened (10.10.14.7:4444 -> 192.168.109.128:51422)", "ok"),
        ...out("meterpreter > ", "ok"),
      ];
    default:
      // Unknown / arbitrary command → simulate exploit chain → meterpreter
      return [
        ...out(`[*] executing payload via '${bin}' ...`),
        ...out("[*] handshake: curve25519 negotiated"),
        ...out("[*] staging x64/meterpreter/reverse_tcp"),
        ...out("[+] Meterpreter session opened — target compromised", "ok"),
      ];
  }
}

export default function InteractiveShell() {
  const [lines, setLines] = useState<Line[]>([
    { id: nextId(), kind: "out", text: "Kali GNU/Linux Rolling — interactive shell (type 'help')" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const submit = () => {
    const raw = input;
    const newLines: Line[] = [
      { id: nextId(), kind: "prompt", text: raw },
    ];
    const result = exec(raw);
    if (result.length === 1 && result[0].text === "__CLEAR__") {
      setLines([]);
    } else {
      setLines((prev) => [...prev, ...newLines, ...result].slice(-400));
    }
    if (raw.trim()) setHistory((h) => [...h, raw]);
    setInput("");
    setHIdx(-1);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const ni = hIdx === -1 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(ni);
      setInput(history[ni]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx === -1) return;
      const ni = hIdx + 1;
      if (ni >= history.length) {
        setHIdx(-1);
        setInput("");
      } else {
        setHIdx(ni);
        setInput(history[ni]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-md border border-terminal-green/30 bg-terminal font-mono"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center justify-between border-b border-terminal-green/20 px-3 py-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-terminal-red" />
          <span className="h-2 w-2 rounded-full bg-terminal-yellow" />
          <span className="h-2 w-2 rounded-full bg-terminal-green" />
          <span className="ml-2">// {PROMPT_USER} — interactive //</span>
        </div>
        <span className="text-[10px] text-muted-foreground">type help</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
        {lines.map((l) => {
          if (l.kind === "prompt") {
            return (
              <div key={l.id} className="flex flex-wrap gap-1">
                <span className="text-terminal-green">{PROMPT_USER}</span>
                <span className="text-muted-foreground">:{PROMPT_HOST}#</span>
                <span className="text-foreground break-all">{l.text}</span>
              </div>
            );
          }
          const color =
            l.kind === "err"
              ? "text-terminal-red"
              : l.kind === "ok"
              ? "text-terminal-green"
              : "text-muted-foreground";
          return (
            <div key={l.id} className={`whitespace-pre-wrap break-all ${color}`}>
              {l.text}
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-1">
          <span className="text-terminal-green">{PROMPT_USER}</span>
          <span className="text-muted-foreground">:{PROMPT_HOST}#</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/40"
            placeholder=""
          />
          <span className="animate-pulse text-terminal-green">▋</span>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
