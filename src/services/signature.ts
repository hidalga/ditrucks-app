import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { SignaturePhase } from "@prisma/client";

const TOKEN_EXPIRY_HOURS = 72;

export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const STATUS_FIELD: Record<SignaturePhase, "receptionSignatureStatus" | "deliverySignatureStatus"> = {
  reception: "receptionSignatureStatus",
  delivery: "deliverySignatureStatus",
};

export async function createRemoteSignatureToken(orderId: string, phase: SignaturePhase) {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.signatureToken.create({
    data: {
      serviceOrderId: orderId,
      phase,
      tokenHash: hash,
      expiresAt,
    },
  });

  await prisma.serviceOrder.update({
    where: { id: orderId },
    data: { [STATUS_FIELD[phase]]: "sent" },
  });

  await prisma.signatureEvent.create({
    data: {
      serviceOrderId: orderId,
      phase,
      eventType: "remote_link_generated",
    },
  });

  return { token, expiresAt };
}

export async function validateSignatureToken(token: string) {
  const hash = hashToken(token);
  const record = await prisma.signatureToken.findUnique({
    where: { tokenHash: hash },
    include: {
      serviceOrder: {
        include: {
          company: true,
          customer: true,
          vehicle: true,
          technician: true,
          diagnostics: { where: { deleted: false }, orderBy: { createdAt: "desc" }, take: 1 },
          certificates: { where: { status: { in: ["published", "generated"] } }, orderBy: { createdAt: "desc" }, take: 1 },
          evidence: {
            where: { deleted: false, customerVisible: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!record) return { valid: false, error: "Token inválido", order: null, phase: null as SignaturePhase | null };
  if (record.used) return { valid: false, error: "Este enlace ya fue utilizado para firmar", order: null, phase: record.phase };
  if (record.expiresAt < new Date()) return { valid: false, error: "Este enlace ha expirado", order: null, phase: record.phase };

  return { valid: true, error: null, order: record.serviceOrder, phase: record.phase, tokenRecord: record };
}

export async function markTokenViewed(token: string, ip?: string, userAgent?: string) {
  const hash = hashToken(token);
  const record = await prisma.signatureToken.findUnique({ where: { tokenHash: hash } });
  if (!record) return;

  await prisma.signatureToken.update({
    where: { tokenHash: hash },
    data: { viewedAt: new Date() },
  });

  await prisma.serviceOrder.update({
    where: { id: record.serviceOrderId },
    data: { [STATUS_FIELD[record.phase]]: "viewed" },
  });

  await prisma.signatureEvent.create({
    data: {
      serviceOrderId: record.serviceOrderId,
      phase: record.phase,
      eventType: "remote_link_viewed",
      ipAddress: ip,
      userAgent: userAgent,
    },
  });
}

export async function buildOrderSnapshot(orderId: string, phase: SignaturePhase): Promise<string> {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      company: true,
      customer: true,
      vehicle: true,
      technician: true,
      diagnostics: { where: { deleted: false }, orderBy: { createdAt: "desc" }, take: 1 },
      certificates: { where: { status: { in: ["published", "generated"] } }, orderBy: { createdAt: "desc" }, take: 1 },
      evidence: {
        where: { deleted: false, customerVisible: true },
        select: { id: true, category: true, description: true, filePath: true },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  const activeTerms = await prisma.authorizationTerms.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  const base = {
    snapshotDate: new Date().toISOString(),
    phase,
    folio: order.folio,
    company: order.company ? { name: order.company.name, rfc: order.company.rfc } : null,
    customer: order.customer ? { name: order.customer.name, email: order.customer.email, phone: order.customer.phone } : null,
    vehicle: {
      brand: order.vehicle.brand,
      model: order.vehicle.model,
      year: order.vehicle.year,
      vin: order.vehicle.vin,
      plates: order.vehicle.plates,
      economicNumber: order.vehicle.economicNumber,
      engine: order.vehicle.engine,
    },
    technician: order.technician?.name || null,
    termsVersion: activeTerms?.version || "1.0",
    termsTitle: activeTerms?.title || "",
  };

  if (phase === "reception") {
    return JSON.stringify({
      ...base,
      mileageAtReception: order.mileageAtReception,
      engineHoursAtReception: order.engineHoursAtReception,
      fuelLevel: order.fuelLevel,
      activeWarningLights: order.activeWarningLights,
      activeFaults: order.activeFaults,
      customerReportedFaults: order.customerReportedFaults,
      physicalDamageNotes: order.physicalDamageNotes,
      generalObservations: order.generalObservations,
      requestedServiceType: order.requestedServiceType,
      serviceTypes: order.serviceTypes,
      diagnosticAtReception: order.diagnostics[0]
        ? {
            generalHealthScore: order.diagnostics[0].generalHealthScore,
            riskLevel: order.diagnostics[0].riskLevel,
            dpfScore: order.diagnostics[0].dpfScore,
            scrScore: order.diagnostics[0].scrScore,
            egrScore: order.diagnostics[0].egrScore,
          }
        : null,
      customerVisibleEvidenceCount: order.evidence.length,
    });
  }

  return JSON.stringify({
    ...base,
    workSummary: order.workSummary,
    serviceTypes: order.serviceTypes,
    deliveredAt: order.deliveredAt,
    diagnosticAfterService: order.diagnostics[0]
      ? {
          generalHealthScore: order.diagnostics[0].generalHealthScore,
          riskLevel: order.diagnostics[0].riskLevel,
          dpfScore: order.diagnostics[0].dpfScore,
          scrScore: order.diagnostics[0].scrScore,
          egrScore: order.diagnostics[0].egrScore,
        }
      : null,
    certificateNumber: order.certificates[0]?.certificateNumber || null,
    customerVisibleEvidenceCount: order.evidence.length,
  });
}

export async function getActiveTerms() {
  return prisma.authorizationTerms.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
}
