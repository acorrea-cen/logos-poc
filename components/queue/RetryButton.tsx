"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function RetryButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      await fetch(`/api/videos/${videoId}/retry`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
    >
      <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Reintentando…" : "Reintentar"}
    </button>
  );
}
