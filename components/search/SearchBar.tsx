"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  isLoading?: boolean;
  onSearch: (query: string) => void;
}

export function SearchBar({ initialQuery = "", isLoading, onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(q.trim());
    }, 400);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center">
        {isLoading ? (
          <Loader2 className="absolute left-3 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        )}
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Buscar en transcripciones..."
          className="w-full rounded-xl border border-border bg-input pl-9 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </div>
    </form>
  );
}
