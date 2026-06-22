import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth";
import { z } from "zod";

// ─── AUTH ───────────────────────────────────────────────
// Valida el API key del CRM. Se compara contra WEBHOOK_CRM_SECRET en .env
function authenticateWebhook(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_CRM_SECRET;
  if (!secret) return false;

  // Soporta ambos formatos: header "x-api-key" o "Authorization: Bearer ..."
  const apiKey = req.headers.get("x-api-key");
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");

  return apiKey === secret || bearer === secret;
}

// ─── SCHEMA ─────────────────────────────────────────────
// El payload es flexible: todo excepto el nombre de empresa es opcional.
// El CRM manda lo que tenga, el técnico completa después.
const webhookSchema = z.object({
  // Identificador externo del CRM para evitar duplicados
  externalId: z.string().optional().nullable(),

  // Empresa (requerido mínimo el nombre)
  company: z.object({
    name: z.string().min(1, "Nombre de empresa requerido"),
    legalName: z.string().optional().nullable(),
    rfc: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    primaryContact: z.string().optional().nullable(),
    companyType: z.enum([
      "flotilla", "taller", "transporte", "agricola",
      "construccion", "particular", "otro",
    ]).optional().default("particular"),
    notes: z.string().optional().nullable(),
  }),

  // Cliente / contacto (opcional)
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional().nullable(),

  // Vehículo (opcional, el técnico puede completar campos faltantes)
  vehicle: z.object({
    brand: z.string().min(1, "Marca requerida"),
    model: z.string().min(1, "Modelo requerido"),
    year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
    engine: z.string().optional().nullable(),
    vin: z.string().optional().nullable(),
    plates: z.string().optional().nullable(),
    economicNumber: z.string().optional().nullable(),
    fuelType: z.enum(["diesel", "gasolina", "gas_natural", "hibrido", "otro"]).optional().default("diesel"),
    mileage: z.coerce.number().int().min(0).optional().nullable(),
    hourMeter: z.coerce.number().int().min(0).optional().nullable(),
    unitType: z.enum([
      "tractocamion", "pickup", "van", "maquinaria",
      "agricola", "construccion", "autobus", "otro",
    ]).optional().default("otro"),
    knownEcu: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type CrmWebhookPayload = z.infer<typeof webhookSchema>;

// ─── HANDLER ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Autenticar
  if (!authenticateWebhook(req)) {
    return NextResponse.json(
      { error: "API key inválida o no proporcionada" },
      { status: 401 }
    );
  }

  // 2. Parsear y validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    // 3. Upsert empresa — busca por RFC, email o nombre exacto
    const companyWhere = data.company.rfc
      ? { rfc: data.company.rfc }
      : data.company.email
        ? { email: data.company.email }
        : null;

    let company;

    if (companyWhere) {
      // Buscar por campo único
      company = await prisma.company.findFirst({
        where: { ...companyWhere, deleted: false },
      });
    }

    if (!company) {
      // Buscar por nombre exacto como fallback
      company = await prisma.company.findFirst({
        where: { name: data.company.name, deleted: false },
      });
    }

    if (company) {
      // Actualizar solo campos que el CRM manda y no están vacíos
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data.company)) {
        if (value !== null && value !== undefined && value !== "") {
          updates[key] = value;
        }
      }
      company = await prisma.company.update({
        where: { id: company.id },
        data: updates,
      });
    } else {
      company = await prisma.company.create({
        data: data.company,
      });
    }

    // 4. Upsert cliente (si viene en el payload)
    let customer = null;
    if (data.customer) {
      // Buscar por email o por nombre + empresa
      if (data.customer.email) {
        customer = await prisma.customer.findFirst({
          where: {
            email: data.customer.email,
            companyId: company.id,
            deleted: false,
          },
        });
      }

      if (!customer) {
        customer = await prisma.customer.findFirst({
          where: {
            name: data.customer.name,
            companyId: company.id,
            deleted: false,
          },
        });
      }

      if (customer) {
        const updates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data.customer)) {
          if (value !== null && value !== undefined && value !== "") {
            updates[key] = value;
          }
        }
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: updates,
        });
      } else {
        customer = await prisma.customer.create({
          data: { ...data.customer, companyId: company.id },
        });
      }
    }

    // 5. Upsert vehículo (si viene en el payload)
    let vehicle = null;
    if (data.vehicle) {
      // Buscar por VIN, placas, o número económico + empresa
      if (data.vehicle.vin) {
        vehicle = await prisma.vehicle.findFirst({
          where: { vin: data.vehicle.vin, deleted: false },
        });
      }

      if (!vehicle && data.vehicle.plates) {
        vehicle = await prisma.vehicle.findFirst({
          where: { plates: data.vehicle.plates, deleted: false },
        });
      }

      if (!vehicle && data.vehicle.economicNumber) {
        vehicle = await prisma.vehicle.findFirst({
          where: {
            economicNumber: data.vehicle.economicNumber,
            companyId: company.id,
            deleted: false,
          },
        });
      }

      if (vehicle) {
        // Solo actualizar campos que NO están vacíos en el payload
        // y que SÍ están vacíos en el registro existente (no sobreescribir datos del técnico)
        const updates: Record<string, unknown> = {};
        const existing = vehicle as Record<string, unknown>;
        for (const [key, value] of Object.entries(data.vehicle)) {
          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            (existing[key] === null || existing[key] === undefined || existing[key] === "")
          ) {
            updates[key] = value;
          }
        }
        // Siempre mantener la relación con la empresa
        updates.companyId = company.id;
        if (customer) updates.customerId = customer.id;

        vehicle = await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: updates,
        });
      } else {
        vehicle = await prisma.vehicle.create({
          data: {
            ...data.vehicle,
            companyId: company.id,
            customerId: customer?.id || null,
          },
        });
      }
    }

    // 6. Auditoría
    await createAuditLog({
      entityType: "CrmWebhook",
      entityId: data.externalId || company.id,
      action: "crm_sync",
      newValue: JSON.stringify({
        companyId: company.id,
        customerId: customer?.id || null,
        vehicleId: vehicle?.id || null,
        source: "webhook",
      }),
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
    });

    // 7. Respuesta con los IDs creados/actualizados
    return NextResponse.json({
      success: true,
      data: {
        company: { id: company.id, name: company.name },
        customer: customer ? { id: customer.id, name: customer.name } : null,
        vehicle: vehicle
          ? { id: vehicle.id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.year || ""}`.trim() }
          : null,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("CRM webhook error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar webhook" },
      { status: 500 }
    );
  }
}
