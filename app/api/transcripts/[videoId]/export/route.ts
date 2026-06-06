import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: { videoId: string } };

function toSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const format = req.nextUrl.searchParams.get("format") ?? "srt";

  const video = await prisma.video.findUnique({
    where: { id: params.videoId },
    select: { title: true },
  });

  if (!video) return new NextResponse(null, { status: 404 });

  const segments = await prisma.segment.findMany({
    where: { videoId: params.videoId },
    orderBy: { segmentIndex: "asc" },
  });

  const safeTitle = video.title.replace(/[^a-zA-Z0-9\-_ áéíóúñÁÉÍÓÚÑ]/g, "_");

  if (format === "srt") {
    const srt = segments
      .map(
        (s, i) =>
          `${i + 1}\n${toSrtTime(s.startTime)} --> ${toSrtTime(s.endTime)}\n${s.text}`
      )
      .join("\n\n");

    return new NextResponse(srt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.srt"`,
      },
    });
  }

  if (format === "txt") {
    const transcript = await prisma.transcript.findUnique({
      where: { videoId: params.videoId },
      select: { fullText: true },
    });

    const txt = transcript?.fullText ?? segments.map((s) => s.text).join(" ");

    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
      },
    });
  }

  return NextResponse.json({ error: "Formato no soportado. Usá ?format=srt o ?format=txt" }, { status: 400 });
}
