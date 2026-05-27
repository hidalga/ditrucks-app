import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      company: true,
      customer: true,
      serviceOrders: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        include: { technician: true },
      },
      diagnostics: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
      },
      ecuFiles: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle || vehicle.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.update({ where: { id }, data: parsed.data });

  await createAuditLog({ userId: user.id, entityType: "Vehicle", entityId: id, action: "update" });

  return NextResponse.json(vehicle);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.vehicle.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ success: true });
}
