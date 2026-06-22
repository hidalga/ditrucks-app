import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";
import { projectVehicle } from "@/services/deterioration-engine";

export async function GET() {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, deleted: false },
    include: {
      diagnostics: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          generalHealthScore: true, riskLevel: true, dpfPresent: true, dpfScore: true,
          scrPresent: true, scrScore: true, egrPresent: true, egrScore: true,
          usageType: true, visibleRecommendation: true, recommendation: true,
          diagnosticDate: true, nextCheckDate: true,
        },
      },
      serviceOrders: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { folio: true, status: true, createdAt: true, deliveredAt: true, serviceTypes: true },
      },
      // Get before/after: last 2 diagnostics for comparison
      _count: { select: { serviceOrders: true } },
    },
  });

  // Build projections
  const fleet = vehicles.map(v => {
    const diag = v.diagnostics[0];
    const lastOrder = v.serviceOrders[0];
    const projection = diag ? projectVehicle({
      generalHealthScore: diag.generalHealthScore,
      dpfPresent: diag.dpfPresent,
      dpfScore: diag.dpfScore,
      scrPresent: diag.scrPresent,
      scrScore: diag.scrScore,
      egrPresent: diag.egrPresent,
      egrScore: diag.egrScore,
      usageType: diag.usageType,
    }, v.id) : null;

    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plates: v.plates,
      economicNumber: v.economicNumber,
      vin: v.vin,
      unitType: v.unitType,
      score: diag?.generalHealthScore ?? null,
      riskLevel: diag?.riskLevel ?? null,
      dpfScore: diag?.dpfScore ?? null,
      scrScore: diag?.scrScore ?? null,
      egrScore: diag?.egrScore ?? null,
      lastDiagDate: diag?.diagnosticDate ?? null,
      nextCheckDate: diag?.nextCheckDate ?? null,
      recommendation: diag?.visibleRecommendation || diag?.recommendation || null,
      lastOrderFolio: lastOrder?.folio ?? null,
      lastOrderDate: lastOrder?.deliveredAt || lastOrder?.createdAt || null,
      lastOrderStatus: lastOrder?.status ?? null,
      totalOrders: v._count.serviceOrders,
      projection,
    };
  });

  // Sort: critical first, then urgent, then by score ascending
  const urgencyOrder: Record<string, number> = { critical: 0, urgent: 1, schedule: 2, monitor: 3, none: 4 };
  fleet.sort((a, b) => {
    const ua = a.projection?.overallUrgency || "none";
    const ub = b.projection?.overallUrgency || "none";
    if (urgencyOrder[ua] !== urgencyOrder[ub]) return urgencyOrder[ua] - urgencyOrder[ub];
    return (a.score ?? 999) - (b.score ?? 999);
  });

  // Summary counts
  const summary = {
    total: fleet.length,
    critical: fleet.filter(v => v.projection?.overallUrgency === "critical").length,
    urgent: fleet.filter(v => v.projection?.overallUrgency === "urgent").length,
    schedule: fleet.filter(v => v.projection?.overallUrgency === "schedule").length,
    monitor: fleet.filter(v => v.projection?.overallUrgency === "monitor").length,
    good: fleet.filter(v => !v.projection || v.projection.overallUrgency === "none").length,
    noDiag: fleet.filter(v => !v.score).length,
  };

  return NextResponse.json({ summary, fleet });
}
