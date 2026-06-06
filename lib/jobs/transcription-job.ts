import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db/prisma";
import { VideoStatus, JobStatus, JobType } from "@/lib/types";
import { extractAudio, generateThumbnail, getVideoMetadata } from "@/lib/video/ffmpeg";
import { runTranscription } from "@/lib/whisper/client";
import { generateEmbeddingsForVideo } from "@/lib/embeddings/ollama";

const MAX_RETRIES = 2;
// Throttle de actualizaciones de progreso: solo actualizar DB cada N%
const PROGRESS_UPDATE_THRESHOLD = 5;

/**
 * Pipeline completo de procesamiento de un video:
 *   1. Generar thumbnail
 *   2. Extraer audio (FFmpeg MP4 → WAV 16kHz mono)
 *   3. Transcribir (Python faster-whisper)
 *   4. Guardar Transcript + Segments en DB
 *   5. Limpiar audio temporal
 *   6. Marcar video como READY
 *
 * Crea un Job en DB para tracking. Actualiza progreso en tiempo real.
 */
export async function runTranscriptionPipeline(videoId: string): Promise<void> {
  const job = await prisma.job.create({
    data: {
      videoId,
      type: JobType.TRANSCRIBE,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      attempts: 1,
    },
  });

  const audioPath = path.join(process.cwd(), "storage", "audio", `${videoId}.wav`);
  const transcriptJsonPath = path.join(process.cwd(), "storage", "transcripts", `${videoId}.json`);
  const thumbPath = path.join(process.cwd(), "storage", "thumbnails", `${videoId}.jpg`);

  try {
    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });

    // ── Paso 0: Verificar metadata del video (opcional — requiere ffprobe) ──
    await setVideoStatus(videoId, VideoStatus.EXTRACTING_AUDIO);
    await setJobProgress(job.id, 2);

    try {
      const metadata = await getVideoMetadata(video.filepath);

      if (!metadata.hasAudio) {
        throw new Error("El video no tiene pista de audio. No se puede transcribir.");
      }

      if (metadata.duration > 0 && metadata.duration !== video.duration) {
        await prisma.video.update({ where: { id: videoId }, data: { duration: metadata.duration } });
      }
    } catch (err) {
      // Si ffprobe no está disponible continuamos igual — el error de "sin audio"
      // lo detectará FFmpeg al intentar extraer el audio
      if ((err as Error).message?.includes("no tiene pista de audio")) throw err;
      console.warn("[pipeline] ffprobe no disponible, saltando verificación de metadata:", (err as Error).message);
    }

    // ── Paso 1: Thumbnail (no crítico) ────────────────────────────────────
    await setJobProgress(job.id, 3);

    await generateThumbnail(video.filepath, thumbPath);
    await prisma.video.update({ where: { id: videoId }, data: { thumbnailPath: thumbPath } });

    // ── Paso 2: Extracción de audio ────────────────────────────────────────
    await setJobProgress(job.id, 8);
    await extractAudio(video.filepath, audioPath);
    await setJobProgress(job.id, 20);

    // ── Paso 3: Transcripción con reintentos ───────────────────────────────
    await setVideoStatus(videoId, VideoStatus.TRANSCRIBING);

    let lastReportedProgress = 20;

    const transcriptionResult = await withRetry(
      () =>
        runTranscription({
          audioPath,
          outputPath: transcriptJsonPath,
          onProgress: async (whisperPct) => {
            // Mapear progreso de Whisper (0-100) a progreso del job (20-90)
            const jobPct = 20 + Math.floor(whisperPct * 0.7);

            if (jobPct >= lastReportedProgress + PROGRESS_UPDATE_THRESHOLD) {
              lastReportedProgress = jobPct;
              await setJobProgress(job.id, jobPct);

              // Estimar tiempo restante basado en progreso actual
              const elapsed = Date.now() - (job.startedAt?.getTime() ?? Date.now());
              if (jobPct > 20) {
                const estimatedTotal = (elapsed / (jobPct - 20)) * 70;
                const remaining = Math.round((estimatedTotal - elapsed) / 1000);
                await prisma.job.update({
                  where: { id: job.id },
                  data: { estimatedTimeRemaining: remaining > 0 ? remaining : null },
                });
              }
            }
          },
        }),
      MAX_RETRIES,
      videoId,
      job.id
    );

    // ── Paso 4: Guardar en DB ──────────────────────────────────────────────
    await setVideoStatus(videoId, VideoStatus.GENERATING_EMBEDDINGS);
    await setJobProgress(job.id, 91);

    const wordCount = transcriptionResult.full_text.split(/\s+/).filter(Boolean).length;
    const avgConfidence =
      transcriptionResult.segments.length > 0
        ? transcriptionResult.segments.reduce((sum, s) => sum + (s.confidence ?? 0), 0) /
          transcriptionResult.segments.length
        : null;

    // Upsert transcript (puede existir si se está reprocesando)
    await prisma.transcript.upsert({
      where: { videoId },
      create: {
        videoId,
        fullText: transcriptionResult.full_text,
        language: transcriptionResult.language,
        wordCount,
        characterCount: transcriptionResult.full_text.length,
        avgConfidence,
      },
      update: {
        fullText: transcriptionResult.full_text,
        language: transcriptionResult.language,
        wordCount,
        characterCount: transcriptionResult.full_text.length,
        avgConfidence,
        updatedAt: new Date(),
      },
    });

    // Borrar segments previos si se está reprocesando
    await prisma.segment.deleteMany({ where: { videoId } });

    // Insertar todos los segmentos en un batch
    await prisma.segment.createMany({
      data: transcriptionResult.segments.map((s) => ({
        videoId,
        segmentIndex: s.index,
        startTime: s.start,
        endTime: s.end,
        text: s.text,
        confidence: s.confidence,
      })),
    });

    await setJobProgress(job.id, 92);

    // ── Paso 4b: Generar embeddings (Ollama) ──────────────────────────────
    let embeddingsFailed = false;
    try {
      let embPct = 0;
      await generateEmbeddingsForVideo(videoId, (pct) => {
        embPct = pct;
        // Map 0-100 embedding progress to job 92-97
        setJobProgress(job.id, 92 + Math.floor(pct * 0.05)).catch(() => {});
      });
      console.log(`[pipeline] Embeddings generados para video ${videoId}`);
    } catch (embErr) {
      // Embeddings son útiles pero no críticos — el video queda READY igual
      embeddingsFailed = true;
      console.warn("[pipeline] Embeddings fallaron (Ollama no disponible?):", (embErr as Error).message);
    }

    await setJobProgress(job.id, 97);

    // ── Paso 5: Limpieza y finalización ───────────────────────────────────
    await fs.unlink(audioPath).catch(() => {});  // silenciar si ya fue borrado

    await prisma.video.update({
      where: { id: videoId },
      data: { status: VideoStatus.READY, processedAt: new Date() },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        estimatedTimeRemaining: null,
      },
    });

    console.log(
      `[pipeline] ✅ Video ${videoId} procesado: ${transcriptionResult.segments.length} segmentos`
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] ❌ Error procesando video ${videoId}:`, errorMessage);

    // Limpiar archivo de audio temporal si existe
    await fs.unlink(audioPath).catch(() => {});

    await prisma.video
      .update({
        where: { id: videoId },
        data: { status: VideoStatus.ERROR, processingError: errorMessage },
      })
      .catch(() => {});

    await prisma.job
      .update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          error: errorMessage,
          completedAt: new Date(),
          estimatedTimeRemaining: null,
        },
      })
      .catch(() => {});

    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setVideoStatus(videoId: string, status: string) {
  await prisma.video.update({ where: { id: videoId }, data: { status } });
}

async function setJobProgress(jobId: string, progress: number) {
  await prisma.job.update({ where: { id: jobId }, data: { progress } });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  videoId: string,
  jobId: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[pipeline] Intento ${attempt}/${maxRetries} falló para video ${videoId}:`, err);

      if (attempt < maxRetries) {
        await prisma.job.update({ where: { id: jobId }, data: { attempts: attempt + 1 } });
        await new Promise((r) => setTimeout(r, 3_000 * attempt));
      }
    }
  }

  throw lastError;
}
