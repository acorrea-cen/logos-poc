import { prisma } from "@/lib/db/prisma";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "nomic-embed-text";

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embeddings error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function generateEmbeddingsForVideo(
  videoId: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const segments = await prisma.segment.findMany({
    where: { videoId },
    orderBy: { segmentIndex: "asc" },
    select: { id: true, text: true },
  });

  if (segments.length === 0) return;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    const vector = await getEmbedding(seg.text);
    const vectorJson = JSON.stringify(vector);

    // Upsert embedding
    const embedding = await prisma.vectorEmbedding.upsert({
      where: { segmentId: seg.id },
      create: { segmentId: seg.id, vector: vectorJson },
      update: { vector: vectorJson },
    });

    // Link segment → embedding
    await prisma.segment.update({
      where: { id: seg.id },
      data: { embeddingId: embedding.id },
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / segments.length) * 100));
    }
  }
}

export async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
