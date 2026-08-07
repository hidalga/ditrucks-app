import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ANALYTICS_ROLES = ["admin", "sales"];

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

/**
 * Resumen mensual de BI. Combina dos fuentes:
 *  · Tablas operativas (órdenes, diagnósticos) — funciona retroactivamente.
 *  · Eventos capturados (analytics_events) — uso de botones y cotizador.
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || !ANALYTICS_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  // Mes solicitado (YYYY-MM); default: mes actual.
  const monthParam = new URL(req.url).searchParams.get("month");
  const now = new Date();
  const [y, m] = monthParam?.match(/^\d{4}-\d{2}$/)
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const sixMonthsAgo = new Date(y, m - 6, 1);

  const [
    ordersCreated,
    ordersClosed,
    closedWithDates,
    diagnostics,
    monthEvents,
    ordersLast6m,
  ] = await Promise.all([
    // Órdenes creadas en el mes, con vehículo y servicios para agregación
    prisma.serviceOrder.findMany({
      where: { deleted: false, createdAt: { gte: start, lt: end } },
      select: {
        serviceTypes: true,
        vehicle: { select: { brand: true, model: true, unitType: true } },
      },
    }),
    prisma.serviceOrder.count({
      where: { deleted: false, status: { in: ["cerrada", "entregada"] }, updatedAt: { gte: start, lt: end } },
    }),
    prisma.serviceOrder.findMany({
      where: {
        deleted: false,
        status: { in: ["cerrada", "entregada"] },
        receivedAt: { not: null },
        deliveredAt: { not: null, gte: start, lt: end },
      },
      select: { receivedAt: true, deliveredAt: true },
    }),
    prisma.diagnostic.findMany({
      where: { deleted: false, createdAt: { gte: start, lt: end } },
      select: { riskLevel: true, generalHealthScore: true, scorePenalties: true, commercialOpportunityStatus: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { event: true, userRole: true, metadata: true },
    }),
    // Tendencia: órdenes creadas por mes, últimos 6 meses
    prisma.serviceOrder.findMany({
      where: { deleted: false, createdAt: { gte: sixMonthsAgo, lt: end } },
      select: { createdAt: true },
    }),
  ]);

  // ── Vehículos más trabajados y servicios más solicitados ──
  const vehicleCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const unitTypeCounts = new Map<string, number>();
  for (const o of ordersCreated) {
    if (o.vehicle) {
      const key = `${o.vehicle.brand} ${o.vehicle.model}`;
      vehicleCounts.set(key, (vehicleCounts.get(key) || 0) + 1);
      unitTypeCounts.set(o.vehicle.unitType, (unitTypeCounts.get(o.vehicle.unitType) || 0) + 1);
    }
    for (const s of o.serviceTypes) serviceCounts.set(s, (serviceCounts.get(s) || 0) + 1);
  }

  // ── Tiempo de ciclo del mes ──
  const cycles = closedWithDates
    .map((o) => (o.deliveredAt!.getTime() - o.receivedAt!.getTime()) / 86400000)
    .filter((d) => d >= 0);
  const avgCycleDays = cycles.length ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10 : null;

  // ── Diagnósticos: riesgos, score promedio y fallas más penalizadas ──
  const riskCounts = new Map<string, number>();
  const penaltyCounts = new Map<string, number>();
  let scoreSum = 0, scoreN = 0;
  for (const d of diagnostics) {
    riskCounts.set(d.riskLevel, (riskCounts.get(d.riskLevel) || 0) + 1);
    if (d.generalHealthScore != null) { scoreSum += d.generalHealthScore; scoreN++; }
    if (d.scorePenalties) {
      try {
        for (const p of JSON.parse(d.scorePenalties) as { system: string; reason: string }[]) {
          const key = `[${p.system}] ${p.reason.replace(/\(.*?\)/g, "").trim()}`;
          penaltyCounts.set(key, (penaltyCounts.get(key) || 0) + 1);
        }
      } catch { /* JSON legado inválido: ignorar */ }
    }
  }

  // ── Eventos: uso de botones y cotizador ──
  const eventCounts = new Map<string, number>();
  const quotedBrands = new Map<string, number>();
  let quotesInternal = 0, quotesClient = 0, quotedSavingsSum = 0;
  for (const e of monthEvents) {
    eventCounts.set(e.event, (eventCounts.get(e.event) || 0) + 1);
    if (e.event === "quoter_pdf_export") {
      const meta = (e.metadata ?? {}) as { brand?: string; audience?: string; savings?: number };
      if (meta.brand) quotedBrands.set(meta.brand, (quotedBrands.get(meta.brand) || 0) + 1);
      if (meta.audience === "client") quotesClient++; else quotesInternal++;
      if (typeof meta.savings === "number") quotedSavingsSum += meta.savings;
    }
  }

  // ── Tendencia 6 meses ──
  const trendMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    trendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const o of ordersLast6m) {
    const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + 1);
  }

  return NextResponse.json({
    month: `${y}-${String(m).padStart(2, "0")}`,
    kpis: {
      ordersCreated: ordersCreated.length,
      ordersClosed,
      avgCycleDays,
      diagnostics: diagnostics.length,
      avgHealthScore: scoreN ? Math.round(scoreSum / scoreN) : null,
      quotesPdf: quotesInternal + quotesClient,
      quotesInternal,
      quotesClient,
      quotedSavingsSum: Math.round(quotedSavingsSum),
    },
    topVehicles: topN(vehicleCounts, 10),
    topServices: topN(serviceCounts, 10),
    unitTypes: topN(unitTypeCounts, 8),
    riskDistribution: topN(riskCounts, 5),
    topPenalties: topN(penaltyCounts, 10),
    topQuotedBrands: topN(quotedBrands, 10),
    eventCounts: topN(eventCounts, 20),
    ordersTrend: [...trendMap.entries()].map(([month, count]) => ({ month, count })),
  });
}
