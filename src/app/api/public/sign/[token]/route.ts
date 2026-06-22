import { NextRequest, NextResponse } from "next/server";
import { validateSignatureToken, markTokenViewed, buildOrderSnapshot, hashToken, getActiveTerms } from "@/services/signature";
import { sendCrmEvent } from "@/services/crm-webhook";
import { getProgressPercent } from "@/services/order-progress";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET: Validate token and return order data for display
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateSignatureToken(token);

  if (!result.valid || !result.order || !result.phase) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const ip = _req.headers.get("x-forwarded-for") || _req.headers.get("x-real-ip") || undefined;
  const ua = _req.headers.get("user-agent") || undefined;
  await markTokenViewed(token, ip, ua);

  const terms = await getActiveTerms();
  const order = result.order;
  const phase = result.phase;
  const diag = order.diagnostics?.[0];

  const basePayload = {
    phase,
    folio: order.folio,
    company: order.company ? { name: order.company.name } : null,
    customer: order.customer ? { name: order.customer.name } : null,
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
    terms: terms ? { version: terms.version, title: terms.title, content: terms.content } : null,
  };

  if (phase === "reception") {
    return NextResponse.json({
      ...basePayload,
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
      diagnostic: diag ? {
        generalHealthScore: diag.generalHealthScore,
        riskLevel: diag.riskLevel,
        dpfPresent: diag.dpfPresent,
        dpfScore: diag.dpfScore,
        scrPresent: diag.scrPresent,
        scrScore: diag.scrScore,
        egrPresent: diag.egrPresent,
        egrScore: diag.egrScore,
        visibleRecommendation: diag.visibleRecommendation,
      } : null,
      evidence: order.evidence?.map((e: { category: string; description: string | null }) => ({
        category: e.category,
        description: e.description,
      })) || [],
    });
  }

  return NextResponse.json({
    ...basePayload,
    workSummary: order.workSummary,
    serviceTypes: order.serviceTypes,
    deliveredAt: order.deliveredAt,
    certificateNumber: order.certificates?.[0]?.certificateNumber || null,
    diagnostic: diag ? {
      generalHealthScore: diag.generalHealthScore,
      riskLevel: diag.riskLevel,
      dpfPresent: diag.dpfPresent,
      dpfScore: diag.dpfScore,
      scrPresent: diag.scrPresent,
      scrScore: diag.scrScore,
      egrPresent: diag.egrPresent,
      egrScore: diag.egrScore,
      visibleRecommendation: diag.visibleRecommendation,
    } : null,
  });
}

// POST: Accept signature
const signSchema = z.object({
  signatureData: z.string().min(1, "Firma requerida"),
  signerName: z.string().min(1, "Nombre requerido"),
  signerRole: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateSignatureToken(token);

  if (!result.valid || !result.order || !result.phase) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const body = await req.json();
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { signatureData, signerName, signerRole } = parsed.data;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  const orderId = result.order.id;
  const phase = result.phase;

  try {
    // Build snapshot BEFORE saving signature
    const snapshot = await buildOrderSnapshot(orderId, phase);
    const terms = await getActiveTerms();

    // Mark token as used
    const tokenHash = hashToken(token);
    await prisma.signatureToken.update({
      where: { tokenHash },
      data: { used: true, signedAt: new Date() },
    });

    // Update order with signature
    await prisma.serviceOrder.update({
      where: { id: orderId },
      data: phase === "reception"
        ? {
            receptionSignatureStatus: "signed",
            receptionSignatureType: "remote",
            receptionSignatureData: signatureData,
            receptionSignerName: signerName,
            receptionSignerRole: signerRole || null,
            receptionSignedAt: new Date(),
            receptionSignatureIp: ip,
            receptionSignatureUserAgent: userAgent,
            receptionSignatureSnapshot: snapshot,
            receptionTermsVersion: terms?.version || "1.0",
            status: "firmada",
            progressPercent: getProgressPercent("firmada"),
            progressLabel: "Firmada",
          }
        : {
            deliverySignatureStatus: "signed",
            deliverySignatureType: "remote",
            deliverySignatureData: signatureData,
            deliverySignerName: signerName,
            deliverySignerRole: signerRole || null,
            deliverySignedAt: new Date(),
            deliverySignatureIp: ip,
            deliverySignatureUserAgent: userAgent,
            deliverySignatureSnapshot: snapshot,
            deliveryTermsVersion: terms?.version || "1.0",
          },
    });

    // Signature event
    await prisma.signatureEvent.create({
      data: {
        serviceOrderId: orderId,
        phase,
        eventType: "signed_remote",
        ipAddress: ip,
        userAgent: userAgent,
        metadata: JSON.stringify({ signerName, signerRole }),
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        entityType: "ServiceOrder",
        entityId: orderId,
        action: `signature_${phase}_completed_remote`,
        newValue: JSON.stringify({ signerName, signedAt: new Date().toISOString() }),
        ipAddress: ip,
        userAgent: userAgent,
      },
    });

    // CRM event
    await sendCrmEvent(phase === "reception" ? "service_order.signed" : "service_order.delivery_signed", orderId, {
      signature_type: "remote",
      phase,
      signer_name: signerName,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Firma registrada exitosamente" });
  } catch (error) {
    console.error("Signature error:", error);
    return NextResponse.json({ error: "Error al registrar firma" }, { status: 500 });
  }
}
