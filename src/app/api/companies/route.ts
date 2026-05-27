import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { companySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { rfc: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type) where.companyType = type;

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { vehicles: true, serviceOrders: true, customers: true } } },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const company = await prisma.company.create({ data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "Company",
    entityId: company.id,
    action: "create",
    newValue: JSON.stringify(parsed.data),
  });

  return NextResponse.json(company, { status: 201 });
}
