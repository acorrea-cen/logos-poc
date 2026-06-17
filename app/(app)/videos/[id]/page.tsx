import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/layout/Header";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { EditMetadataButton } from "@/components/video/EditMetadataButton";
import { StudyMaterial } from "@/components/video/StudyMaterial";

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
      transcript: true,
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
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <EditMetadataButton
            videoId={video.id}
            title={video.title}
            instructor={video.instructor}
            category={video.category}
          />
        </div>
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
        <StudyMaterial
          videoId={video.id}
          segments={video.segments.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text,
            confidence: s.confidence,
          }))}
          initialSummary={video.transcript?.summary}
        />
      </div>
    </div>
  );
}
