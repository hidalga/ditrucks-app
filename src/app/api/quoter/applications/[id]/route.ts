import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { quoterApplicationSchema } from "@/lib/validations";

const QUOTER_ROLES = ["admin", "sales"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = quoterApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { category, brand, model, pricing } = parsed.data;
  const displayLabel = `${category} | ${brand} | ${model}`;

  const application = await prisma.quoterApplication.update({
    where: { id },
    data: { category, brand, model, displayLabel, pricing },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterApplication",
    entityId: id,
    action: "update",
    newValue: JSON.stringify({ displayLabel }),
  });

  return NextResponse.json(application);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.quoterApplication.update({ where: { id }, data: { deleted: true } });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterApplication",
    entityId: id,
    action: "soft_delete",
  });

  return NextResponse.json({ success: true });
}
