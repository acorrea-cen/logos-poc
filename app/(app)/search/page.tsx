"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { ResultCard } from "@/components/search/ResultCard";
import type { SearchResult } from "@/lib/search/types";

interface FiltersData {
  instructors: string[];
  categories: string[];
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [searchType, setSearchType] = useState<"fulltext" | "semantic" | "hybrid">(
    (searchParams.get("type") as "fulltext" | "semantic" | "hybrid") ?? "hybrid"
  );
  const [instructor, setInstructor] = useState(searchParams.get("instructor") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersData, setFiltersData] = useState<FiltersData>({ instructors: [], categories: [] });

  const abortRef = useRef<AbortController | null>(null);

  // Load available filter options on mount
  useEffect(() => {
    fetch("/api/search", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setFiltersData(d))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(
    async (q: string, type: string, inst: string, cat: string) => {
      if (!q) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      // Sync URL params
      const params = new URLSearchParams({ q, type });
      if (inst) params.set("instructor", inst);
      if (cat) params.set("category", cat);
      router.replace(`/search?${params.toString()}`, { scroll: false });

      try {
        const url = `/api/search?q=${encodeURIComponent(q)}&type=${type}${inst ? `&instructor=${encodeURIComponent(inst)}` : ""}${cat ? `&category=${encodeURIComponent(cat)}` : ""}`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Error desconocido");
        setResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Run on initial mount if query param present
  useEffect(() => {
    if (query) runSearch(query, searchType, instructor, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(q: string) {
    setQuery(q);
    runSearch(q, searchType, instructor, category);
  }

  function handleTypeChange(t: "fulltext" | "semantic" | "hybrid") {
    setSearchType(t);
    if (query) runSearch(query, t, instructor, category);
  }

  function handleInstructorChange(v: string) {
    setInstructor(v);
    if (query) runSearch(query, searchType, v, category);
  }

  function handleCategoryChange(v: string) {
    setCategory(v);
    if (query) runSearch(query, searchType, instructor, v);
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Búsqueda"
        description="Búsqueda semántica en transcripciones"
      />

      <div className="p-6 space-y-5 max-w-3xl">
        {/* Barra de búsqueda */}
        <SearchBar
          initialQuery={query}
          isLoading={isLoading}
          onSearch={handleSearch}
        />

        {/* Filtros */}
        <SearchFilters
          searchType={searchType}
          instructor={instructor}
          category={category}
          instructors={filtersData.instructors}
          categories={filtersData.categories}
          onTypeChange={handleTypeChange}
          onInstructorChange={handleInstructorChange}
          onCategoryChange={handleCategoryChange}
        />

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Resultados */}
        {hasSearched && !isLoading && !error && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {results.length === 0
                ? `Sin resultados para "${query}"`
                : `${results.length} resultado${results.length > 1 ? "s" : ""} para "${query}"`}
            </p>

            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((r) => (
                  <ResultCard key={r.segmentId} result={r} query={query} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estado vacío inicial */}
        {!hasSearched && !isLoading && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Escribí una palabra, frase o concepto para buscar en todos los videos.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              La búsqueda híbrida encuentra tanto coincidencias exactas como conceptos relacionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
