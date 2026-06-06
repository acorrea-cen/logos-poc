import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/layout/Header";
import { VideoPlayer } from "@/components/video/VideoPlayer";

interface Props {
  params: { id: string };
  searchParams: { t?: string };
}

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({ params, searchParams }: Props) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: {
      segments: {
        orderBy: { segmentIndex: "asc" },
      },
    },
  });

  if (!video) notFound();

  const startAt = searchParams.t ? Number(searchParams.t) : 0;

  return (
    <div className="flex flex-col">
      <Header
        title={video.title}
        description={[video.instructor, video.category].filter(Boolean).join(" · ") || "Video"}
      />
      <div className="p-6">
        <VideoPlayer
          videoId={video.id}
          segments={video.segments.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text,
          }))}
          startAt={startAt}
        />
      </div>
    </div>
  );
}
