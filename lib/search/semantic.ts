import { prisma } from "@/lib/db/prisma";
import { getEmbedding } from "@/lib/embeddings/ollama";
import type { SearchResult, SearchFilters } from "./types";
import { highlight } from "./highlight";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
): Promise<SearchResult[]> {
  const queryVec = await getEmbedding(query);

  // Load all embeddings (feasible for POC — ~15k segments max ≈ few MB in memory)
  const embeddings = await prisma.vectorEmbedding.findMany();

  if (embeddings.length === 0) return [];

  // Score all embeddings y filtrar por umbral mínimo de similitud
  // Con nomic-embed-text, consultas sin sentido dan ~0.2-0.3; texto relevante da >0.45
  const allScored = embeddings.map((emb) => {
    const vec: number[] = JSON.parse(emb.vector);
    return { segmentId: emb.segmentId, score: cosineSimilarity(queryVec, vec) };
  });

  const maxScore = Math.max(...allScored.map((s) => s.score));
  const avgScore = allScored.reduce((acc, s) => acc + s.score, 0) / allScored.length;

  // Solo hay señal semántica real cuando el top score supera claramente el promedio.
  // Con corpus homogéneo o queries sin sentido, los scores se comprimen y no hay discriminación.
  const MIN_ABS = 0.50;        // mínimo absoluto
  const MIN_SIGNAL = 0.10;     // gap mínimo entre top y promedio

  if (maxScore < MIN_ABS || maxScore - avgScore < MIN_SIGNAL) return [];

  // Retornar solo los segmentos cercanos al top (dentro del 90% del score máximo)
  const scored = allScored
    .filter((s) => s.score >= maxScore * 0.90)
    .sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, limit * 2).map((s) => s.segmentId);
  const scoreMap = new Map(scored.map((s) => [s.segmentId, s.score]));

  const segments = await prisma.segment.findMany({
    where: {
      id: { in: topIds },
      video: {
        status: "READY",
        ...(filters.instructor ? { instructor: { contains: filters.instructor } } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              recordedAt: {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          instructor: true,
          category: true,
          thumbnailPath: true,
        },
      },
    },
  });

  const terms = query.trim().split(/\s+/).filter(Boolean);

  return segments
    .map((seg) => ({
      segmentId: seg.id,
      videoId: seg.video.id,
      videoTitle: seg.video.title,
      instructor: seg.video.instructor,
      category: seg.video.category,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
      highlightedText: highlight(seg.text, terms),
      score: scoreMap.get(seg.id) ?? 0,
      matchType: "semantic" as const,
      thumbnailPath: seg.video.thumbnailPath,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
