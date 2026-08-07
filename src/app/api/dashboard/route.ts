import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Estados que cuentan como "en proceso" para detectar órdenes estancadas
const IN_PROGRESS_STATUSES = [
  "recepcion", "firma_pendiente", "firma_enviada", "firmada", "diagnostico_inicial",
  "leyendo_ecu", "archivo_original_subido", "en_analisis", "archivo_modificado_listo",
  "instalando_archivo", "prueba_posterior", "completada_tecnica", "certificado_generado",
] as const;

const STALLED_DAYS = 3;

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const stalledBefore = new Date(now.getTime() - STALLED_DAYS * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    borradorCount,
    recepcionCount,
    leyendoEcuCount,
    enAnalisisCount,
    archivoListoCount,
    pruebaCount,
    cerradaCount,
    riesgoAlto,
    riesgoCritico,
    recentOrders,
    stalledOrders,
    closedThisMonth,
    recentClosedForCycle,
    activeOpportunities,
  ] = await Promise.all([
    prisma.serviceOrder.count({ where: { deleted: false } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "borrador" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "recepcion" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "leyendo_ecu" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "en_analisis" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "archivo_modificado_listo" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "prueba_posterior" } }),
    prisma.serviceOrder.count({ where: { deleted: false, status: "cerrada" } }),
    prisma.diagnostic.count({ where: { deleted: false, riskLevel: "alto" } }),
    prisma.diagnostic.count({ where: { deleted: false, riskLevel: "critico" } }),
    prisma.serviceOrder.findMany({
      where: { deleted: false },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        vehicle: true,
        company: true,
        customer: true,
        technician: true,
        diagnostics: { where: { deleted: false }, take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    // Órdenes en proceso sin movimiento en los últimos N días (cuellos de botella)
    prisma.serviceOrder.findMany({
      where: {
        deleted: false,
        status: { in: [...IN_PROGRESS_STATUSES] },
        updatedAt: { lt: stalledBefore },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: {
        id: true, folio: true, status: true, updatedAt: true,
        vehicle: { select: { brand: true, model: true, plates: true } },
        company: { select: { name: true } },
        customer: { select: { name: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.serviceOrder.count({
      where: { deleted: false, status: "cerrada", updatedAt: { gte: monthStart } },
    }),
    // Cerradas/entregadas de los últimos 90 días con fechas para tiempo de ciclo
    prisma.serviceOrder.findMany({
      where: {
        deleted: false,
        status: { in: ["cerrada", "entregada"] },
        receivedAt: { not: null },
        deliveredAt: { not: null, gte: ninetyDaysAgo },
      },
      select: { receivedAt: true, deliveredAt: true },
      take: 200,
    }),
    // Pipeline comercial: diagnósticos con oportunidad activa
    prisma.diagnostic.groupBy({
      by: ["commercialOpportunityStatus"],
      where: { deleted: false, commercialOpportunityStatus: { in: ["seguimiento", "cotizar", "agendar"] } },
      _count: { _all: true },
    }),
  ]);

  const openOrders = totalOrders - cerradaCount;

  // Tiempo de ciclo promedio (recepción → entrega) en días
  const cycleDays = recentClosedForCycle
    .map((o) => (o.deliveredAt!.getTime() - o.receivedAt!.getTime()) / (24 * 60 * 60 * 1000))
    .filter((d) => d >= 0);
  const avgCycleDays = cycleDays.length
    ? Math.round((cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) * 10) / 10
    : null;

  const pipeline: Record<string, number> = { seguimiento: 0, cotizar: 0, agendar: 0 };
  for (const g of activeOpportunities) pipeline[g.commercialOpportunityStatus] = g._count._all;

  return NextResponse.json({
    stats: {
      openOrders,
      borrador: borradorCount,
      recepcion: recepcionCount,
      leyendoEcu: leyendoEcuCount,
      enAnalisis: enAnalisisCount,
      archivoListo: archivoListoCount,
      prueba: pruebaCount,
      cerrada: cerradaCount,
      riesgoAlto,
      riesgoCritico,
      closedThisMonth,
      avgCycleDays,
    },
    pipeline,
    stalledOrders: stalledOrders.map((o) => ({
      ...o,
      daysStalled: Math.floor((now.getTime() - o.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
    recentOrders,
  });
}
