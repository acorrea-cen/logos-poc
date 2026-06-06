#!/usr/bin/env tsx
/**
 * Script de test E2E del pipeline de transcripción.
 *
 * Uso:
 *   npm run test:pipeline -- --video ./storage/watch/video.mp4
 *   npm run test:pipeline -- --video ./storage/watch/video.mp4 --step audio
 *
 * Steps disponibles:
 *   all     → pipeline completo (default)
 *   audio   → solo extraer audio con FFmpeg
 *   thumb   → solo generar thumbnail
 *   whisper → solo transcribir (requiere WAV existente en storage/audio/{id}.wav)
 */

import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { parseArgs } from "util";

// Cargar .env.local antes que cualquier import que use process.env
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

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
process.env.OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      video: { type: "string" },
      step: { type: "string", default: "all" },
      model: { type: "string", default: process.env.WHISPER_MODEL_PATH ?? "medium" },
    },
    strict: false,
  });

  if (!values.video) {
    console.error("❌ Falta --video <path>");
    console.error("Uso: npm run test:pipeline -- --video ./storage/watch/test.mp4");
    process.exit(1);
  }

  const videoPath = path.resolve(values.video as string);
  const step = values.step as string;
  const model = values.model as string;

  // Verificar que el video existe
  try {
    await fs.access(videoPath);
  } catch {
    console.error(`❌ No se encuentra el archivo: ${videoPath}`);
    process.exit(1);
  }

  const videoId = `test-${Date.now()}`;
  const audioPath = path.resolve(`storage/audio/${videoId}.wav`);
  const thumbPath = path.resolve(`storage/thumbnails/${videoId}.jpg`);
  const outputPath = path.resolve(`storage/transcripts/${videoId}.json`);

  console.log("\n🎬 LOGOS — Test de Pipeline E2E");
  console.log("━".repeat(50));
  console.log(`Video:  ${videoPath}`);
  console.log(`Step:   ${step}`);
  console.log(`Modelo: ${model}`);
  console.log("━".repeat(50) + "\n");

  // Importaciones dinámicas para evitar problemas con el módulo de Next.js
  const { getVideoMetadata, extractAudio, generateThumbnail } = await import("../lib/video/ffmpeg");
  const { runTranscription } = await import("../lib/whisper/client");

  // ── Metadata ──────────────────────────────────────────────────────────────
  console.log("📋 Leyendo metadata del video...");
  const t0 = Date.now();
  const metadata = await getVideoMetadata(videoPath);
  console.log(`   Duración:    ${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s`);
  console.log(`   Resolución:  ${metadata.width}×${metadata.height}`);
  console.log(`   Codec:       ${metadata.codec}`);
  console.log(`   Tiene audio: ${metadata.hasAudio ? "✅" : "❌"}`);

  if (!metadata.hasAudio) {
    console.error("\n❌ El video no tiene pista de audio — no se puede transcribir.");
    process.exit(1);
  }

  if (step === "audio" || step === "all") {
    // ── Extracción de audio ────────────────────────────────────────────────
    console.log("\n🔊 Extrayendo audio (FFmpeg → WAV 16kHz mono)...");
    const t1 = Date.now();
    await extractAudio(videoPath, audioPath);
    const audioStat = await fs.stat(audioPath);
    console.log(`   ✅ ${path.basename(audioPath)} (${(audioStat.size / 1024 / 1024).toFixed(1)} MB) — ${Date.now() - t1}ms`);
  }

  if (step === "thumb" || step === "all") {
    // ── Thumbnail ─────────────────────────────────────────────────────────
    console.log("\n🖼  Generando thumbnail...");
    const t2 = Date.now();
    await generateThumbnail(videoPath, thumbPath);
    try {
      await fs.access(thumbPath);
      console.log(`   ✅ ${path.basename(thumbPath)} — ${Date.now() - t2}ms`);
    } catch {
      console.log(`   ⚠️  Thumbnail no generado (no crítico)`);
    }
  }

  if (step === "whisper" || step === "all") {
    // ── Transcripción ─────────────────────────────────────────────────────
    const wavToTranscribe = step === "whisper"
      ? path.resolve(`storage/audio/${videoId}.wav`)
      : audioPath;

    console.log(`\n🎙  Transcribiendo con faster-whisper (${model}, int8)...`);
    console.log("   (la primera vez descarga el modelo ~1.5GB — paciencia)\n");

    const t3 = Date.now();
    let lastProgress = 0;

    const result = await runTranscription({
      audioPath: wavToTranscribe,
      outputPath,
      modelPath: model,
      onProgress: (pct) => {
        if (pct >= lastProgress + 10) {
          lastProgress = pct;
          const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
          process.stdout.write(`\r   [${bar}] ${pct}%`);
        }
      },
    });

    const elapsed = ((Date.now() - t3) / 1000).toFixed(1);
    const ratio = (metadata.duration / parseFloat(elapsed)).toFixed(1);

    console.log(`\n\n   ✅ Transcripción completa en ${elapsed}s (${ratio}x tiempo real)`);
    console.log(`   Segmentos: ${result.segments.length}`);
    console.log(`   Palabras:  ${result.full_text.split(/\s+/).length}`);
    console.log(`   Idioma:    ${result.language}`);

    // Mostrar primeros 3 segmentos como preview
    console.log("\n📄 Primeros segmentos:");
    result.segments.slice(0, 3).forEach((s) => {
      const ts = `[${String(Math.floor(s.start / 60)).padStart(2, "0")}:${String(Math.floor(s.start % 60)).padStart(2, "0")}]`;
      console.log(`   ${ts} ${s.text}`);
    });

    console.log(`\n   JSON guardado en: ${outputPath}`);

    // Limpiar audio temporal
    if (step === "all") {
      await fs.unlink(audioPath).catch(() => {});
      console.log("   Audio temporal eliminado.");
    }
  }

  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Test completado en ${totalElapsed}s\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
