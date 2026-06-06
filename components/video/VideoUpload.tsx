"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileVideo, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatFileSize } from "@/lib/utils";

const CATEGORIES = ["Cuentas", "Tarjetas", "Compliance", "Procesos", "Normativa", "Onboarding", "Otro"];

export function VideoUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [category, setCategory] = useState("");

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith(".mp4")) {
      setError("Solo se aceptan archivos MP4.");
      return;
    }
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setError("El archivo supera el límite de 2 GB.");
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.mp4$/i, "").replace(/[-_]/g, " "));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name.replace(/\.mp4$/i, ""));
    if (instructor) formData.append("instructor", instructor);
    if (category) formData.append("category", category);

    try {
      const res = await fetch("/api/videos/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al subir el video.");
        return;
      }

      router.push(`/queue?videoId=${data.videoId}`);
    } catch {
      setError("Error de red. Verificá que el servidor esté corriendo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <div className="rounded-full bg-primary/10 p-5">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              {dragOver ? "Soltá el archivo acá" : "Arrastrá un video MP4"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">o hacé click para seleccionar</p>
            <p className="mt-2 text-xs text-muted-foreground">Solo MP4 · Máximo 2 GB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".mp4,video/mp4"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      ) : (
        /* Formulario de metadata */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Archivo seleccionado */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileVideo className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); setError(null); }}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Campos */}
          <div className="space-y-4">
            <Field label="Título *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre del video de capacitación"
                required
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Instructor">
                <input
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="Nombre del instructor"
                  className="input"
                />
              </Field>

              <Field label="Categoría">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={uploading} className="w-full" size="lg">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Subir y transcribir
              </>
            )}
          </Button>
        </form>
      )}

      {error && !file && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
