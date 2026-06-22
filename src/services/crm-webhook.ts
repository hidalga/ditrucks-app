import { prisma } from "@/lib/prisma";
import { buildCrmPayload, getOrderProgress } from "./order-progress";

export type CrmEventType =
  | "service_order.created"
  | "service_order.status_changed"
  | "service_order.reception_completed"
  | "service_order.signature_requested"
  | "service_order.signed"
  | "service_order.delivery_signed"
  | "service_order.diagnosis_completed"
  | "service_order.technical_completed"
  | "service_order.certificate_generated"
  | "service_order.closed"
  | "service_order.cancelled";

export async function sendCrmEvent(
  eventType: CrmEventType,
  orderId: string,
  extra?: Record<string, unknown>
) {
  // Get order
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      folio: true,
      status: true,
      externalCrmDealId: true,
      progressPercent: true,
      receptionSignatureStatus: true,
      deliverySignatureStatus: true,
    },
  });

  if (!order) return;

  // Get active outbound configs
  const configs = await prisma.webhookOutboundConfig.findMany({
    where: {
      active: true,
      OR: [
        { events: { has: eventType } },
        { events: { has: "*" } }, // wildcard = all events
      ],
    },
  });

  if (configs.length === 0) return;

  const payload = buildCrmPayload(order, eventType, extra);

  // Fire webhooks in parallel (fire-and-forget for now)
  for (const config of configs) {
    fireWebhook(config.url, config.secret, eventType, payload, orderId).catch(
      (err) => console.error(`Webhook error for ${config.name}:`, err)
    );
  }
}

async function fireWebhook(
  url: string,
  secret: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  entityId: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Ditrucks-Event": eventType,
  };
  if (secret) {
    headers["X-Ditrucks-Secret"] = secret;
  }

  let responseCode = 0;
  let responseBody = "";
  let success = false;
  let errorMessage: string | undefined;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    responseCode = res.status;
    responseBody = await res.text().catch(() => "");
    success = res.ok;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  // Log the attempt
  await prisma.webhookLog.create({
    data: {
      direction: "outbound",
      endpoint: url,
      eventType,
      payload: JSON.stringify(payload),
      responseCode: responseCode || null,
      responseBody: responseBody?.slice(0, 2000) || null,
      success,
      errorMessage,
      entityType: "ServiceOrder",
      entityId,
    },
  }).catch((e) => console.error("Failed to log webhook:", e));
}

// Helper: trigger event on status change
export async function onOrderStatusChanged(
  orderId: string,
  oldStatus: string,
  newStatus: string
) {
  const eventMap: Record<string, CrmEventType> = {
    recepcion_completada: "service_order.reception_completed",
    firma_pendiente: "service_order.signature_requested",
    firma_enviada: "service_order.signature_requested",
    firmada: "service_order.signed",
    completada_tecnica: "service_order.technical_completed",
    certificado_generado: "service_order.certificate_generated",
    cerrada: "service_order.closed",
    cancelada: "service_order.cancelled",
  };

  const specificEvent = eventMap[newStatus];

  // Always send generic status_changed
  await sendCrmEvent("service_order.status_changed", orderId, {
    old_status: oldStatus,
    new_status: newStatus,
  });

  // Send specific event if mapped
  if (specificEvent) {
    await sendCrmEvent(specificEvent, orderId);
  }
}
