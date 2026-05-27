import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { companySchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      customers: { where: { deleted: false } },
      vehicles: { where: { deleted: false } },
      serviceOrders: { where: { deleted: false }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!company || company.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const company = await prisma.company.update({ where: { id }, data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "Company",
    entityId: id,
    action: "update",
    newValue: JSON.stringify(parsed.data),
  });

  return NextResponse.json(company);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.company.update({ where: { id }, data: { deleted: true } });

  await createAuditLog({
    userId: user.id,
    entityType: "Company",
    entityId: id,
    action: "soft_delete",
  });

  return NextResponse.json({ success: true });
}
