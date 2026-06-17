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
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <h2 className="text-base font-semibold text-foreground tracking-wide uppercase">
        Material de Estudio
      </h2>

      {/* Resumen con IA */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Resumen
        </h3>
        <VideoSummary videoId={videoId} initialSummary={initialSummary} />
      </section>

      {/* Términos técnicos */}
      {terms.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Términos Técnicos Mencionados
          </h3>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <span
                key={t}
                className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
