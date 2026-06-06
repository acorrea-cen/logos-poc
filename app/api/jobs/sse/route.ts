import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint — transmite actualizaciones de progreso en tiempo real.
 *
 * GET /api/jobs/sse?videoId=xxx  → progreso de un video específico
 * GET /api/jobs/sse              → estado general de la cola
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      };

      // Heartbeat cada 20s para mantener la conexión viva a través de proxies
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 20_000);

      const poll = setInterval(async () => {
        if (closed) return;
        try {
          if (videoId) {
            const job = await prisma.job.findFirst({
              where: { videoId },
              orderBy: { createdAt: "desc" },
            });

            if (!job) {
              send({ error: "Job no encontrado" });
              return;
            }

            send({
              jobId: job.id,
              status: job.status,
              progress: job.progress,
              estimatedTimeRemaining: job.estimatedTimeRemaining,
              error: job.error,
            });

            if (job.status === "COMPLETED" || job.status === "FAILED") {
              clearInterval(poll);
              clearInterval(heartbeat);
              closed = true;
              setTimeout(() => controller.close(), 500);
            }
          } else {
            // Cola general
            const active = await prisma.job.findMany({
              where: { status: { in: ["PENDING", "RUNNING"] } },
              orderBy: { createdAt: "asc" },
              include: { video: { select: { title: true } } },
            });

            send({
              active: active.map((j) => ({
                jobId: j.id,
                videoId: j.videoId,
                videoTitle: j.video.title,
                status: j.status,
                progress: j.progress,
                estimatedTimeRemaining: j.estimatedTimeRemaining,
              })),
              count: active.length,
            });
          }
        } catch (err) {
          console.error("[sse] Error:", err);
        }
      }, 2_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* ya cerrado */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
