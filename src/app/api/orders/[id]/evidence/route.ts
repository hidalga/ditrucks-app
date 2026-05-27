import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const evidenceSchema = z.object({
  category: z.enum([
    "recepcion", "dano_fisico", "tablero_testigos", "escaner",
    "herramienta_conectada", "lectura_ecu", "escritura_ecu",
    "prueba_final", "marketing", "otro",
  ]).default("otro"),
  filePath: z.string().min(1),
  description: z.string().optional().nullable(),
  marketingUsable: z.boolean().default(false),
  customerVisible: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: orderId } = await params;
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = evidenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const evidence = await prisma.evidence.create({
    data: {
      ...parsed.data,
      serviceOrderId: orderId,
      vehicleId: order.vehicleId,
      uploadedById: user.id,
    },
    include: { uploadedBy: true },
  });

  return NextResponse.json(evidence, { status: 201 });
}
