"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Edit3, RotateCcw, Save } from "lucide-react";

interface Segment {
  id: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  text: string;
  isEdited: boolean;
}

interface TranscriptEditorProps {
  videoId: string;
  segments: Segment[];
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function TranscriptEditor({ videoId, segments: initialSegments }: TranscriptEditorProps) {
  const [segments, setSegments] = useState(initialSegments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveSegment = useCallback(async (segmentId: string, text: string) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/segments/${segmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, []);

  function handleChange(segmentId: string, text: string) {
    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, text, isEdited: true } : s))
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveSegment(segmentId, text);
    }, 1000); // auto-save tras 1s de inactividad
  }

  function exportFile(format: "srt" | "txt") {
    window.open(`/api/transcripts/${videoId}/export?format=${format}`, "_blank");
  }

  const editedCount = segments.filter((s) => s.isEdited).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-primary">
              <Save className="h-3.5 w-3.5 animate-pulse" /> Guardando…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1.5 text-green-400">
              <Save className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
          {saveState === "error" && (
            <span className="text-destructive">Error al guardar</span>
          )}
          {saveState === "idle" && editedCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Edit3 className="h-3 w-3" /> {editedCount} segmento{editedCount > 1 ? "s" : ""} editado{editedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Exportaciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFile("srt")}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar SRT
          </button>
          <button
            onClick={() => exportFile("txt")}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar TXT
          </button>
        </div>
      </div>

      {/* Segments */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {segments.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">Sin segmentos.</p>
        )}
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={`flex gap-4 px-4 py-3 group ${
              seg.isEdited ? "bg-primary/5" : ""
            }`}
          >
            {/* Timestamp */}
            <span className="shrink-0 text-xs text-muted-foreground font-mono w-12 pt-2">
              {formatTime(seg.startTime)}
            </span>

            {/* Editable text */}
            <div className="flex-1 min-w-0">
              {editingId === seg.id ? (
                <textarea
                  autoFocus
                  value={seg.text}
                  onChange={(e) => handleChange(seg.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  className="w-full resize-none rounded-md border border-primary/50 bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                  rows={Math.max(2, Math.ceil(seg.text.length / 80))}
                />
              ) : (
                <p
                  onClick={() => setEditingId(seg.id)}
                  className={`text-sm leading-relaxed cursor-text rounded px-2 py-1.5 hover:bg-muted/50 transition-colors ${
                    seg.isEdited ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {seg.text}
                </p>
              )}
            </div>

            {/* Indicador de editado */}
            {seg.isEdited && (
              <div className="shrink-0 pt-2">
                <RotateCcw className="h-3.5 w-3.5 text-primary/60" />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Click en cualquier segmento para editar. Los cambios se guardan automáticamente.
      </p>
    </div>
  );
}
