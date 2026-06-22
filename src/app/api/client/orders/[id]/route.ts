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
  const order = await prisma.serviceOrder.findFirst({
    where: { id, companyId: dbUser.companyId, deleted: false },
    include: {
      vehicle: true,
      technician: { select: { name: true } },
      evidence: { where: { deleted: false, customerVisible: true }, select: { id: true, category: true, description: true, filePath: true, createdAt: true } },
      diagnostics: {
        where: { deleted: false },
        select: { id: true, diagnosticDate: true, generalHealthScore: true, riskLevel: true, visibleRecommendation: true, dpfScore: true, scrScore: true, egrScore: true, dpfPresent: true, scrPresent: true, egrPresent: true, nextCheckDate: true },
      },
      certificates: {
        where: { status: { in: ["published","generated"] } },
        select: { id: true, certificateNumber: true, status: true, workSummary: true, systemsWorked: true, issuedAt: true, publicToken: true },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  // Strip sensitive fields
  const { internalNotes, receptionSignatureData, receptionSignatureSnapshot, deliverySignatureData, deliverySignatureSnapshot, ...safe } = order;
  return NextResponse.json(safe);
}
