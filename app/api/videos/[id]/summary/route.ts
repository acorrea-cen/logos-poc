import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const EMBED_KEYWORDS = ["embed", "nomic", "mxbai", "minilm", "bge"];

async function getGenerationModel(): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { models: Array<{ name: string }> };
    const model = data.models?.find(
      (m) => !EMBED_KEYWORDS.some((kw) => m.name.toLowerCase().includes(kw))
    );
    return model?.name ?? null;
  } catch {
    return null;
  }
}

function buildPrompt(fullText: string, title: string): string {
  // Tomar inicio + final si el texto es muy largo (ventana de contexto)
  let transcript = fullText;
  if (fullText.length > 7000) {
    const head = fullText.slice(0, 4500);
    const tail = fullText.slice(-2000);
    transcript = `${head}\n\n[...]\n\n${tail}`;
  }

  return `Sos un asistente especializado en capacitación corporativa bancaria. Analizá la siguiente transcripción del video "${title}" y generá un resumen detallado y bien estructurado que sea útil como material de estudio.

El resumen debe:
- Explicar los temas principales tratados en el video
- Describir los conceptos técnicos y procedimientos mencionados
- Destacar los puntos clave que un alumno debe recordar
- Mencionar conclusiones o próximos pasos si los hay
- Estar escrito en español claro y profesional

Transcripción:
---
${transcript}
---

Generá el resumen ahora:`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const transcript = await prisma.transcript.findUnique({
    where: { videoId: params.id },
    select: { summary: true, summaryModel: true, summaryGeneratedAt: true },
  });

  if (!transcript) {
    return NextResponse.json({ summary: null }, { status: 200 });
  }

  return NextResponse.json({
    summary: transcript.summary ?? null,
    model: transcript.summaryModel ?? null,
    generatedAt: transcript.summaryGeneratedAt ?? null,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { transcript: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
  }

  if (!video.transcript?.fullText) {
    return NextResponse.json({ error: "El video no tiene transcripción aún" }, { status: 400 });
  }

  // Si ya hay resumen generado, devolverlo directamente
  if (video.transcript.summary) {
    return NextResponse.json({ summary: video.transcript.summary });
  }

  const model = await getGenerationModel();
  if (!model) {
    return NextResponse.json(
      { error: "No hay modelo de generación disponible en Ollama. Instalá uno con: ollama pull llama3.2" },
      { status: 503 }
    );
  }

  const prompt = buildPrompt(video.transcript.fullText, video.title);

  try {
    const ollamaRes = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 700 },
      }),
      signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min timeout (CPU lento)
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      return NextResponse.json({ error: `Ollama error: ${err}` }, { status: 502 });
    }

    const data = await ollamaRes.json() as { response: string };
    const summary = data.response?.trim();

    if (!summary) {
      return NextResponse.json({ error: "Ollama no devolvió texto" }, { status: 502 });
    }

    await prisma.transcript.update({
      where: { videoId: params.id },
      data: { summary, summaryModel: model, summaryGeneratedAt: new Date() },
    });

    return NextResponse.json({ summary, model });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error generando resumen: ${msg}` }, { status: 500 });
  }
}
