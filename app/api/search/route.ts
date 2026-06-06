import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fulltextSearch } from "@/lib/search/fulltext";
import { semanticSearch } from "@/lib/search/semantic";
import { hybridSearch } from "@/lib/search/hybrid";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim() ?? "";
  const type = (searchParams.get("type") ?? "hybrid") as "fulltext" | "semantic" | "hybrid";
  const instructor = searchParams.get("instructor") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  if (!query) {
    return NextResponse.json({ results: [], query: "", type, total: 0 });
  }

  const filters = { instructor, category, dateFrom, dateTo };

  try {
    let results;
    if (type === "fulltext") {
      results = await fulltextSearch(query, filters, limit);
    } else if (type === "semantic") {
      results = await semanticSearch(query, filters, limit);
    } else {
      results = await hybridSearch(query, filters, limit);
    }

    // Log search history (fire-and-forget)
    prisma.searchHistory
      .create({ data: { query, resultCount: results.length, searchType: type } })
      .catch(() => {});

    return NextResponse.json({ results, query, type, total: results.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[search] Error:", msg);
    return NextResponse.json(
      { error: "Error al buscar. Verificar que Ollama esté activo.", detail: msg },
      { status: 500 }
    );
  }
}

// Endpoint auxiliar: GET /api/search/filters — devuelve instructores y categorías disponibles
export async function POST() {
  const [instructors, categories] = await Promise.all([
    prisma.video.findMany({
      where: { status: "READY", instructor: { not: null } },
      select: { instructor: true },
      distinct: ["instructor"],
      orderBy: { instructor: "asc" },
    }),
    prisma.video.findMany({
      where: { status: "READY", category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    instructors: instructors.map((v) => v.instructor).filter(Boolean),
    categories: categories.map((v) => v.category).filter(Boolean),
  });
}
