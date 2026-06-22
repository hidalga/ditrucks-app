import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { quoterPartSchema } from "@/lib/validations";

const QUOTER_ROLES = ["admin", "sales"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = quoterPartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const part = await prisma.quoterPart.update({ where: { id }, data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterPart",
    entityId: id,
    action: "update",
    newValue: JSON.stringify(parsed.data),
  });

  return NextResponse.json(part);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.quoterPart.update({ where: { id }, data: { deleted: true } });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterPart",
    entityId: id,
    action: "soft_delete",
  });

  return NextResponse.json({ success: true });
}
