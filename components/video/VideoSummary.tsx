"use client";

import { useEffect, useState } from "react";

interface Props {
  videoId: string;
  initialSummary?: string | null;
}

export function VideoSummary({ videoId, initialSummary }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (summary) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/summary`, { method: "POST" });
      const data = await res.json() as { summary?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Error desconocido");
        return;
      }
      setSummary(data.summary ?? null);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Analizando transcripción con IA… esto puede tardar unos minutos.
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        <p className="text-destructive">{error}</p>
        <button
          onClick={generate}
          className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-1">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{summary}</p>
    </div>
  );
}
