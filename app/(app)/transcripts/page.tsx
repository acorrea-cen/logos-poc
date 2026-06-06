import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/db/prisma";
import { FileText, Clock, Edit3 } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getReadyVideos() {
  return prisma.video.findMany({
    where: { status: "READY" },
    orderBy: { processedAt: "desc" },
    include: {
      transcript: { select: { wordCount: true, isEdited: true, language: true } },
    },
  });
}

export default async function TranscriptsPage() {
  const videos = await getReadyVideos();

  return (
    <div className="flex flex-col">
      <Header
        title="Transcripciones"
        description={`${videos.length} video${videos.length !== 1 ? "s" : ""} transcriptos`}
      />

      <div className="p-6">
        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay videos transcriptos. Subí un MP4 y esperá a que termine el procesamiento.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {videos.map((v) => (
              <Link
                key={v.id}
                href={`/transcripts/${v.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {v.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {v.instructor && <span>{v.instructor}</span>}
                    {v.category && <span>· {v.category}</span>}
                    {v.transcript && (
                      <span className="flex items-center gap-1">
                        · <Clock className="h-3 w-3" />
                        {v.transcript.wordCount?.toLocaleString()} palabras
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {v.transcript?.isEdited && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Edit3 className="h-3 w-3" /> Editado
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDuration(v.duration)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
