import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import type { VideoMetadata } from "./types";

const execFileAsync = promisify(execFile);

// Timeout generoso para videos largos (120 min → extracción puede tardar ~5 min)
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

/**
 * Extrae el audio de un video MP4 como WAV 16kHz mono.
 * Formato óptimo para Whisper: 16kHz, 1 canal, PCM signed 16-bit.
 */
export async function extractAudio(
  videoPath: string,
  outputWavPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputWavPath), { recursive: true });

  const args = [
    "-y",                     // sobreescribir si existe
    "-i", videoPath,
    "-vn",                    // sin video
    "-ar", "16000",           // 16kHz — requerido por Whisper
    "-ac", "1",               // mono
    "-c:a", "pcm_s16le",      // PCM 16-bit signed little-endian
    "-f", "wav",
    outputWavPath,
  ];

  try {
    await execFileAsync(ffmpegBin(), args, { timeout: FFMPEG_TIMEOUT_MS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`FFmpeg audio extraction failed: ${msg}`);
  }
}

/**
 * Genera un thumbnail JPG del video en el segundo 5 (o al 10% de la duración).
 * Escala a 640×360 manteniendo aspect ratio con letterbox.
 */
export async function generateThumbnail(
  videoPath: string,
  outputJpgPath: string,
  atSecond: number = 5
): Promise<void> {
  await fs.mkdir(path.dirname(outputJpgPath), { recursive: true });

  const args = [
    "-y",
    "-i", videoPath,
    "-ss", String(atSecond),
    "-vframes", "1",
    "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2",
    "-q:v", "3",              // calidad JPEG (2=máx, 5=buena, 31=mín)
    outputJpgPath,
  ];

  try {
    await execFileAsync(ffmpegBin(), args, { timeout: 30_000 });
  } catch {
    // Thumbnail no es crítico — si falla, continuar sin él
    console.warn(`[ffmpeg] No se pudo generar thumbnail para ${path.basename(videoPath)}`);
  }
}

/**
 * Obtiene metadata del video usando ffprobe.
 */
export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const args = [
    "-v", "quiet",
    "-print_format", "json",
    "-show_streams",
    "-show_format",
    videoPath,
  ];

  let stdout: string;
  try {
    const result = await execFileAsync(ffprobeBin(), args, { timeout: 30_000 });
    stdout = result.stdout;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ffprobe failed: ${msg}`);
  }

  const probe = JSON.parse(stdout) as {
    streams: Array<{
      codec_type: string;
      codec_name: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      bit_rate?: string;
    }>;
    format: {
      duration?: string;
      bit_rate?: string;
    };
  };

  const videoStream = probe.streams.find((s) => s.codec_type === "video");
  const audioStream = probe.streams.find((s) => s.codec_type === "audio");

  const duration = parseFloat(probe.format.duration ?? "0");
  const [fpsNum, fpsDen] = (videoStream?.avg_frame_rate ?? "0/1").split("/").map(Number);

  return {
    duration: Math.round(duration),
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    codec: videoStream?.codec_name ?? "unknown",
    bitrate: parseInt(probe.format.bit_rate ?? "0", 10),
    fps: fpsDen > 0 ? Math.round(fpsNum / fpsDen) : 0,
    hasAudio: !!audioStream,
  };
}

/**
 * Verifica que ffmpeg y ffprobe estén en PATH.
 * Devuelve el string de versión o null si no está disponible.
 */
export async function checkFFmpeg(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(ffmpegBin(), ["-version"], { timeout: 5_000 });
    const firstLine = stdout.split("\n")[0];
    return firstLine ?? "ffmpeg (version desconocida)";
  } catch {
    return null;
  }
}
