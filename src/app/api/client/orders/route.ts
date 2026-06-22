import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";

export async function GET() {
  const user = await getSession();
  if (!user || !CLIENT_ROLES.includes(user.role)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  if (!dbUser?.companyId) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const orders = await prisma.serviceOrder.findMany({
    where: { companyId: dbUser.companyId, deleted: false, status: { in: ["cerrada","entregada","certificado_generado","completada_tecnica"] } },
    orderBy: { createdAt: "desc" },
    include: { vehicle: true },
  });

  // Strip sensitive fields
  const safe = orders.map(({ internalNotes, receptionSignatureData, receptionSignatureSnapshot, deliverySignatureData, deliverySignatureSnapshot, ...rest }) => rest);
  return NextResponse.json(safe);
}
