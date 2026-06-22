import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { getOrderProgress } from "@/services/order-progress";
import { onOrderStatusChanged } from "@/services/crm-webhook";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum([
    "borrador","recepcion","recepcion_completada","firma_pendiente","firma_enviada",
    "firmada","diagnostico_inicial","leyendo_ecu","archivo_original_subido","en_analisis",
    "archivo_modificado_listo","instalando_archivo","prueba_posterior","completada_tecnica",
    "certificado_generado","entregada","cerrada","cancelada",
  ]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const existing = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const newStatus = parsed.data.status;
  const progress = getOrderProgress(newStatus);
  const oldStatus = existing.status;

  const data: Record<string, unknown> = {
    status: newStatus,
    progressPercent: progress.percent,
    progressLabel: progress.label,
  };
  if (newStatus === "cerrada" || newStatus === "entregada") data.deliveredAt = new Date();

  const order = await prisma.serviceOrder.update({ where: { id }, data });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: id,
    action: "status_change",
    oldValue: oldStatus,
    newValue: newStatus,
  });

  // Fire CRM events (non-blocking)
  onOrderStatusChanged(id, oldStatus, newStatus).catch((e) => console.error("CRM event error:", e));

  return NextResponse.json(order);
}
