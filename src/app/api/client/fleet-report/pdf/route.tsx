import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";
import { projectVehicle } from "@/services/deterioration-engine";
import { FleetReportPdf } from "@/lib/pdf/fleet-report-pdf";

export async function GET() {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: dbUser.companyId }, select: { name: true } });

  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: dbUser.companyId, deleted: false },
    include: {
      diagnostics: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          generalHealthScore: true, dpfPresent: true, dpfScore: true,
          scrPresent: true, scrScore: true, egrPresent: true, egrScore: true,
          usageType: true, visibleRecommendation: true, recommendation: true,
        },
      },
      serviceOrders: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { deliveredAt: true, createdAt: true },
      },
    },
  });

  const fleet = vehicles.map((v) => {
    const diag = v.diagnostics[0];
    const lastOrder = v.serviceOrders[0];
    const projection = diag
      ? projectVehicle(
          {
            generalHealthScore: diag.generalHealthScore,
            dpfPresent: diag.dpfPresent,
            dpfScore: diag.dpfScore,
            scrPresent: diag.scrPresent,
            scrScore: diag.scrScore,
            egrPresent: diag.egrPresent,
            egrScore: diag.egrScore,
            usageType: diag.usageType,
          },
          v.id
        )
      : null;

    return {
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      plates: v.plates,
      economicNumber: v.economicNumber,
      vin: v.vin,
      score: diag?.generalHealthScore ?? null,
      dpfScore: diag?.dpfScore ?? null,
      scrScore: diag?.scrScore ?? null,
      egrScore: diag?.egrScore ?? null,
      recommendation: diag?.visibleRecommendation || diag?.recommendation || null,
      lastOrderDate: (lastOrder?.deliveredAt || lastOrder?.createdAt)?.toISOString() ?? null,
      projection,
    };
  });

  const urgencyOrder: Record<string, number> = { critical: 0, urgent: 1, schedule: 2, monitor: 3, none: 4 };
  fleet.sort((a, b) => {
    const ua = a.projection?.overallUrgency || "none";
    const ub = b.projection?.overallUrgency || "none";
    if (urgencyOrder[ua] !== urgencyOrder[ub]) return urgencyOrder[ua] - urgencyOrder[ub];
    return (a.score ?? 999) - (b.score ?? 999);
  });

  const summary = {
    total: fleet.length,
    critical: fleet.filter((v) => v.projection?.overallUrgency === "critical").length,
    urgent: fleet.filter((v) => v.projection?.overallUrgency === "urgent").length,
    schedule: fleet.filter((v) => v.projection?.overallUrgency === "schedule").length,
    monitor: fleet.filter((v) => v.projection?.overallUrgency === "monitor").length,
    good: fleet.filter((v) => !v.projection || v.projection.overallUrgency === "none").length,
  };

  const generatedAt = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    <FleetReportPdf companyName={company?.name || ""} generatedAt={generatedAt} summary={summary} fleet={fleet} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="reporte-flota-ditrucks.pdf"',
    },
  });
}
