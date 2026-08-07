import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { id },
    include: {
      vehicle: { include: { company: true } },
      serviceOrder: true,
      technician: true,
    },
  });

  if (!diagnostic || diagnostic.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(diagnostic);
}

// Roles que pueden mover el pipeline comercial de un diagnóstico
const OPPORTUNITY_ROLES = ["admin", "sales"];

const opportunityPatchSchema = z.object({
  commercialOpportunityStatus: z.enum([
    "sin_oportunidad", "seguimiento", "cotizar", "agendar", "vendido", "perdido",
  ]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !OPPORTUNITY_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = opportunityPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.diagnostic.findUnique({ where: { id }, select: { deleted: true, commercialOpportunityStatus: true } });
  if (!existing || existing.deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const diagnostic = await prisma.diagnostic.update({
    where: { id },
    data: { commercialOpportunityStatus: parsed.data.commercialOpportunityStatus },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "Diagnostic",
    entityId: id,
    action: "update_opportunity",
    oldValue: existing.commercialOpportunityStatus,
    newValue: parsed.data.commercialOpportunityStatus,
  });

  // BI: movimiento del pipeline comercial
  prisma.analyticsEvent.create({
    data: {
      event: "opportunity_status_changed",
      userId: user.id,
      userRole: user.role,
      metadata: { diagnosticId: id, from: existing.commercialOpportunityStatus, to: parsed.data.commercialOpportunityStatus },
    },
  }).catch(() => {});

  return NextResponse.json(diagnostic);
}
