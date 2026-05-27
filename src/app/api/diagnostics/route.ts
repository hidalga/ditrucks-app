import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { diagnosticSchema } from "@/lib/validations";
import { calculateOverallRating } from "@/services/rating-engine";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId") || "";
  const orderId = searchParams.get("orderId") || "";

  const where: Record<string, unknown> = { deleted: false };
  if (vehicleId) where.vehicleId = vehicleId;
  if (orderId) where.serviceOrderId = orderId;

  const diagnostics = await prisma.diagnostic.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { vehicle: { include: { company: true } }, serviceOrder: true, technician: true },
  });

  return NextResponse.json(diagnostics);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = diagnosticSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // Calculate scores
  const rating = calculateOverallRating(parsed.data as never);

  const diagnostic = await prisma.diagnostic.create({
    data: {
      ...parsed.data,
      technicianId: user.id,
      nextCheckDate: parsed.data.nextCheckDate ? new Date(parsed.data.nextCheckDate) : null,
      dpfScore: rating.dpfScore,
      scrScore: rating.scrScore,
      egrScore: rating.egrScore,
      generalHealthScore: rating.generalHealthScore,
      riskLevel: rating.riskLevel,
      scorePenalties: JSON.stringify(rating.penalties),
    },
    include: { vehicle: { include: { company: true } }, serviceOrder: true, technician: true },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "Diagnostic",
    entityId: diagnostic.id,
    action: "create",
    newValue: JSON.stringify({
      riskLevel: rating.riskLevel,
      score: rating.generalHealthScore,
    }),
  });

  return NextResponse.json(diagnostic, { status: 201 });
}
