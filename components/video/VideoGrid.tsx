"use client";

import { useMemo, useState } from "react";
import { VideoCard } from "@/components/video/VideoCard";

interface VideoItem {
  id: string;
  title: string;
  duration: number;
  status: string;
  instructor?: string | null;
  category?: string | null;
  topic?: string | null;
  thumbnailPath?: string | null;
  uploadedAt: string | Date;
  recordedAt?: string | Date | null;
  wordCount?: number | null;
  latestJob?: { status: string; progress: number } | null;
}

type SortKey = "recordedAt" | "uploadedAt" | "title";

const NONE = "__none__";

function sortVideos(videos: VideoItem[], key: SortKey): VideoItem[] {
  return [...videos].sort((a, b) => {
    if (key === "title") return a.title.localeCompare(b.title, "es");
    if (key === "recordedAt") {
      const da = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const db = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return db - da; // más reciente primero
    }
    // uploadedAt
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });
}

export function VideoGrid({ videos }: { videos: VideoItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("uploadedAt");

  const categories = useMemo(
    () =>
      [...new Set(videos.map((v) => v.category).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [videos]
  );

  // Videos que pasan el filtro de categoría
  const byCategory = useMemo(() => {
    if (activeCategory === null) return videos;
    if (activeCategory === NONE) return videos.filter((v) => !v.category);
    return videos.filter((v) => v.category === activeCategory);
  }, [videos, activeCategory]);

  // Subtemas disponibles dentro de la categoría activa
  const topics = useMemo(() => {
    if (activeCategory === null) return [];
    return [...new Set(byCategory.map((v) => v.topic).filter(Boolean) as string[])].sort(
      (a, b) => a.localeCompare(b, "es")
    );
  }, [byCategory, activeCategory]);

  // Videos finales (categoría + subtema + orden)
  const filtered = useMemo(() => {
    const base = activeTopic === null ? byCategory
      : activeTopic === NONE ? byCategory.filter((v) => !v.topic)
      : byCategory.filter((v) => v.topic === activeTopic);
    return sortVideos(base, sortKey);
  }, [byCategory, activeTopic, sortKey]);

  const uncategorized = useMemo(() => videos.filter((v) => !v.category).length, [videos]);
  const untopiced = useMemo(
    () => byCategory.filter((v) => !v.topic).length,
    [byCategory]
  );

  function selectCategory(cat: string | null) {
    setActiveCategory(cat);
    setActiveTopic(null); // resetear subtema al cambiar categoría
  }

  return (
    <div className="space-y-4">
      {/* Barra de orden */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Ordenar por:</span>
        {(["recordedAt", "uploadedAt", "title"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
              sortKey === key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {key === "recordedAt" ? "Fecha capacitación" : key === "uploadedAt" ? "Fecha subida" : "Título"}
          </button>
        ))}
      </div>

      {/* Pills de categoría */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Pill
            label="Todos"
            count={videos.length}
            active={activeCategory === null}
            onClick={() => selectCategory(null)}
          />
          {categories.map((cat) => (
            <Pill
              key={cat}
              label={cat}
              count={videos.filter((v) => v.category === cat).length}
              active={activeCategory === cat}
              onClick={() => selectCategory(activeCategory === cat ? null : cat)}
            />
          ))}
          {uncategorized > 0 && (
            <Pill
              label="Sin categoría"
              count={uncategorized}
              active={activeCategory === NONE}
              onClick={() => selectCategory(activeCategory === NONE ? null : NONE)}
            />
          )}
        </div>
      )}

      {/* Pills de subtema — solo cuando hay una categoría activa y tiene subtemas */}
      {activeCategory !== null && activeCategory !== NONE && topics.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-primary/30">
          <Pill
            label="Todos los subtemas"
            count={byCategory.length}
            active={activeTopic === null}
            onClick={() => setActiveTopic(null)}
            secondary
          />
          {topics.map((t) => (
            <Pill
              key={t}
              label={t}
              count={byCategory.filter((v) => v.topic === t).length}
              active={activeTopic === t}
              onClick={() => setActiveTopic(activeTopic === t ? null : t)}
              secondary
            />
          ))}
          {untopiced > 0 && (
            <Pill
              label="Sin subtema"
              count={untopiced}
              active={activeTopic === NONE}
              onClick={() => setActiveTopic(activeTopic === NONE ? null : NONE)}
              secondary
            />
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hay videos en esta selección.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              duration={v.duration}
              status={v.status}
              instructor={v.instructor}
              category={v.category}
              topic={v.topic}
              thumbnailPath={v.thumbnailPath}
              uploadedAt={v.uploadedAt}
              recordedAt={v.recordedAt}
              wordCount={v.wordCount}
              latestJob={v.latestJob ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  label, count, active, onClick, secondary = false,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        secondary ? "text-xs px-2.5 py-1" : ""
      } ${
        active
          ? secondary
            ? "bg-primary/20 text-primary border border-primary/40"
            : "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          active
            ? secondary
              ? "bg-primary/20 text-primary"
              : "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
