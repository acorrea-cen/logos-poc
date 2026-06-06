import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/layout/Header";
import { TranscriptEditor } from "@/components/transcript/TranscriptEditor";

interface Props {
  params: { videoId: string };
}

export const dynamic = "force-dynamic";

export default async function TranscriptEditorPage({ params }: Props) {
  const video = await prisma.video.findUnique({
    where: { id: params.videoId },
    include: {
      segments: { orderBy: { segmentIndex: "asc" } },
      transcript: true,
    },
  });

  if (!video || video.status !== "READY") notFound();

  return (
    <div className="flex flex-col">
      <Header
        title={video.title}
        description="Editor de transcripción"
      />
      <div className="p-6">
        <TranscriptEditor
          videoId={video.id}
          segments={video.segments.map((s) => ({
            id: s.id,
            segmentIndex: s.segmentIndex,
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text,
            isEdited: s.isEdited,
          }))}
        />
      </div>
    </div>
  );
}
