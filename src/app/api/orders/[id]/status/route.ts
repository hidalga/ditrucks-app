import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { orderStatusSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const existing = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "cerrada") data.deliveredAt = new Date();

  const order = await prisma.serviceOrder.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: id,
    action: "status_change",
    oldValue: existing.status,
    newValue: parsed.data.status,
  });

  return NextResponse.json(order);
}
