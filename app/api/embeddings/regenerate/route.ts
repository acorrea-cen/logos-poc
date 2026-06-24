import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateEmbeddingsForVideo } from "@/lib/embeddings/ollama";

export const maxDuration = 300; // 5 min — puede tardar en CPU

export async function POST() {
  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    select: { id: true, title: true },
  });

  if (videos.length === 0) {
    return NextResponse.json({ message: "No hay videos listos para regenerar" });
  }

  let done = 0;
  const errors: string[] = [];

  for (const video of videos) {
    try {
      await generateEmbeddingsForVideo(video.id);
      done++;
    } catch (err) {
      errors.push(`${video.title}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    regenerated: done,
    total: videos.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
