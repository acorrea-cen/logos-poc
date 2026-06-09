export interface SearchResult {
  segmentId: string;
  videoId: string;
  videoTitle: string;
  instructor: string | null;
  category: string | null;
  startTime: number;
  endTime: number;
  text: string;
  highlightedText: string;
  score: number;
  semanticScore?: number; // cosine similarity original, preservado en hybrid
  matchType: "fulltext" | "semantic" | "hybrid";
  thumbnailPath: string | null;
}

export interface SearchFilters {
  instructor?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchOptions {
  query: string;
  type?: "fulltext" | "semantic" | "hybrid";
  filters?: SearchFilters;
  limit?: number;
}
