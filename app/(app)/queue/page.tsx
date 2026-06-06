import { Header } from "@/components/layout/Header";
import { JobProgress } from "@/components/queue/JobProgress";
import { prisma } from "@/lib/db/prisma";
import { VideoStatusLabel } from "@/lib/types";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { videoId?: string };
}

async function getQueueData() {
  const [active, recent] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: ["PENDING", "RUNNING"] } },
      orderBy: { createdAt: "asc" },
      include: { video: { select: { id: true, title: true, status: true } } },
    }),
    prisma.job.findMany({
      where: { status: { in: ["COMPLETED", "FAILED"] } },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { video: { select: { id: true, title: true } } },
    }),
  ]);
  return { active, recent };
}

export default async function QueuePage({ searchParams }: Props) {
  const { active, recent } = await getQueueData();
  const focusedVideoId = searchParams.videoId;

  // Si llegamos desde un upload, el video enfocado va primero
  const focusedJob = focusedVideoId
    ? active.find((j) => j.videoId === focusedVideoId)
    : null;

  const otherActive = active.filter((j) => j.videoId !== focusedVideoId);

  const isEmpty = active.length === 0 && recent.length === 0;

  return (
    <div className="flex flex-col">
      <Header
        title="Cola de procesamiento"
        description={
          active.length > 0
            ? `${active.length} video${active.length > 1 ? "s" : ""} procesándose`
            : "Sin videos en proceso"
        }
      />

      <div className="p-6 space-y-8">
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-muted-foreground text-sm">La cola está vacía.</p>
          </div>
        )}

        {/* Job enfocado (el que acaba de subirse) */}
        {focusedJob && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Recién subido</h2>
            <JobProgress
              videoId={focusedJob.videoId}
              videoTitle={focusedJob.video.title}
              initialStatus={focusedJob.status}
              initialProgress={focusedJob.progress}
            />
          </section>
        )}

        {/* Resto de activos */}
        {otherActive.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">En proceso</h2>
            <div className="space-y-3">
              {otherActive.map((job) => (
                <JobProgress
                  key={job.id}
                  videoId={job.videoId}
                  videoTitle={job.video.title}
                  initialStatus={job.status}
                  initialProgress={job.progress}
                />
              ))}
            </div>
          </section>
        )}

        {/* Historial reciente */}
        {recent.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Procesados recientemente</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recent.map((job) => (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                  {job.status === "COMPLETED" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span className="flex-1 text-sm text-foreground truncate">{job.video.title}</span>
                  {job.completedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(job.completedAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
