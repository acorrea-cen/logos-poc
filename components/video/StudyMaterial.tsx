import { BookOpen, Tag } from "lucide-react";
import { VideoSummary } from "@/components/video/VideoSummary";

interface Segment {
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
}

interface Props {
  videoId: string;
  segments: Segment[];
  initialSummary?: string | null;
}

const BANKING_TERMS = [
  "BCRA", "CBU", "CVU", "cuenta corriente", "caja de ahorro", "plazo fijo",
  "tarjeta de crédito", "tarjeta de débito", "débito automático", "transferencia",
  "acreditación", "saldo", "extracto", "sucursal", "cajero automático", "ATM",
  "comisión", "tasa de interés", "interés", "mora", "vencimiento", "cuota",
  "home banking", "homebanking", "banca digital", "compliance", "PEP", "UIF",
  "lavado de dinero", "seguro de depósito", "encaje", "liquidez", "H2H",
  "testing", "ambiente", "monitor", "BMR", "débito directo", "crédito",
];

function findTerms(segments: Segment[]): string[] {
  const body = segments.map((s) => s.text).join(" ").toLowerCase();
  return BANKING_TERMS.filter((t) => body.includes(t.toLowerCase()));
}

export function StudyMaterial({ videoId, segments, initialSummary }: Props) {
  if (segments.length === 0) return null;

  const terms = findTerms(segments);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header de la sección */}
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Material de Estudio</span>
        <span className="ml-auto text-[11px] text-muted-foreground">Generado por IA</span>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Resumen */}
        <VideoSummary videoId={videoId} initialSummary={initialSummary} />

        {/* Términos técnicos */}
        {terms.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Términos mencionados
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {terms.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary/8 border border-primary/20 px-3 py-1 text-xs font-medium text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
