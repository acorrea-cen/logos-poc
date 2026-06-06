#!/usr/bin/env tsx
/**
 * Watch folder — monitorea storage/watch/ y procesa automáticamente los MP4 nuevos.
 * Ejecutar en una terminal separada: npm run watch
 */

import chokidar from "chokidar";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { randomUUID } from "crypto";

// Cargar .env.local (Next.js lo lee automáticamente, pero tsx no)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fsSync.existsSync(envLocalPath)) {
  const lines = fsSync.readFileSync(envLocalPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

// Fallback si DATABASE_URL no estaba en .env.local
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const WATCH_PATH = path.resolve(process.cwd(), "storage", "watch");
const VIDEOS_PATH = path.resolve(process.cwd(), "storage", "videos");

async function processFile(watchedPath: string) {
  const filename = path.basename(watchedPath);
  if (!filename.toLowerCase().endsWith(".mp4")) return;

  console.log(`\n📥 Nuevo archivo detectado: ${filename}`);

  try {
    const { prisma } = await import("../lib/db/prisma");
    const { getVideoMetadata } = await import("../lib/video/ffmpeg");
    const { runTranscriptionPipeline } = await import("../lib/jobs/transcription-job");
    const transcriptionQueue = (await import("../lib/jobs/queue")).default;
    const { VideoStatus } = await import("../lib/types");

    // Verificar que el archivo esté completamente escrito
    const stat = await fs.stat(watchedPath);

    // Mover a storage/videos/
    await fs.mkdir(VIDEOS_PATH, { recursive: true });
    const videoId = randomUUID().replace(/-/g, "");
    const destPath = path.join(VIDEOS_PATH, `${videoId}.mp4`);
    await fs.rename(watchedPath, destPath);

    // Metadata
    let duration = 0;
    try {
      const meta = await getVideoMetadata(destPath);
      duration = meta.duration;
    } catch {
      // FFmpeg no disponible — continuar sin duración
    }

    const video = await prisma.video.create({
      data: {
        id: videoId,
        title: filename.replace(/\.mp4$/i, "").replace(/[-_]/g, " "),
        filename,
        filepath: destPath,
        fileSize: BigInt(stat.size),
        duration,
        mimeType: "video/mp4",
        status: VideoStatus.UPLOADED,
      },
    });

    transcriptionQueue.add(() => runTranscriptionPipeline(video.id)).catch(console.error);

    console.log(`✅ Encolado: ${video.title} (${video.id})`);
    console.log(`   Seguí el progreso en: http://localhost:3001/queue?videoId=${video.id}`);
  } catch (err) {
    console.error(`❌ Error procesando ${filename}:`, err);
  }
}

async function main() {
  await fs.mkdir(WATCH_PATH, { recursive: true });

  console.log("👀 LOGOS — Watch Folder activo");
  console.log(`   Carpeta monitoreada: ${WATCH_PATH}`);
  console.log("   Cualquier MP4 que copies acá se transcribirá automáticamente.\n");

  const watcher = chokidar.watch(WATCH_PATH, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 3000, // esperar 3s sin cambios antes de procesar
      pollInterval: 500,
    },
  });

  watcher.on("add", processFile);
  watcher.on("error", (err) => console.error("[watch] Error:", err));
}

main().catch(console.error);
