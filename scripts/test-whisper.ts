#!/usr/bin/env tsx
/**
 * Testea solo el paso de transcripción con Whisper, sin necesitar FFmpeg.
 * Útil para verificar que faster-whisper funciona antes de instalar FFmpeg.
 *
 * Uso:
 *   npm run test:whisper -- --audio ./storage/audio/test-whisper.wav
 */

import path from "path";
import fs from "fs/promises";
import { parseArgs } from "util";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      audio: { type: "string" },
      model: { type: "string", default: process.env.WHISPER_MODEL_PATH ?? "medium" },
    },
    strict: false,
  });

  if (!values.audio) {
    console.error("❌ Falta --audio <path>");
    console.error("Uso: npm run test:whisper -- --audio ./storage/audio/test-whisper.wav");
    console.error("\nPrimero generá el audio de prueba:");
    console.error("  .\\scripts\\generate-test-audio.ps1");
    process.exit(1);
  }

  const audioPath = path.resolve(values.audio as string);
  const model = values.model as string;

  try {
    await fs.access(audioPath);
  } catch {
    console.error(`❌ No se encuentra: ${audioPath}`);
    process.exit(1);
  }

  const outputPath = path.resolve(`storage/transcripts/test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log("\n🎙  LOGOS — Test de Whisper (sin FFmpeg)");
  console.log("━".repeat(50));
  console.log(`Audio:  ${audioPath}`);
  console.log(`Modelo: ${model}`);
  console.log("━".repeat(50));
  console.log("(La primera vez descarga el modelo ~1.5GB)\n");

  const { runTranscription } = await import("../lib/whisper/client");

  const t0 = Date.now();
  let lastProgress = 0;

  const result = await runTranscription({
    audioPath,
    outputPath,
    modelPath: model,
    onProgress: (pct) => {
      if (pct >= lastProgress + 5) {
        lastProgress = pct;
        const filled = Math.floor(pct / 5);
        const bar = "█".repeat(filled) + "░".repeat(20 - filled);
        process.stdout.write(`\r   [${bar}] ${pct}%`);
      }
    },
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n");
  console.log(`✅ Transcripción completada en ${elapsed}s`);
  console.log(`   Segmentos: ${result.segments.length}`);
  console.log(`   Palabras:  ${result.full_text.split(/\s+/).filter(Boolean).length}`);
  console.log(`   Idioma detectado: ${result.language}`);

  console.log("\n📄 Transcripción completa:");
  console.log("─".repeat(50));
  result.segments.forEach((s) => {
    const mm = String(Math.floor(s.start / 60)).padStart(2, "0");
    const ss = String(Math.floor(s.start % 60)).padStart(2, "0");
    console.log(`[${mm}:${ss}] ${s.text}`);
  });
  console.log("─".repeat(50));

  console.log(`\n📁 JSON guardado en: ${outputPath}\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
