import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { quoterApplicationSchema } from "@/lib/validations";

const QUOTER_ROLES = ["admin", "sales"];

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (category) where.category = category;
  if (brand) where.brand = brand;
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { displayLabel: { contains: search, mode: "insensitive" } },
    ];
  }

  const applications = await prisma.quoterApplication.findMany({
    where,
    orderBy: [{ category: "asc" }, { brand: "asc" }, { model: "asc" }],
  });

  return NextResponse.json(applications);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || !QUOTER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = quoterApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { category, brand, model, pricing } = parsed.data;
  const displayLabel = `${category} | ${brand} | ${model}`;

  const application = await prisma.quoterApplication.create({
    data: { category, brand, model, displayLabel, pricing },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "QuoterApplication",
    entityId: application.id,
    action: "create",
    newValue: JSON.stringify({ displayLabel }),
  });

  return NextResponse.json(application, { status: 201 });
}
