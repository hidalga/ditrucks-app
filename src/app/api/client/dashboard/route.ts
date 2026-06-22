import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";

export async function GET() {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  // Get user's company
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) {
    return NextResponse.json({ error: "Sin empresa asignada" }, { status: 400 });
  }

  const companyId = dbUser.companyId;

  const [
    vehicleCount,
    closedOrders,
    diagnostics,
    certificates,
    riskAlto,
    riskCritico,
    recentOrders,
    recentCerts,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { companyId, deleted: false } }),
    prisma.serviceOrder.count({ where: { companyId, deleted: false, status: { in: ["cerrada", "entregada", "certificado_generado", "completada_tecnica"] } } }),
    prisma.diagnostic.count({ where: { vehicle: { companyId }, deleted: false } }),
    prisma.serviceCertificate.count({ where: { companyId, status: { in: ["published", "generated"] } } }),
    prisma.diagnostic.count({ where: { vehicle: { companyId }, deleted: false, riskLevel: "alto" } }),
    prisma.diagnostic.count({ where: { vehicle: { companyId }, deleted: false, riskLevel: "critico" } }),
    prisma.serviceOrder.findMany({
      where: { companyId, deleted: false, status: { in: ["cerrada", "entregada", "certificado_generado", "completada_tecnica"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { vehicle: true },
    }),
    prisma.serviceCertificate.findMany({
      where: { companyId, status: { in: ["published", "generated"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { vehicle: true },
    }),
  ]);

  return NextResponse.json({
    companyId,
    stats: { vehicleCount, closedOrders, diagnostics, certificates, riskAlto, riskCritico },
    recentOrders,
    recentCerts,
  });
}
