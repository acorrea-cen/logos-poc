import Link from "next/link";
import { Clock, User, Tag, ArrowRight, Calendar } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface VideoEntry {
  id: string;
  title: string;
  duration: number;
  instructor: string | null;
  category: string | null;
  recordedAt: Date | null;
  thumbnailPath: string | null;
  processedAt: Date | null;
  transcript: { wordCount: number | null } | null;
}

function RelativeTime({ date }: { date: Date | null }) {
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const label = days > 0 ? `hace ${days}d` : hours > 0 ? `hace ${hours}h` : "hoy";
  return <span className="text-xs text-muted-foreground" suppressHydrationWarning>{label}</span>;
}

export function RecentVideos({ videos }: { videos: VideoEntry[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Procesados recientemente</h2>
        <Link href="/videos" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <Link
            key={v.id}
            href={`/videos/${v.id}`}
            className="group flex gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            {/* Thumbnail */}
            <div className="shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {v.thumbnailPath ? (
                <img
                  src={`/api/videos/${v.id}/thumbnail`}
                  alt={v.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-secondary" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {v.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {v.instructor && (
                  <span className="flex items-center gap-0.5">
                    <User className="h-3 w-3" /> {v.instructor}
                  </span>
                )}
                {v.category && (
                  <span className="flex items-center gap-0.5">
                    <Tag className="h-3 w-3" /> {v.category}
                  </span>
                )}
                {v.recordedAt && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(v.recordedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {formatDuration(v.duration)}
                </span>
              </div>
              <RelativeTime date={v.processedAt} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
