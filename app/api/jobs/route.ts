import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getQueueStats } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const [activeJobs, recentJobs] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: ["PENDING", "RUNNING"] } },
      orderBy: { createdAt: "asc" },
      include: { video: { select: { title: true, filename: true } } },
    }),
    prisma.job.findMany({
      where: { status: { in: ["COMPLETED", "FAILED", "CANCELLED"] } },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { video: { select: { title: true, filename: true } } },
    }),
  ]);

  return NextResponse.json({
    queue: getQueueStats(),
    active: activeJobs,
    recent: recentJobs,
  });
}
