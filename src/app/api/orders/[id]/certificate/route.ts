import { NextRequest, NextResponse } from "next/server";
import { getSession, createAuditLog } from "@/lib/auth";
import { createCertificate, revokeCertificate } from "@/services/certificate";
import { sendCrmEvent } from "@/services/crm-webhook";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const certSchema = z.object({
  workSummary: z.string().optional().nullable(),
  diagnosticSummary: z.string().optional().nullable(),
  finalResult: z.string().optional().nullable(),
  visibleNotes: z.string().optional().nullable(),
  systemsWorked: z.array(z.string()).optional().nullable(),
});

// GET: List certificates for this order
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const certificates = await prisma.serviceCertificate.findMany({
    where: { serviceOrderId: id },
    orderBy: { createdAt: "desc" },
    include: { generatedBy: { select: { name: true } } },
  });

  return NextResponse.json(certificates);
}

// POST: Generate new certificate
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = certSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const certificate = await createCertificate({
      serviceOrderId: id,
      generatedByUserId: user.id,
      workSummary: parsed.data.workSummary ?? undefined,
      diagnosticSummary: parsed.data.diagnosticSummary ?? undefined,
      finalResult: parsed.data.finalResult ?? undefined,
      visibleNotes: parsed.data.visibleNotes ?? undefined,
      systemsWorked: parsed.data.systemsWorked ?? undefined,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/verify/${certificate.publicToken}`;

    await createAuditLog({
      userId: user.id,
      entityType: "ServiceCertificate",
      entityId: certificate.id,
      action: "certificate_generated",
      newValue: JSON.stringify({ certificateNumber: certificate.certificateNumber }),
    });

    await sendCrmEvent("service_order.certificate_generated", id, {
      certificate_number: certificate.certificateNumber,
      certificate_url: publicUrl,
      public_verification_url: publicUrl,
    }).catch(() => {});

    return NextResponse.json({
      ...certificate,
      publicUrl,
    }, { status: 201 });
  } catch (error) {
    console.error("Certificate error:", error);
    return NextResponse.json({ error: "Error al generar certificado" }, { status: 500 });
  }
}

// DELETE: Revoke certificate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede revocar certificados" }, { status: 403 });
  }

  const { id: orderId } = await params;
  const { certificateId, reason } = await req.json();

  if (!certificateId) return NextResponse.json({ error: "certificateId requerido" }, { status: 400 });

  const cert = await revokeCertificate(certificateId, reason || "Revocado por administrador");

  await createAuditLog({
    userId: user.id,
    entityType: "ServiceCertificate",
    entityId: certificateId,
    action: "certificate_revoked",
    newValue: JSON.stringify({ reason }),
  });

  return NextResponse.json(cert);
}
