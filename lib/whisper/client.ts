import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import type { TranscriptionResult } from "./types";

interface TranscribeOptions {
  audioPath: string;
  outputPath: string;
  modelPath?: string;
  onProgress?: (progress: number) => Promise<void> | void;
}

/**
 * Ejecuta el worker Python de transcripción via child_process.spawn().
 *
 * Usamos spawn (no exec) porque:
 * - exec tiene límite de buffer — no sirve para transcripciones largas
 * - spawn permite leer stderr línea a línea → progreso en tiempo real
 */
export async function runTranscription(
  options: TranscribeOptions
): Promise<TranscriptionResult> {
  const { audioPath, outputPath, onProgress } = options;
  const modelPath =
    options.modelPath ??
    process.env.WHISPER_MODEL_PATH ??
    "medium";

  const workerPath = path.resolve(process.cwd(), "workers", "transcribe.py");
  const pythonBin = process.env.PYTHON_PATH ?? "python";

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, [
      workerPath,
      "--audio", audioPath,
      "--output", outputPath,
      "--model", modelPath,
    ]);

    let stderrBuffer = "";
    const stderrLines: string[] = [];

    proc.stderr.on("data", (data: Buffer) => {
      const chunk = stderrBuffer + data.toString();
      const lines = chunk.split("\n");
      stderrBuffer = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        stderrLines.push(line); // guardar para diagnóstico en caso de error

        if (line.startsWith("PROGRESS:")) {
          const pct = parseInt(line.slice(9), 10);
          if (!isNaN(pct) && onProgress) {
            // Fire-and-forget — no bloqueamos el stream por una actualización de DB
            Promise.resolve(onProgress(pct)).catch(() => {});
          }
        } else if (line.startsWith("INFO:")) {
          console.log(`[whisper] ${line.slice(5)}`);
        } else if (line.startsWith("ERROR:")) {
          console.error(`[whisper] ${line.slice(6)}`);
        } else {
          // Output de faster-whisper que no tiene prefijo (mensajes de carga, etc.)
          console.log(`[whisper] ${line}`);
        }
      }
    });

    proc.on("error", (err) => {
      const hint =
        err.message.includes("ENOENT")
          ? ` — ¿Python está instalado y en PATH? (intentó usar '${pythonBin}')`
          : "";
      reject(new Error(`Python process failed: ${err.message}${hint}`));
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        const lastLines = stderrLines.slice(-5).join("\n");
        reject(
          new Error(
            `Transcription exited with code ${code}.\nÚltimas líneas de stderr:\n${lastLines}`
          )
        );
        return;
      }

      try {
        const raw = await fs.readFile(outputPath, "utf-8");
        resolve(JSON.parse(raw) as TranscriptionResult);
      } catch (err) {
        reject(
          new Error(
            `Transcription succeeded but output JSON is unreadable: ${err}`
          )
        );
      }
    });
  });
}

/**
 * Verifica que Python y faster-whisper están disponibles.
 */
export async function checkPython(): Promise<{ ok: boolean; version?: string; error?: string }> {
  const pythonBin = process.env.PYTHON_PATH ?? "python";

  return new Promise((resolve) => {
    const proc = spawn(pythonBin, ["-c", "import faster_whisper; print('ok')"]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    proc.on("error", () =>
      resolve({ ok: false, error: `Python no encontrado (bin: ${pythonBin})` })
    );

    proc.on("close", (code) => {
      if (code === 0 && stdout.includes("ok")) {
        resolve({ ok: true, version: stdout.trim() });
      } else {
        resolve({
          ok: false,
          error: stderr.includes("No module named")
            ? "faster-whisper no instalado. Ejecutar: pip install faster-whisper==1.0.3"
            : `Python check failed (exit ${code})`,
        });
      }
    });
  });
}
