import Link from "next/link";
import { Clock, User, Tag, CheckCircle, Loader2, AlertCircle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/utils";
import { VideoStatusLabel } from "@/lib/types";

interface VideoCardProps {
  id: string;
  title: string;
  duration: number;
  status: string;
  instructor?: string | null;
  category?: string | null;
  thumbnailPath?: string | null;  // path en filesystem, sólo se usa para saber si existe
  uploadedAt: string | Date;
  wordCount?: number | null;
  latestJob?: { status: string; progress: number } | null;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "success" | "warning" | "destructive" | "secondary" | "outline"; icon: React.ReactNode }> = {
    READY:                { variant: "success",     icon: <CheckCircle className="h-3 w-3" /> },
    TRANSCRIBING:         { variant: "warning",     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    EXTRACTING_AUDIO:     { variant: "warning",     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    GENERATING_EMBEDDINGS:{ variant: "warning",     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    ERROR:                { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
    UPLOADED:             { variant: "secondary",   icon: <Upload className="h-3 w-3" /> },
  };

  const { variant, icon } = variants[status] ?? { variant: "outline" as const, icon: null };

  return (
    <Badge variant={variant} className="gap-1 text-[10px]">
      {icon}
      {VideoStatusLabel[status as keyof typeof VideoStatusLabel] ?? status}
    </Badge>
  );
}

export function VideoCard({
  id, title, duration, status, instructor, category,
  thumbnailPath, uploadedAt, wordCount, latestJob,
}: VideoCardProps) {
  const isProcessing = ["EXTRACTING_AUDIO", "TRANSCRIBING", "GENERATING_EMBEDDINGS"].includes(status);

  return (
    <Link href={`/videos/${id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-secondary flex items-center justify-center overflow-hidden">
          {thumbnailPath ? (
            <img
              src={`/api/videos/${id}/thumbnail`}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground/30">
              <svg viewBox="0 0 24 24" className="h-12 w-12 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={status} />
          </div>
          {duration > 0 && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-mono">
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Barra de progreso (solo si está procesando) */}
        {isProcessing && latestJob && (
          <Progress value={latestJob.progress} className="h-1 rounded-none" />
        )}

        <div className="p-4 space-y-2">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {instructor && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{instructor}
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />{category}
              </span>
            )}
            {wordCount != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{wordCount.toLocaleString()} palabras
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
