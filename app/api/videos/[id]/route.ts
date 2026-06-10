import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { title, instructor, category } = body;

  const video = await prisma.video.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(instructor !== undefined && { instructor: instructor?.trim() || null }),
      ...(category !== undefined && { category: category?.trim() || null }),
    },
    select: { id: true, title: true, instructor: true, category: true },
  });

  return NextResponse.json(video);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: { filepath: true, thumbnailPath: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
  }

  // Borrar embeddings (no tienen cascade en Prisma)
  const segments = await prisma.segment.findMany({
    where: { videoId: params.id },
    select: { id: true },
  });
  const segmentIds = segments.map((s) => s.id);
  if (segmentIds.length > 0) {
    await prisma.vectorEmbedding.deleteMany({ where: { segmentId: { in: segmentIds } } });
  }

  // Borrar video de DB (cascade: Transcript, Segment, Job)
  await prisma.video.delete({ where: { id: params.id } });

  // Borrar archivos del filesystem (best-effort — no falla si ya no existen)
  const filesToDelete = [
    video.filepath,
    video.thumbnailPath,
    path.join("storage", "transcripts", `${params.id}.json`),
  ].filter(Boolean) as string[];

  await Promise.allSettled(filesToDelete.map((f) => fs.unlink(f)));

  return NextResponse.json({ ok: true });
}
