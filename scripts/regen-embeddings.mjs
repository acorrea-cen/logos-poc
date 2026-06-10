// Re-genera embeddings con mxbai-embed-large para todos los videos READY
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const MODEL = "mxbai-embed-large";

async function getEmbedding(text) {
  const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.embedding;
}

async function main() {
  const videos = await prisma.video.findMany({
    where: { status: "READY" },
    select: { id: true, title: true },
  });

  console.log(`Videos a procesar: ${videos.length}`);

  for (const video of videos) {
    const segments = await prisma.segment.findMany({
      where: { videoId: video.id },
      orderBy: { segmentIndex: "asc" },
      select: { id: true, text: true },
    });

    console.log(`\n[${video.title}] ${segments.length} segmentos`);

    let ok = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      try {
        // mxbai-embed-large: documentos sin prefijo
        const vector = await getEmbedding(seg.text);
        const vectorJson = JSON.stringify(vector);

        const emb = await prisma.vectorEmbedding.upsert({
          where: { segmentId: seg.id },
          create: { segmentId: seg.id, vector: vectorJson },
          update: { vector: vectorJson },
        });

        await prisma.segment.update({
          where: { id: seg.id },
          data: { embeddingId: emb.id },
        });

        ok++;
        if ((i + 1) % 20 === 0 || i === segments.length - 1) {
          process.stdout.write(`\r  ${i + 1}/${segments.length} (${Math.round(((i+1)/segments.length)*100)}%)`);
        }
      } catch (err) {
        console.error(`\n  ERROR segmento ${seg.id}: ${err.message}`);
      }
    }
    console.log(`\n  ✓ ${ok}/${segments.length} embeddings generados`);
  }

  console.log("\n✅ Listo");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
