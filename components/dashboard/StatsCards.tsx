import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Clock, CheckCircle, FileText } from "lucide-react";

interface Stats {
  totalVideos: number;
  totalHours: number;
  transcribed: number;
  inQueue: number;
  totalWords: number;
  searchCount: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ title, value, subtitle, icon, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={`rounded-lg p-2 ${
            highlight ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
          }`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: Stats }) {
  const pct =
    stats.totalVideos > 0
      ? Math.round((stats.transcribed / stats.totalVideos) * 100)
      : 0;

  const wordDisplay =
    stats.totalWords >= 1_000_000
      ? `${(stats.totalWords / 1_000_000).toFixed(1)}M`
      : stats.totalWords >= 1_000
      ? `${(stats.totalWords / 1_000).toFixed(1)}K`
      : String(stats.totalWords);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="Videos"
        value={stats.totalVideos}
        subtitle={`${stats.transcribed} transcriptos · ${pct}%`}
        icon={<Video className="h-4 w-4" />}
      />
      <StatCard
        title="Horas de contenido"
        value={stats.totalHours.toFixed(1)}
        subtitle="Horas de capacitación indexadas"
        icon={<Clock className="h-4 w-4" />}
      />
      <StatCard
        title="Palabras indexadas"
        value={wordDisplay}
        subtitle="En transcripciones buscables"
        icon={<FileText className="h-4 w-4" />}
        highlight={stats.totalWords > 0}
      />
      <StatCard
        title="Transcritos listos"
        value={stats.transcribed}
        subtitle={stats.inQueue > 0 ? `${stats.inQueue} en cola` : "Cola vacía"}
        icon={<CheckCircle className="h-4 w-4" />}
        highlight={stats.transcribed > 0}
      />
    </div>
  );
}
