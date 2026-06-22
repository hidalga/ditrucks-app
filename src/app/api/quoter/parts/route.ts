import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { quoterPartSchema } from "@/lib/validations";

const QUOTER_ROLES = ["admin", "sales"];

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parts = await prisma.quoterPart.findMany({
    where: { deleted: false },
    orderBy: [{ system: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(parts);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = quoterPartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const part = await prisma.quoterPart.create({ data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterPart",
    entityId: part.id,
    action: "create",
    newValue: JSON.stringify(parsed.data),
  });

  return NextResponse.json(part, { status: 201 });
}
