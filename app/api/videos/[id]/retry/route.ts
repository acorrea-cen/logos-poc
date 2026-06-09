import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { VideoStatus, JobStatus, JobType } from "@/lib/types";
import transcriptionQueue from "@/lib/jobs/queue";
import { runTranscriptionPipeline } from "@/lib/jobs/transcription-job";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const video = await prisma.video.findUnique({ where: { id: params.id } });

  if (!video) return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });

  if (!["ERROR", "UPLOADED"].includes(video.status)) {
    return NextResponse.json(
      { error: "Solo se pueden reintentar videos en estado ERROR o UPLOADED" },
      { status: 400 }
    );
  }

  // Cancelar jobs anteriores
  await prisma.job.updateMany({
    where: { videoId: params.id, status: { in: ["PENDING", "RUNNING", "FAILED"] } },
    data: { status: JobStatus.CANCELLED },
  });

  // Resetear estado del video
  await prisma.video.update({
    where: { id: params.id },
    data: { status: VideoStatus.UPLOADED, processingError: null },
  });

  // Encolar de nuevo
  transcriptionQueue.add(() => runTranscriptionPipeline(params.id)).catch(console.error);

  return NextResponse.json({ ok: true });
}
