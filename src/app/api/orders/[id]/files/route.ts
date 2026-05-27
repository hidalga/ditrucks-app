import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { ecuFileSchema } from "@/lib/validations";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: orderId } = await params;

  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = ecuFileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // Count existing versions for version numbering
  const existingCount = await prisma.ecuFile.count({
    where: {
      serviceOrderId: orderId,
      fileType: parsed.data.fileType,
      deleted: false,
    },
  });

  const file = await prisma.ecuFile.create({
    data: {
      ...parsed.data,
      serviceOrderId: orderId,
      vehicleId: order.vehicleId,
      uploadedById: user.id,
      versionNumber: existingCount + 1,
    },
    include: { uploadedBy: true },
  });

  await createAuditLog({
    userId: user.id,
    entityType: "EcuFile",
    entityId: file.id,
    action: "upload",
    newValue: JSON.stringify({ fileType: parsed.data.fileType, fileName: parsed.data.fileName }),
  });

  return NextResponse.json(file, { status: 201 });
}
