import Link from "next/link";
import { Clock, User, Tag, Sparkles } from "lucide-react";
import type { SearchResult } from "@/lib/search/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// mxbai-embed-large: similitudes coseno típicas 0.30–0.95 para retrieval.
// Normalizamos a 0–100% dentro del rango útil.
function similarityPercent(score: number): number {
  const MIN = 0.30;
  const MAX = 0.92;
  return Math.round(Math.min(100, Math.max(0, ((score - MIN) / (MAX - MIN)) * 100)));
}

interface ResultCardProps {
  result: SearchResult;
  query: string;
}

export function ResultCard({ result }: ResultCardProps) {
  const href = `/videos/${result.videoId}?t=${Math.floor(result.startTime)}`;
  const isSemantic = result.matchType === "semantic";
  const isHybrid = result.matchType === "hybrid";
  const rawSimScore = result.semanticScore ?? (isSemantic ? result.score : 0);
  const pct = similarityPercent(rawSimScore);
  const showSimilarity = (isSemantic || isHybrid) && pct > 0;

  return (
    <Link
      href={href}
      className={`group block rounded-xl border bg-card hover:bg-card/80 transition-all ${
        isSemantic
          ? "border-violet-500/30 hover:border-violet-500/60"
          : isHybrid
          ? "border-blue-500/20 hover:border-blue-500/50"
          : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {result.thumbnailPath ? (
            <img
              src={`/api/videos/${result.videoId}/thumbnail`}
              alt={result.videoTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {result.videoTitle}
            </p>
            <div className="shrink-0 flex items-center gap-1.5">
              {showSimilarity && (
                <span
                  title={`Similitud semántica: ${pct}% (score crudo: ${result.score.toFixed(3)})`}
                  className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    pct >= 75
                      ? "bg-violet-500/15 text-violet-400"
                      : pct >= 50
                      ? "bg-blue-500/15 text-blue-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {pct}% similar
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                <Clock className="h-3 w-3" />
                {formatTime(result.startTime)}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {result.instructor && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {result.instructor}
              </span>
            )}
            {result.category && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {result.category}
              </span>
            )}
          </div>

          {/* Snippet */}
          {isSemantic ? (
            // Para resultados semánticos: resaltar el fragmento completo con borde izquierdo
            <div className="border-l-2 border-violet-500/50 pl-2">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
                {result.text}
              </p>
            </div>
          ) : (
            // Para fulltext / hybrid: highlights por palabras exactas
            <p
              className="text-xs text-muted-foreground leading-relaxed line-clamp-2 [&_mark]:bg-yellow-400/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
              dangerouslySetInnerHTML={{ __html: result.highlightedText }}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
