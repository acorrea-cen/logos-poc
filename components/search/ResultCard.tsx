import Link from "next/link";
import { Clock, User, Tag } from "lucide-react";
import type { SearchResult } from "@/lib/search/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface ResultCardProps {
  result: SearchResult;
  query: string;
}

export function ResultCard({ result }: ResultCardProps) {
  const href = `/videos/${result.videoId}?t=${Math.floor(result.startTime)}`;

  return (
    <Link href={href} className="group block rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-all">
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
            <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              <Clock className="h-3 w-3" />
              {formatTime(result.startTime)}
            </span>
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

          {/* Highlighted snippet */}
          <p
            className="text-xs text-muted-foreground leading-relaxed line-clamp-2 [&_mark]:bg-yellow-400/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
            dangerouslySetInnerHTML={{ __html: result.highlightedText }}
          />
        </div>
      </div>
    </Link>
  );
}
