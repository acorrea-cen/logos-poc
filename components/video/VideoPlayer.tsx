"use client";

import { useEffect, useRef, useState } from "react";

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface VideoPlayerProps {
  videoId: string;
  segments: Segment[];
  startAt?: number;
  studyContent?: React.ReactNode;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoPlayer({ videoId, segments, startAt = 0, studyContent }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(startAt);
  const [speed, setSpeed] = useState(1);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Seek to start time once video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      if (startAt > 0) video.currentTime = startAt;
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [startAt]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const video = videoRef.current;
      if (!video) return;
      // Don't intercept when focused inside an input/textarea
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        video.paused ? video.play() : video.pause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 15 : 5));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + (e.shiftKey ? 15 : 5));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }

  function seekTo(time: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  const activeIndex = segments.findLastIndex(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  // Auto-scroll active segment within the transcript panel
  useEffect(() => {
    const el = activeSegmentRef.current;
    const container = transcriptRef.current;
    if (!el || !container) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const containerScrollTop = container.scrollTop;
    const containerBottom = containerScrollTop + container.clientHeight;

    // Only scroll if the segment is outside the visible area
    if (elTop < containerScrollTop + 40 || elBottom > containerBottom - 40) {
      container.scrollTo({ top: elTop - container.clientHeight / 2, behavior: "smooth" });
    }
  }, [activeIndex]);

  /*
   * Layout:
   *  - Fila superior: flex row con altura fija calculada por el aspect-ratio del video
   *    (video 3/5 del ancho, ratio 16:9, más controles ~40px)
   *  - Fila inferior: flex-1, ocupa el espacio restante, ancho completo
   *
   * La altura exacta de la fila superior:
   *   ancho_video = (100vw - 288px[sidebar+padding] - 20px[gap]) × 3/5
   *   alto_video  = ancho_video × 9/16  =  (100vw - 308px) × 27/80  ≈  × 0.3375
   *   total_fila  = alto_video + 12px[gap] + 28px[controles] ≈ + 40px
   */
  return (
    <div className="flex flex-col gap-4">
      {/* ── Fila superior: video + transcripción, altura exacta ── */}
      <div
        className="flex gap-5 shrink-0 overflow-hidden"
        style={{ height: "calc(0.3375 * (100vw - 308px) + 40px)" }}
      >
        {/* Video + controles */}
        <div className="flex flex-col gap-3" style={{ flex: 3 }}>
          <video
            ref={videoRef}
            src={`/api/videos/${videoId}/stream`}
            controls
            className="w-full rounded-xl border border-border bg-black aspect-video"
            onTimeUpdate={handleTimeUpdate}
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Velocidad:</span>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-3 py-1.5 transition-colors ${
                    speed === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <span className="ml-2 text-xs text-muted-foreground/60">
              Espacio = play/pause · ← → = ±5s · Shift = ±15s
            </span>
          </div>
        </div>

        {/* Transcripción — h-full para llenar exactamente la fila */}
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden h-full" style={{ flex: 2 }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Transcripción
            </p>
            <span className="text-xs text-muted-foreground font-mono">
              {formatTime(currentTime)}
            </span>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            {segments.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Sin transcripción disponible.</p>
            )}
            {segments.map((seg, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={seg.id}
                  ref={isActive ? activeSegmentRef : undefined}
                  onClick={() => seekTo(seg.startTime)}
                  className={`flex gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <span className="shrink-0 text-xs text-muted-foreground w-11 pt-0.5 font-mono">
                    {formatTime(seg.startTime)}
                  </span>
                  <p className={`text-sm leading-relaxed ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {seg.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Fila inferior: resumen ancho completo, altura libre ── */}
      {studyContent && (
        <div>
          {studyContent}
        </div>
      )}
    </div>
  );
}
