import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const videos = await prisma.video.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      transcript: { select: { wordCount: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, progress: true, estimatedTimeRemaining: true },
      },
    },
  });

  return NextResponse.json(videos.map((v) => ({
    id: v.id,
    title: v.title,
    filename: v.filename,
    duration: v.duration,
    fileSize: v.fileSize.toString(),
    status: v.status,
    instructor: v.instructor,
    category: v.category,
    thumbnailPath: v.thumbnailPath,
    uploadedAt: v.uploadedAt,
    processedAt: v.processedAt,
    wordCount: v.transcript?.wordCount ?? null,
    latestJob: v.jobs[0] ?? null,
  })));
}
