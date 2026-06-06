import { prisma } from "@/lib/db/prisma";
import type { SearchResult, SearchFilters } from "./types";
import { highlight } from "./highlight";

export async function fulltextSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  // Build WHERE clauses for each term (AND logic)
  // Each term must appear in the segment text
  const segments = await prisma.segment.findMany({
    where: {
      AND: terms.map((t) => ({ text: { contains: t } })),
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
    take: limit * 3, // over-fetch then score
    orderBy: { segmentIndex: "asc" },
  });

  // Simple TF-style score: count how many query terms appear in the text
  const scored = segments.map((seg) => {
    const lower = seg.text.toLowerCase();
    const termHits = terms.filter((t) => lower.includes(t.toLowerCase())).length;
    const score = termHits / terms.length;
    return { seg, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ seg, score }) => ({
    segmentId: seg.id,
    videoId: seg.video.id,
    videoTitle: seg.video.title,
    instructor: seg.video.instructor,
    category: seg.video.category,
    startTime: seg.startTime,
    endTime: seg.endTime,
    text: seg.text,
    highlightedText: highlight(seg.text, terms),
    score,
    matchType: "fulltext" as const,
    thumbnailPath: seg.video.thumbnailPath,
  }));
}
