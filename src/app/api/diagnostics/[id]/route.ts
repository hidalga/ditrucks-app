import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { id },
    include: {
      vehicle: { include: { company: true } },
      serviceOrder: true,
      technician: true,
    },
  });

  if (!diagnostic || diagnostic.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(diagnostic);
}
