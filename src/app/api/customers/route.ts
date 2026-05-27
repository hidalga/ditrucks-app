import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { customerSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const companyId = searchParams.get("companyId") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (companyId) where.companyId = companyId;

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({ data: parsed.data });

  await createAuditLog({
    userId: user.id,
    entityType: "Customer",
    entityId: customer.id,
    action: "create",
    newValue: JSON.stringify(parsed.data),
  });

  return NextResponse.json(customer, { status: 201 });
}
