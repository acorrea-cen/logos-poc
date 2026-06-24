import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentVideos } from "@/components/dashboard/RecentVideos";
import { prisma } from "@/lib/db/prisma";
import { VideoStatus } from "@/lib/types";
import { Video, Search, Upload, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [totalVideos, videos, inQueueJobs, wordCountAgg, searchCount] = await Promise.all([
    prisma.video.count(),
    prisma.video.findMany({
      select: { duration: true, status: true },
    }),
    prisma.job.count({
      where: { status: { in: ["PENDING", "RUNNING"] } },
    }),
    prisma.transcript.aggregate({ _sum: { wordCount: true } }),
    prisma.searchHistory.count(),
  ]);

  const totalSeconds = videos.reduce((acc, v) => acc + v.duration, 0);
  const transcribed = videos.filter((v) => v.status === VideoStatus.READY).length;

  return {
    totalVideos,
    totalHours: totalSeconds / 3600,
    transcribed,
    inQueue: inQueueJobs,
    totalWords: wordCountAgg._sum.wordCount ?? 0,
    searchCount,
  };
}

async function getRecentVideos() {
  return prisma.video.findMany({
    where: { status: VideoStatus.READY },
    orderBy: { processedAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      duration: true,
      instructor: true,
      category: true,
      recordedAt: true,
      thumbnailPath: true,
      processedAt: true,
      transcript: { select: { wordCount: true } },
    },
  });
}

export default async function DashboardPage() {
  const [stats, recentVideos] = await Promise.all([getStats(), getRecentVideos()]);
  const isEmpty = stats.totalVideos === 0;

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Repositorio de conocimiento audiovisual"
      />

      <div className="p-6 space-y-8">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Estado vacío */}
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Sin videos aún</h2>
            <p className="mb-8 text-sm text-muted-foreground max-w-md mx-auto">
              Subí el primer video de capacitación para empezar a construir el repositorio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/videos/upload"
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Subir primer video
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                Ir a búsqueda
              </Link>
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        {!isEmpty && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                href: "/videos",
                icon: <Video className="h-5 w-5" />,
                label: "Ver videos",
                sub: `${stats.totalVideos} en el repositorio`,
              },
              {
                href: "/search",
                icon: <Search className="h-5 w-5" />,
                label: "Buscar",
                sub: `${stats.searchCount} búsquedas realizadas`,
              },
              {
                href: "/videos/upload",
                icon: <Upload className="h-5 w-5" />,
                label: "Subir video",
                sub: "Agregar al repositorio",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground group-hover:text-primary transition-colors">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}

        {/* Videos recientes */}
        {recentVideos.length > 0 && (
          <RecentVideos videos={recentVideos} />
        )}
      </div>
    </div>
  );
}
