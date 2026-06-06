import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: { segmentId: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const { text } = body as { text: string };

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Campo 'text' requerido" }, { status: 400 });
  }

  const segment = await prisma.segment.findUnique({ where: { id: params.segmentId } });
  if (!segment) return new NextResponse(null, { status: 404 });

  await prisma.segment.update({
    where: { id: params.segmentId },
    data: {
      text,
      originalText: segment.isEdited ? segment.originalText : segment.text,
      isEdited: true,
    },
  });

  // Recalcular wordCount del transcript
  const allSegments = await prisma.segment.findMany({
    where: { videoId: segment.videoId },
    select: { text: true },
  });
  const fullText = allSegments.map((s) => s.text).join(" ");

  await prisma.transcript.update({
    where: { videoId: segment.videoId },
    data: {
      fullText,
      isEdited: true,
      editedAt: new Date(),
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      characterCount: fullText.length,
    },
  });

  return NextResponse.json({ ok: true });
}
