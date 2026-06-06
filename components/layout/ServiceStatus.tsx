"use client";

import { useEffect, useState } from "react";

type Status = "ok" | "degraded" | "error" | "loading";

interface HealthData {
  status: Status;
  checks: {
    db: boolean;
    ollama: boolean;
    ffmpeg: boolean;
    python: boolean;
  };
}

const DOT: Record<Status, string> = {
  ok: "bg-green-400",
  degraded: "bg-yellow-400",
  error: "bg-red-400",
  loading: "bg-muted-foreground animate-pulse",
};

const LABEL: Record<Status, string> = {
  ok: "Todos los servicios activos",
  degraded: "Servicios parciales",
  error: "Servicios no disponibles",
  loading: "Verificando…",
};

export function ServiceStatus() {
  const [status, setStatus] = useState<Status>("loading");
  const [checks, setChecks] = useState<HealthData["checks"] | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/health");
        const data: HealthData = await res.json();
        setStatus(data.status);
        setChecks(data.checks);
      } catch {
        setStatus("error");
      }
    }

    poll();
    const id = setInterval(poll, 30_000); // re-check cada 30s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2 px-1">
      {/* Indicador principal */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[status]}`} />
        <span className="text-[10px] text-muted-foreground">{LABEL[status]}</span>
      </div>

      {/* Detalle de servicios */}
      {checks && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(
            [
              ["DB", checks.db],
              ["Ollama", checks.ollama],
              ["FFmpeg", checks.ffmpeg],
              ["Python", checks.python],
            ] as [string, boolean][]
          ).map(([name, ok]) => (
            <span key={name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
