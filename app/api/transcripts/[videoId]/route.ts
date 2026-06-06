import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: { videoId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const transcript = await prisma.transcript.findUnique({
    where: { videoId: params.videoId },
  });

  if (!transcript) return new NextResponse(null, { status: 404 });

  const segments = await prisma.segment.findMany({
    where: { videoId: params.videoId },
    orderBy: { segmentIndex: "asc" },
  });

  return NextResponse.json({ transcript, segments });
}

// PATCH /api/transcripts/[videoId] — marcar como editado
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const { fullText } = body as { fullText?: string };

  if (fullText !== undefined) {
    await prisma.transcript.update({
      where: { videoId: params.videoId },
      data: {
        fullText,
        isEdited: true,
        editedAt: new Date(),
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
        characterCount: fullText.length,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
