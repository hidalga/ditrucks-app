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

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, deleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { serviceOrders: true, diagnostics: true } },
      diagnostics: { where: { deleted: false }, orderBy: { createdAt: "desc" }, take: 1, select: { generalHealthScore: true, riskLevel: true } },
    },
  });

  return NextResponse.json(vehicles);
}
