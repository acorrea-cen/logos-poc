import { prisma } from "@/lib/db/prisma";
import { getQueryEmbedding } from "@/lib/embeddings/ollama";
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
  if (query.trim().length < 4) return [];

  // Usar search_query: prefix — nomic-embed-text hace retrieval asimétrico correcto
  const queryVec = await getQueryEmbedding(query);

  // Load embeddings junto con la longitud del segmento.
  // Segmentos muy cortos (<8 palabras) producen embeddings erráticos — el modelo no tiene
  // suficiente contenido para ubicarlos en una zona semántica específica del espacio vectorial
  // y terminan matcheando con queries completamente distintas.
  const [embeddings, allSegmentsShort] = await Promise.all([
    prisma.vectorEmbedding.findMany(),
    prisma.segment.findMany({ select: { id: true, text: true } }),
  ]);

  if (embeddings.length === 0) return [];

  const segWordCount = new Map(
    allSegmentsShort.map((s) => [s.id, s.text.trim().split(/\s+/).length])
  );
  const MIN_WORDS = 8;

  const allScored = embeddings
    .filter((emb) => (segWordCount.get(emb.segmentId) ?? 0) >= MIN_WORDS)
    .map((emb) => {
      const vec: number[] = JSON.parse(emb.vector);
      return { segmentId: emb.segmentId, score: cosineSimilarity(queryVec, vec) };
    });

  const n = allScored.length;
  const avgScore = allScored.reduce((acc, s) => acc + s.score, 0) / n;
  const stdDev = Math.sqrt(allScored.reduce((acc, s) => acc + (s.score - avgScore) ** 2, 0) / n);
  const maxScore = Math.max(...allScored.map((s) => s.score));

  // Umbral por z-score: threshold = avg + Z * stdDev
  // Z=3.0 captura solo los outliers positivos reales de la distribución,
  // independientemente del gap absoluto entre queries distintas.
  // MIN_ABS como piso absoluto para evitar matches con corpus muy comprimido.
  const Z_SCORE = 1.5;
  const MIN_ABS = 0.40;
  const MIN_SIGNAL = 0.05; // gap mínimo para que exista señal real

  const gap = maxScore - avgScore;
  if (maxScore < MIN_ABS || gap < MIN_SIGNAL) {
    console.log(`[semantic] "${query}" → SKIP top=${maxScore.toFixed(3)} avg=${avgScore.toFixed(3)} gap=${gap.toFixed(3)}`);
    return [];
  }

  const dynamicThreshold = Math.max(MIN_ABS, avgScore + Z_SCORE * stdDev);
  const scored = allScored
    .filter((s) => s.score >= dynamicThreshold)
    .sort((a, b) => b.score - a.score);

  console.log(`[semantic] "${query}" → top=${maxScore.toFixed(3)} avg=${avgScore.toFixed(3)} gap=${gap.toFixed(3)} threshold=${dynamicThreshold.toFixed(3)} passing=${scored.length}`);
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
      semanticScore: scoreMap.get(seg.id) ?? 0,
      matchType: "semantic" as const,
      thumbnailPath: seg.video.thumbnailPath,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
