import { NextRequest, NextResponse } from "next/server";
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
