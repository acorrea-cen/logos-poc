"use client";

import { useEffect, useState } from "react";

interface Props {
  videoId: string;
  initialSummary?: string | null;
}

// ── Mini markdown renderer ──────────────────────────────────────────

type Block =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

function parseBlocks(raw: string): Block[] {
  const blocks: Block[] = [];

  // Normalise line endings, then split by blank lines
  const sections = raw.replace(/\r\n/g, "\n").split(/\n{2,}/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Heading ##
    if (/^#{2,3}\s/.test(trimmed)) {
      const level = trimmed.startsWith("###") ? "h3" : "h2";
      blocks.push({ type: level, text: trimmed.replace(/^#{2,3}\s+/, "") });
      continue;
    }

    // List block — every non-empty line starts with - or *
    const lines = trimmed.split("\n");
    const listLines = lines.filter((l) => /^[\-\*]\s/.test(l.trim()));
    if (listLines.length > 0 && listLines.length >= lines.filter(Boolean).length * 0.6) {
      blocks.push({
        type: "list",
        items: listLines.map((l) => l.replace(/^[\-\*]\s+/, "").trim()),
      });
      continue;
    }

    // Regular paragraph — join lines into one
    blocks.push({ type: "p", text: lines.join(" ").trim() });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Strip lone asterisks (not part of **)
  const cleaned = text.replace(/\*\*([^*]+)\*\*/g, "%%BOLD%%$1%%BOLD%%").replace(/\*/g, "").replace(/%%BOLD%%([^%]*)%%BOLD%%/g, "**$1**");

  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MarkdownContent({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "h2") {
          return (
            <h3 key={i} className="text-sm font-semibold text-foreground mt-4 first:mt-0">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === "h3") {
          return (
            <h4 key={i} className="text-sm font-medium text-foreground/90 mt-3 first:mt-0">
              {renderInline(block.text)}
            </h4>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────

export function VideoSummary({ videoId, initialSummary }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (summary) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/summary`, { method: "POST" });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Error desconocido");
        return;
      }
      setSummary(data.summary ?? null);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-4 text-sm text-muted-foreground">
        <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Analizando transcripción con IA… puede tardar unos minutos.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm">
        <p className="text-destructive">{error}</p>
        <button
          onClick={generate}
          className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return <MarkdownContent text={summary} />;
}
