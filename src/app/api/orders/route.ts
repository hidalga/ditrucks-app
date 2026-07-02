import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { serviceOrderSchema } from "@/lib/validations";
import { generateFolio } from "@/services/folio";
import { ORDER_WRITE_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const companyId = searchParams.get("companyId") || "";
  const technicianId = searchParams.get("technicianId") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (search) {
    // Multi-word search: each token must match (AND) in ANY searchable field (OR)
    const tokens = search.split(/\s+/).filter(Boolean);
    where.AND = tokens.map((token) => {
      const fields: Record<string, unknown>[] = [
        { folio: { contains: token, mode: "insensitive" } },
        { customer: { name: { contains: token, mode: "insensitive" } } },
        { company: { name: { contains: token, mode: "insensitive" } } },
        { vehicle: { brand: { contains: token, mode: "insensitive" } } },
        { vehicle: { model: { contains: token, mode: "insensitive" } } },
        { vehicle: { plates: { contains: token, mode: "insensitive" } } },
        { vehicle: { vin: { contains: token, mode: "insensitive" } } },
        { vehicle: { economicNumber: { contains: token, mode: "insensitive" } } },
      ];
      // Year is numeric: match exactly when the token is a number
      if (/^\d+$/.test(token)) fields.push({ vehicle: { year: Number(token) } });
      return { OR: fields };
    });
  }
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (technicianId) where.technicianId = technicianId;

  const orders = await prisma.serviceOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: true,
      company: true,
      customer: true,
      technician: true,
      assignedCalibrator: true,
      _count: { select: { ecuFiles: true, evidence: true, diagnostics: true } },
    },
    take: 100,
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!ORDER_WRITE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Sin permisos para crear órdenes" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = serviceOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const folio = await generateFolio();

  const order = await prisma.serviceOrder.create({
    data: {
      ...parsed.data,
      folio,
      status: "borrador",
      createdById: user.id,
      technicianId: parsed.data.technicianId || user.id,
      receivedAt: new Date(),
    },
    include: {
      vehicle: true,
      company: true,
      customer: true,
      technician: true,
    },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: order.id,
    action: "create",
    newValue: JSON.stringify({ folio }),
  });

  return NextResponse.json(order, { status: 201 });
}
