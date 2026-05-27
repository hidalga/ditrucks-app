import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { serviceOrderSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      vehicle: { include: { company: true } },
      company: true,
      customer: true,
      technician: true,
      assignedCalibrator: true,
      createdBy: true,
      ecuFiles: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: true },
      },
      evidence: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: true },
      },
      diagnostics: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        include: { technician: true },
      },
    },
  });

  if (!order || order.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = serviceOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const order = await prisma.serviceOrder.update({
    where: { id },
    data: parsed.data,
    include: { vehicle: true, company: true, technician: true },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: id,
    action: "update",
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.serviceOrder.update({ where: { id }, data: { deleted: true } });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: id,
    action: "soft_delete",
  });

  return NextResponse.json({ success: true });
}
