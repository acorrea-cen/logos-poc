"use client";

interface SearchFiltersProps {
  searchType: "fulltext" | "semantic" | "hybrid";
  instructor: string;
  category: string;
  instructors: string[];
  categories: string[];
  onTypeChange: (t: "fulltext" | "semantic" | "hybrid") => void;
  onInstructorChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  hybrid: "Híbrida",
  fulltext: "Palabras exactas",
  semantic: "Semántica",
};

export function SearchFilters({
  searchType,
  instructor,
  category,
  instructors,
  categories,
  onTypeChange,
  onInstructorChange,
  onCategoryChange,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Tipo de búsqueda */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs">
        {(["hybrid", "fulltext", "semantic"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1.5 transition-colors ${
              searchType === t
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Instructor */}
      {instructors.length > 0 && (
        <select
          value={instructor}
          onChange={(e) => onInstructorChange(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos los instructores</option>
          {instructors.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      )}

      {/* Categoría */}
      {categories.length > 0 && (
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
