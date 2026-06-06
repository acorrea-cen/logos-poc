"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { VideoStatusLabel } from "@/lib/types";

interface JobState {
  status: string;
  progress: number;
  estimatedTimeRemaining: number | null;
  error?: string | null;
}

interface JobProgressProps {
  videoId: string;
  videoTitle: string;
  initialStatus: string;
  initialProgress: number;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export function JobProgress({ videoId, videoTitle, initialStatus, initialProgress }: JobProgressProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobState>({
    status: initialStatus,
    progress: initialProgress,
    estimatedTimeRemaining: null,
  });

  const isDone = job.status === "COMPLETED" || job.status === "FAILED";

  useEffect(() => {
    if (isDone) return;

    const es = new EventSource(`/api/jobs/sse?videoId=${videoId}`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as JobState;
      setJob(data);

      if (data.status === "COMPLETED" || data.status === "FAILED") {
        es.close();
        // Refrescar la página para mostrar el estado final
        setTimeout(() => router.refresh(), 1000);
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [videoId, isDone, router]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{videoTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {VideoStatusLabel[job.status as keyof typeof VideoStatusLabel] ?? job.status}
          </p>
        </div>

        <div className="shrink-0">
          {job.status === "COMPLETED" && (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
          {job.status === "FAILED" && (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          {!isDone && (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{job.progress}%</span>
          {job.estimatedTimeRemaining != null && !isDone && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatSeconds(job.estimatedTimeRemaining)} restantes
            </span>
          )}
        </div>
        <Progress value={job.progress} />
      </div>

      {job.status === "FAILED" && job.error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {job.error}
        </p>
      )}
    </div>
  );
}
