import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function generateCertificateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.serviceCertificate.count({
    where: { certificateNumber: { startsWith: `CERT-${year}` } },
  });
  return `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
}

export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}

export function generatePublicSlug(): string {
  return randomBytes(8).toString("hex");
}

export async function createCertificate(params: {
  serviceOrderId: string;
  generatedByUserId: string;
  workSummary?: string;
  diagnosticSummary?: string;
  finalResult?: string;
  visibleNotes?: string;
  systemsWorked?: string[];
}) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: params.serviceOrderId },
    include: { vehicle: true, company: true, customer: true, diagnostics: { where: { deleted: false }, take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (!order) throw new Error("Orden no encontrada");

  const certificateNumber = await generateCertificateNumber();
  const publicToken = generatePublicToken();
  const publicSlug = generatePublicSlug();

  // Auto-fill from order if not provided
  const diag = order.diagnostics?.[0];
  const workSummary = params.workSummary || order.workSummary || "";
  const diagnosticSummary = params.diagnosticSummary || (diag ? `Score: ${diag.generalHealthScore}/100 — ${diag.riskLevel}` : "");
  const systemsWorked = params.systemsWorked || order.serviceTypes.map(String);

  const certificate = await prisma.serviceCertificate.create({
    data: {
      certificateNumber,
      serviceOrderId: order.id,
      vehicleId: order.vehicleId,
      companyId: order.companyId,
      customerId: order.customerId,
      generatedByUserId: params.generatedByUserId,
      status: "published",
      workSummary,
      diagnosticSummary,
      finalResult: params.finalResult || "Trabajo completado satisfactoriamente",
      visibleNotes: params.visibleNotes,
      systemsWorked,
      publicToken,
      publicSlug,
      issuedAt: new Date(),
    },
    include: { vehicle: true, company: true, serviceOrder: true },
  });

  // Update order status
  await prisma.serviceOrder.update({
    where: { id: order.id },
    data: { status: "certificado_generado", progressPercent: 95, progressLabel: "Certificado Generado" },
  });

  return certificate;
}

export async function getCertificateByPublicToken(token: string) {
  return prisma.serviceCertificate.findUnique({
    where: { publicToken: token },
    include: {
      vehicle: true,
      company: true,
      serviceOrder: { select: { folio: true, receivedAt: true, deliveredAt: true, serviceTypes: true, technician: { select: { name: true } } } },
    },
  });
}

export async function getCertificateBySlug(slug: string) {
  return prisma.serviceCertificate.findUnique({
    where: { publicSlug: slug },
    include: {
      vehicle: true,
      company: true,
      serviceOrder: { select: { folio: true, receivedAt: true, deliveredAt: true, serviceTypes: true, technician: { select: { name: true } } } },
    },
  });
}

export async function revokeCertificate(certificateId: string, reason: string) {
  return prisma.serviceCertificate.update({
    where: { id: certificateId },
    data: { status: "revoked", revokedAt: new Date(), revokedReason: reason },
  });
}
