import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  const instructors = await prisma.instructor.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(instructors);
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json() as { name?: string; description?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  try {
    const instructor = await prisma.instructor.create({
      data: { name: name.trim(), description: description?.trim() || null },
    });
    return NextResponse.json(instructor, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un instructor con ese nombre" }, { status: 409 });
    }
    console.error("[POST /api/instructors]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
