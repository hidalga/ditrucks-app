import { NextRequest, NextResponse } from "next/server";
import { getCertificateByPublicToken } from "@/services/certificate";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cert = await getCertificateByPublicToken(token);

  if (!cert) {
    return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  }

  const isRevoked = cert.status === "revoked";

  return NextResponse.json({
    valid: !isRevoked,
    status: cert.status,
    certificateNumber: cert.certificateNumber,
    orderFolio: cert.serviceOrder?.folio,
    vehicle: {
      brand: cert.vehicle.brand,
      model: cert.vehicle.model,
      year: cert.vehicle.year,
      vin: cert.vehicle.vin,
      plates: cert.vehicle.plates,
      economicNumber: cert.vehicle.economicNumber,
    },
    company: cert.company?.name || null,
    workSummary: cert.workSummary,
    systemsWorked: cert.systemsWorked,
    finalResult: cert.finalResult,
    diagnosticSummary: cert.diagnosticSummary,
    issuedAt: cert.issuedAt,
    revokedAt: cert.revokedAt,
    revokedReason: cert.revokedReason,
    serviceDate: cert.serviceOrder?.receivedAt,
    deliveryDate: cert.serviceOrder?.deliveredAt,
    technician: cert.serviceOrder?.technician?.name,
    issuer: "Ditrucks — Diagnóstico y Soluciones Diésel",
  });
}
