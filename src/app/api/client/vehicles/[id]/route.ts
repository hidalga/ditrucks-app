import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, companyId: dbUser.companyId, deleted: false },
    include: {
      serviceOrders: {
        where: { deleted: false, status: { in: ["cerrada", "entregada", "certificado_generado", "completada_tecnica"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, folio: true, status: true, serviceTypes: true, receivedAt: true, deliveredAt: true, workSummary: true, createdAt: true },
      },
      diagnostics: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        select: { id: true, diagnosticDate: true, generalHealthScore: true, riskLevel: true, visibleRecommendation: true, recommendation: true, dpfScore: true, scrScore: true, egrScore: true, nextCheckDate: true, dpfPresent: true, scrPresent: true, egrPresent: true },
      },
      certificates: {
        where: { status: { in: ["published", "generated"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, certificateNumber: true, status: true, workSummary: true, systemsWorked: true, issuedAt: true, publicToken: true },
      },
    },
  });

  if (!vehicle) return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
  return NextResponse.json(vehicle);
}
