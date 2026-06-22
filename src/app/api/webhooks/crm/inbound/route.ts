import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth";
import { generateFolio } from "@/services/folio";
import { getOrderProgress } from "@/services/order-progress";
import { sendCrmEvent } from "@/services/crm-webhook";
import { z } from "zod";

function authenticateWebhook(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_CRM_SECRET;
  if (!secret) return false;
  const apiKey = req.headers.get("x-api-key");
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  return apiKey === secret || bearer === secret;
}

const inboundSchema = z.object({
  external_crm_deal_id: z.string().optional().nullable(),
  external_crm_company_id: z.string().optional().nullable(),
  external_crm_contact_id: z.string().optional().nullable(),
  external_crm_vehicle_id: z.string().optional().nullable(),
  crm_source: z.string().optional().nullable(),
  company_name: z.string().min(1, "company_name requerido"),
  company_rfc: z.string().optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_email: z.string().optional().nullable(),
  company_address: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().optional().nullable(),
  sales_rep_name: z.string().optional().nullable(),
  sales_rep_email: z.string().optional().nullable(),
  vehicle_vin: z.string().optional().nullable(),
  vehicle_internal_number: z.string().optional().nullable(),
  vehicle_brand: z.string().optional().nullable(),
  vehicle_model: z.string().optional().nullable(),
  vehicle_year: z.coerce.number().int().optional().nullable(),
  vehicle_engine: z.string().optional().nullable(),
  vehicle_fuel_type: z.string().optional().nullable(),
  vehicle_mileage: z.coerce.number().int().optional().nullable(),
  vehicle_engine_hours: z.coerce.number().int().optional().nullable(),
  requested_service_type: z.string().optional().nullable(),
  commercial_notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Log the inbound webhook
  const logEntry = await prisma.webhookLog.create({
    data: {
      direction: "inbound",
      endpoint: "/api/webhooks/crm/inbound",
      payload: rawBody.slice(0, 10000),
    },
  });

  if (!authenticateWebhook(req)) {
    await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { success: false, errorMessage: "Auth failed", responseCode: 401 } });
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch {
    await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { success: false, errorMessage: "Invalid JSON", responseCode: 400 } });
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = inboundSchema.safeParse(body);
  if (!parsed.success) {
    await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { success: false, errorMessage: JSON.stringify(parsed.error.flatten()), responseCode: 400 } });
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  try {
    // ── Dedup by deal ID ──
    if (d.external_crm_deal_id) {
      const existing = await prisma.serviceOrder.findFirst({
        where: { externalCrmDealId: d.external_crm_deal_id, deleted: false },
      });
      if (existing) {
        await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { success: true, responseCode: 200, entityType: "ServiceOrder", entityId: existing.id } });
        const progress = getOrderProgress(existing.status);
        return NextResponse.json({
          status: "existing",
          folio: existing.folio,
          order_id: existing.id,
          current_status: existing.status,
          progress_percentage: progress.percent,
          progress_label: progress.label,
        });
      }
    }

    // ── Upsert company ──
    let company = d.external_crm_company_id
      ? await prisma.company.findFirst({ where: { externalCrmId: d.external_crm_company_id, deleted: false } })
      : await prisma.company.findFirst({ where: { name: d.company_name, deleted: false } });

    if (company) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          ...(d.company_rfc && !company.rfc ? { rfc: d.company_rfc } : {}),
          ...(d.company_phone && !company.phone ? { phone: d.company_phone } : {}),
          ...(d.company_email && !company.email ? { email: d.company_email } : {}),
          ...(d.company_address && !company.address ? { address: d.company_address } : {}),
          ...(d.external_crm_company_id ? { externalCrmId: d.external_crm_company_id } : {}),
          ...(d.crm_source ? { crmSource: d.crm_source } : {}),
        },
      });
    } else {
      company = await prisma.company.create({
        data: {
          name: d.company_name,
          rfc: d.company_rfc,
          phone: d.company_phone,
          email: d.company_email,
          address: d.company_address,
          externalCrmId: d.external_crm_company_id,
          crmSource: d.crm_source,
          companyType: "flotilla",
        },
      });
    }

    // ── Upsert customer ──
    let customer = null;
    if (d.contact_name) {
      customer = d.external_crm_contact_id
        ? await prisma.customer.findFirst({ where: { externalCrmId: d.external_crm_contact_id, deleted: false } })
        : d.contact_email
          ? await prisma.customer.findFirst({ where: { email: d.contact_email, companyId: company.id, deleted: false } })
          : await prisma.customer.findFirst({ where: { name: d.contact_name, companyId: company.id, deleted: false } });

      if (!customer) {
        customer = await prisma.customer.create({
          data: { name: d.contact_name, phone: d.contact_phone, email: d.contact_email, companyId: company.id, externalCrmId: d.external_crm_contact_id },
        });
      }
    }

    // ── Upsert vehicle ──
    let vehicle = null;
    if (d.vehicle_brand && d.vehicle_model) {
      if (d.vehicle_vin) vehicle = await prisma.vehicle.findFirst({ where: { vin: d.vehicle_vin, deleted: false } });
      if (!vehicle && d.vehicle_internal_number) vehicle = await prisma.vehicle.findFirst({ where: { economicNumber: d.vehicle_internal_number, companyId: company.id, deleted: false } });

      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            brand: d.vehicle_brand,
            model: d.vehicle_model,
            year: d.vehicle_year,
            engine: d.vehicle_engine,
            vin: d.vehicle_vin,
            economicNumber: d.vehicle_internal_number,
            mileage: d.vehicle_mileage,
            hourMeter: d.vehicle_engine_hours,
            companyId: company.id,
            customerId: customer?.id,
            externalCrmId: d.external_crm_vehicle_id,
          },
        });
      }
    }

    // ── Create order ──
    let order = null;
    if (vehicle) {
      const folio = await generateFolio();
      const progress = getOrderProgress("borrador");

      order = await prisma.serviceOrder.create({
        data: {
          folio,
          companyId: company.id,
          customerId: customer?.id,
          vehicleId: vehicle.id,
          status: "borrador",
          requestedServiceType: d.requested_service_type,
          commercialNotes: d.commercial_notes,
          salesRepName: d.sales_rep_name,
          salesRepEmail: d.sales_rep_email,
          externalCrmDealId: d.external_crm_deal_id,
          externalCrmCompanyId: d.external_crm_company_id,
          externalCrmContactId: d.external_crm_contact_id,
          crmSource: d.crm_source,
          progressPercent: progress.percent,
          progressLabel: progress.label,
        },
      });

      await createAuditLog({
        entityType: "ServiceOrder",
        entityId: order.id,
        action: "created_from_crm_webhook",
        newValue: JSON.stringify({ folio, crmDealId: d.external_crm_deal_id }),
      });

      // Notify CRM back
      sendCrmEvent("service_order.created", order.id).catch(() => {});
    }

    await prisma.webhookLog.update({
      where: { id: logEntry.id },
      data: {
        success: true,
        responseCode: 200,
        entityType: "ServiceOrder",
        entityId: order?.id || company.id,
        eventType: "crm_inbound",
      },
    });

    return NextResponse.json({
      status: "created",
      company: { id: company.id, name: company.name },
      customer: customer ? { id: customer.id, name: customer.name } : null,
      vehicle: vehicle ? { id: vehicle.id, label: `${vehicle.brand} ${vehicle.model}` } : null,
      order: order ? { id: order.id, folio: order.folio, status: order.status } : null,
    });

  } catch (error) {
    console.error("CRM inbound error:", error);
    await prisma.webhookLog.update({ where: { id: logEntry.id }, data: { success: false, errorMessage: String(error), responseCode: 500 } });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
