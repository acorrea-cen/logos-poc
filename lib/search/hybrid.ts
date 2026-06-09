import type { SearchResult, SearchFilters } from "./types";
import { fulltextSearch } from "./fulltext";
import { semanticSearch } from "./semantic";

// Reciprocal Rank Fusion
const RRF_K = 60;

export async function hybridSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
): Promise<SearchResult[]> {
  const [ftResults, semResults] = await Promise.all([
    fulltextSearch(query, filters, limit * 2),
    semanticSearch(query, filters, limit * 2),
  ]);

  // Build RRF scores
  const rrfScores = new Map<string, number>();

  ftResults.forEach((r, rank) => {
    const prev = rrfScores.get(r.segmentId) ?? 0;
    rrfScores.set(r.segmentId, prev + 1 / (RRF_K + rank + 1));
  });

  semResults.forEach((r, rank) => {
    const prev = rrfScores.get(r.segmentId) ?? 0;
    rrfScores.set(r.segmentId, prev + 1 / (RRF_K + rank + 1));
  });

  // Merge: semantic entry wins (tiene highlightedText y semanticScore)
  const resultMap = new Map<string, SearchResult>();
  for (const r of [...semResults, ...ftResults]) {
    if (!resultMap.has(r.segmentId)) {
      resultMap.set(r.segmentId, { ...r, matchType: "hybrid" });
    } else if (r.matchType === "fulltext") {
      // Si ya existe entrada semántica, agregar el highlightedText del fulltext
      const existing = resultMap.get(r.segmentId)!;
      resultMap.set(r.segmentId, { ...existing, highlightedText: r.highlightedText });
    }
  }

  return Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([segmentId, score]) => {
      const result = resultMap.get(segmentId)!;
      return { ...result, score, matchType: "hybrid" as const };
    });
}
