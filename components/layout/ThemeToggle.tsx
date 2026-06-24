"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a vista clara" : "Cambiar a vista oscura"}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4 shrink-0" />
          Vista clara
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 shrink-0" />
          Vista oscura
        </>
      )}
    </button>
  );
}
