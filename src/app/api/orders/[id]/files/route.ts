import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createAuditLog } from "@/lib/auth";
import { ecuFileSchema } from "@/lib/validations";
import { uploadToR2 } from "@/lib/storage/r2";

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: orderId } = await params;

  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  const hasUpload = file instanceof File && file.size > 0;

  if (hasUpload && (file as File).size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo excede el tamaño máximo de 150MB" }, { status: 400 });
  }

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "file") continue;
    raw[key] = value;
  }
  if (hasUpload && !raw.fileName) {
    raw.fileName = (file as File).name;
  }

  const parsed = ecuFileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  let data = parsed.data;
  if (hasUpload) {
    const f = file as File;
    const buffer = Buffer.from(await f.arrayBuffer());
    const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : null;
    const storagePath = `ecu/${orderId}/${data.fileType}/${crypto.randomUUID()}${ext || ""}`;
    await uploadToR2(storagePath, buffer, f.type || "application/octet-stream");
    data = {
      ...data,
      storageType: "r2",
      storagePath,
      fileExtension: ext,
      fileSize: buffer.length,
    };
  }

  // Count existing versions for version numbering
  const existingCount = await prisma.ecuFile.count({
    where: {
      serviceOrderId: orderId,
      fileType: data.fileType,
      deleted: false,
    },
  });

  const ecuFile = await prisma.ecuFile.create({
    data: {
      ...data,
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
    entityId: ecuFile.id,
    action: "upload",
    newValue: JSON.stringify({ fileType: data.fileType, fileName: data.fileName }),
  });

  return NextResponse.json(ecuFile, { status: 201 });
}
