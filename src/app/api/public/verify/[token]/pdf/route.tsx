import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCertificateByPublicToken } from "@/services/certificate";
import { CertificatePdf } from "@/lib/pdf/certificate-pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cert = await getCertificateByPublicToken(token);

  if (!cert) return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify/${cert.publicToken}`;
  const dateFmt = (d: Date | null | undefined) => d ? d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : null;

  const buffer = await renderToBuffer(
    <CertificatePdf
      certificateNumber={cert.certificateNumber}
      status={cert.status}
      vehicle={{
        brand: cert.vehicle.brand,
        model: cert.vehicle.model,
        year: cert.vehicle.year,
        vin: cert.vehicle.vin,
        plates: cert.vehicle.plates,
        economicNumber: cert.vehicle.economicNumber,
      }}
      companyName={cert.company?.name || null}
      orderFolio={cert.serviceOrder?.folio || null}
      serviceDate={dateFmt(cert.serviceOrder?.receivedAt)}
      deliveryDate={dateFmt(cert.serviceOrder?.deliveredAt)}
      technician={cert.serviceOrder?.technician?.name || null}
      workSummary={cert.workSummary}
      diagnosticSummary={cert.diagnosticSummary}
      finalResult={cert.finalResult}
      systemsWorked={cert.systemsWorked}
      issuedAt={dateFmt(cert.issuedAt)}
      verifyUrl={verifyUrl}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cert.certificateNumber}.pdf"`,
    },
  });
}
