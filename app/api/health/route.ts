import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkFFmpeg } from "@/lib/video/ffmpeg";
import { checkPython } from "@/lib/whisper/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [db, ollama, ffmpeg, python] = await Promise.all([
    checkDb(),
    checkOllama(),
    checkFFmpeg(),
    checkPython(),
  ]);

  const checks = {
    db: db.ok,
    ollama: ollama.ok,
    ffmpeg: ffmpeg !== null,
    python: python.ok,
    ffmpegVersion: ffmpeg ?? undefined,
    ollamaModel: ollama.model,
    pythonError: python.ok ? undefined : python.error,
  };

  const critical = checks.db && checks.ollama;
  const status = critical ? (checks.ffmpeg && checks.python ? "ok" : "degraded") : "error";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
      version: "0.1.0-poc",
      notes: {
        ffmpeg: checks.ffmpeg ? "OK" : "No instalado — necesario para Día 2",
        python: checks.python ? "OK" : checks.pythonError,
      },
    },
    { status: critical ? 200 : 503 }
  );
}

async function checkDb(): Promise<{ ok: boolean }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function checkOllama(): Promise<{ ok: boolean; model?: string }> {
  try {
    const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false };
    const data = await res.json() as { models: Array<{ name: string }> };
    const configuredModel = process.env.OLLAMA_MODEL ?? "nomic-embed-text";
    const embedModel = data.models?.find((m) => m.name.includes(configuredModel));
    return { ok: !!embedModel, model: embedModel?.name };
  } catch {
    return { ok: false };
  }
}
