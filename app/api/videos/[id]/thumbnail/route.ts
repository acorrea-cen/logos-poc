import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: { thumbnailPath: true },
  });

  if (!video?.thumbnailPath) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await fs.readFile(video.thumbnailPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
