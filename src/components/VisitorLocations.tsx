import { useEffect, useState } from "react";

interface Visit {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  ts: number;
}

const STORAGE_KEY = "phantom_visitor_log_v1";

function loadVisits(): Visit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function VisitorLocations() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [status, setStatus] = useState<"idle" | "fetching" | "ok" | "err">("idle");

  useEffect(() => {
    setVisits(loadVisits());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchLoc() {
      setStatus("fetching");
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("net");
        const j = await res.json();
        if (cancelled) return;
        const v: Visit = {
          ip: j.ip ?? "unknown",
          city: j.city,
          region: j.region,
          country: j.country_name,
          org: j.org ?? j.asn,
          lat: j.latitude,
          lon: j.longitude,
          timezone: j.timezone,
          ts: Date.now(),
        };
        setVisits((prev) => {
          // dedupe by ip within 6h, otherwise append
          const sixH = 6 * 60 * 60 * 1000;
          const filtered = prev.filter(
            (p) => !(p.ip === v.ip && Date.now() - p.ts < sixH),
          );
          const next = [v, ...filtered].slice(0, 25);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("err");
      }
    }
    fetchLoc();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-md border border-terminal-green/30 bg-terminal p-3 font-mono text-[11px]">
      <div className="mb-2 flex items-center justify-between border-b border-terminal-green/20 pb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          // visitor_geo_intel //
        </span>
        <span
          className={`text-[10px] ${
            status === "ok"
              ? "text-terminal-green"
              : status === "err"
              ? "text-terminal-red"
              : "text-terminal-yellow"
          }`}
        >
          {status === "fetching" ? "resolving…" : status === "err" ? "geo-api blocked" : `${visits.length} entries`}
        </span>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {visits.length === 0 && (
          <div className="text-muted-foreground">no visitor records yet — awaiting beacon</div>
        )}
        {visits.map((v, i) => (
          <div key={`${v.ip}-${v.ts}-${i}`} className="rounded border border-terminal-green/15 bg-background/40 p-2">
            <div className="flex items-center justify-between">
              <span className="text-terminal-green">{v.ip}</span>
              <span className="text-[9px] text-muted-foreground">
                {new Date(v.ts).toLocaleString()}
              </span>
            </div>
            <div className="mt-0.5 text-foreground/80">
              {[v.city, v.region, v.country].filter(Boolean).join(", ") || "unknown location"}
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
              <span>
                lat: <span className="text-terminal-cyan">{v.lat ?? "—"}</span>
              </span>
              <span>
                lon: <span className="text-terminal-cyan">{v.lon ?? "—"}</span>
              </span>
              <span className="col-span-2 truncate">
                isp: <span className="text-terminal-yellow">{v.org ?? "—"}</span>
              </span>
              {v.timezone && (
                <span className="col-span-2">
                  tz: <span className="text-foreground/70">{v.timezone}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
