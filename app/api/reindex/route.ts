import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateEmbeddingsForVideo } from "@/lib/embeddings/ollama";

export const dynamic = "force-dynamic";

// POST /api/reindex
// Regenera embeddings de todos los videos READY usando los prefijos correctos
// de nomic-embed-text (search_document:). Necesario después de actualizar la
// función getEmbedding para que los documentos almacenados sean compatibles
// con las queries que usan search_query:.
export async function POST() {
  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    select: { id: true, title: true },
  });

  if (videos.length === 0) {
    return NextResponse.json({ message: "No hay videos READY para reindexar", reindexed: 0 });
  }

  // Fire and forget — responde inmediatamente, procesa en background
  (async () => {
    for (const video of videos) {
      try {
        console.log(`[reindex] Regenerando embeddings: ${video.title}`);
        await generateEmbeddingsForVideo(video.id);
        console.log(`[reindex] OK: ${video.title}`);
      } catch (err) {
        console.error(`[reindex] ERROR en ${video.title}:`, err);
      }
    }
    console.log(`[reindex] Completado — ${videos.length} videos reindexados`);
  })();

  return NextResponse.json({
    message: `Reindexando ${videos.length} video(s) en background. Revisá la consola para progreso.`,
    videos: videos.map((v) => v.title),
    reindexed: videos.length,
  });
}
