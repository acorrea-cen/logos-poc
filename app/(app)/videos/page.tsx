import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { VideoCard } from "@/components/video/VideoCard";
import { prisma } from "@/lib/db/prisma";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

async function getVideos() {
  return prisma.video.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      transcript: { select: { wordCount: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, progress: true },
      },
    },
  });
}

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <div className="flex flex-col">
      <Header
        title="Videos"
        description={`${videos.length} video${videos.length !== 1 ? "s" : ""} en el repositorio`}
      />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Link
            href="/videos/upload"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Subir video
          </Link>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-muted-foreground text-sm">Aún no hay videos.</p>
            <Link
              href="/videos/upload"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Upload className="h-3 w-3" /> Subir el primero
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                id={v.id}
                title={v.title}
                duration={v.duration}
                status={v.status}
                instructor={v.instructor}
                category={v.category}
                thumbnailPath={v.thumbnailPath}
                uploadedAt={v.uploadedAt}
                wordCount={v.transcript?.wordCount}
                latestJob={v.jobs[0] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
