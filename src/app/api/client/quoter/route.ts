import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";

export async function GET() {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: dbUser.companyId }, select: { name: true, quoterEnabled: true } });
  if (!company?.quoterEnabled) {
    return NextResponse.json({ error: "Cotizador no disponible para esta cuenta" }, { status: 403 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, deleted: false, quoterApplicationId: { not: null } },
    include: { quoterApplication: true },
  });

  const parts = await prisma.quoterPart.findMany({ where: { deleted: false }, orderBy: [{ system: "asc" }, { label: "asc" }] });

  return NextResponse.json({ companyName: company.name, vehicles, parts });
}
