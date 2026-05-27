import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
  ]);

  const openOrders = totalOrders - cerradaCount;

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
    },
    recentOrders,
  });
}
