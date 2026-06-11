import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { VideoStatus } from "@/lib/types";
import transcriptionQueue from "@/lib/jobs/queue";
import { runTranscriptionPipeline } from "@/lib/jobs/transcription-job";
import { getVideoMetadata } from "@/lib/video/ffmpeg";

const VIDEOS_PATH = path.resolve(process.cwd(), "storage", "videos");

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".mp4") && !filename.endsWith(".mkv")) {
    return NextResponse.json({ error: "Solo se aceptan archivos MP4 o MKV" }, { status: 400 });
  }

  const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera el límite de 2 GB" }, { status: 400 });
  }

  const videoId = randomUUID().replace(/-/g, "");
  const ext = filename.endsWith(".mkv") ? ".mkv" : ".mp4";
  const filepath = path.join(VIDEOS_PATH, `${videoId}${ext}`);

  try {
    await mkdir(VIDEOS_PATH, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch (err) {
    console.error("[upload] Error guardando archivo:", err);
    return NextResponse.json({ error: "Error al guardar el archivo" }, { status: 500 });
  }

  // Metadata via ffprobe (opcional — si FFmpeg no está disponible usa valores por defecto)
  let duration = 0;
  try {
    const meta = await getVideoMetadata(filepath);
    duration = meta.duration;
  } catch {
    // FFmpeg no disponible — duration queda en 0, se corrige al procesar
  }

  const rawTitle = (formData.get("title") as string | null)?.trim();
  const title = rawTitle || file.name.replace(/\.(mp4|mkv)$/i, "");

  const video = await prisma.video.create({
    data: {
      id: videoId,
      title,
      filename: file.name,
      filepath,
      fileSize: BigInt(file.size),
      duration,
      mimeType: ext === ".mkv" ? "video/x-matroska" : "video/mp4",
      status: VideoStatus.UPLOADED,
      instructor: (formData.get("instructor") as string | null) || null,
      category: (formData.get("category") as string | null) || null,
      topic: (formData.get("topic") as string | null) || null,
      recordedAt: (formData.get("recordedAt") as string | null)
        ? new Date(formData.get("recordedAt") as string)
        : null,
    },
  });

  // Encolar transcripción (fire-and-forget)
  transcriptionQueue.add(() => runTranscriptionPipeline(video.id)).catch((err) =>
    console.error(`[upload] Error en pipeline para ${video.id}:`, err)
  );

  return NextResponse.json({ videoId: video.id, title: video.title }, { status: 201 });
}
