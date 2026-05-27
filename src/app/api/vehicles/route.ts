import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const companyId = searchParams.get("companyId") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
      { plates: { contains: search, mode: "insensitive" } },
      { economicNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (companyId) where.companyId = companyId;

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      customer: true,
      _count: { select: { serviceOrders: true, diagnostics: true } },
    },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.create({ data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "Vehicle",
    entityId: vehicle.id,
    action: "create",
  });

  return NextResponse.json(vehicle, { status: 201 });
}
