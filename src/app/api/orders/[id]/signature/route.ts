import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { buildOrderSnapshot, getActiveTerms } from "@/services/signature";
import { sendCrmEvent } from "@/services/crm-webhook";
import { getProgressPercent } from "@/services/order-progress";
import { z } from "zod";

const signatureSchema = z.object({
  phase: z.enum(["reception", "delivery"]),
  signatureData: z.string().min(1, "Firma requerida"),
  signerName: z.string().min(1, "Nombre requerido"),
  signerRole: z.string().optional().nullable(),
});

// POST: capture an in-person signature for the reception or delivery phase
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = signatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order || order.deleted) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const { phase, signatureData, signerName, signerRole } = parsed.data;
  const now = new Date();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;

  // Snapshot is built BEFORE the order is mutated further, so it reflects exactly what was signed.
  const snapshot = await buildOrderSnapshot(id, phase);
  const terms = await getActiveTerms();

  const data =
    phase === "reception"
      ? {
          receptionSignatureStatus: "signed" as const,
          receptionSignatureType: "in_person" as const,
          receptionSignatureData: signatureData,
          receptionSignerName: signerName,
          receptionSignerRole: signerRole || null,
          receptionSignedAt: now,
          receptionSignatureIp: ip,
          receptionSignatureUserAgent: userAgent,
          receptionSignatureSnapshot: snapshot,
          receptionTermsVersion: terms?.version || "1.0",
          status: "firmada" as const,
          progressPercent: getProgressPercent("firmada"),
          progressLabel: "Firmada",
        }
      : {
          deliverySignatureStatus: "signed" as const,
          deliverySignatureType: "in_person" as const,
          deliverySignatureData: signatureData,
          deliverySignerName: signerName,
          deliverySignerRole: signerRole || null,
          deliverySignedAt: now,
          deliverySignatureIp: ip,
          deliverySignatureUserAgent: userAgent,
          deliverySignatureSnapshot: snapshot,
          deliveryTermsVersion: terms?.version || "1.0",
        };

  await prisma.serviceOrder.update({ where: { id }, data });

  await prisma.signatureEvent.create({
    data: {
      serviceOrderId: id,
      phase,
      eventType: "signed_in_person",
      ipAddress: ip,
      userAgent: userAgent,
      metadata: JSON.stringify({ signerName, signerRole }),
    },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceOrder",
    entityId: id,
    action: `signature_${phase}_in_person`,
    newValue: JSON.stringify({ signerName, signedAt: now.toISOString() }),
  });

  await sendCrmEvent(phase === "reception" ? "service_order.signed" : "service_order.delivery_signed", id, {
    signature_type: "in_person",
    phase,
    signer_name: signerName,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    signature: {
      phase,
      name: signerName,
      date: now.toISOString(),
    },
  });
}
