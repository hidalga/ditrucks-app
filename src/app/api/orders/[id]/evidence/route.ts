import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadToR2 } from "@/lib/storage/r2";
import { generateThumbnail, isImageMimeType } from "@/lib/storage/thumbnail";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_PREFIXES = ["image/", "video/"];

const EVIDENCE_CATEGORIES = [
  "recepcion", "dano_fisico", "tablero_testigos", "escaner",
  "herramienta_conectada", "lectura_ecu", "escritura_ecu",
  "prueba_final", "marketing", "otro",
] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: orderId } = await params;
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json({ error: "Tipo de archivo no permitido (solo imagen o video)" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo excede el tamaño máximo de 20MB" }, { status: 400 });
  }

  const categoryRaw = formData.get("category");
  const category = EVIDENCE_CATEGORIES.includes(categoryRaw as any) ? (categoryRaw as string) : "otro";
  const description = (formData.get("description") as string) || null;
  const marketingUsable = formData.get("marketingUsable") === "true";
  const customerVisible = formData.get("customerVisible") === "true";

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const baseKey = `evidence/${orderId}/${crypto.randomUUID()}`;
  const storagePath = `${baseKey}${ext}`;

  await uploadToR2(storagePath, buffer, file.type || "application/octet-stream");

  let thumbnailPath: string | null = null;
  if (isImageMimeType(file.type)) {
    try {
      const thumbBuffer = await generateThumbnail(buffer);
      thumbnailPath = `${baseKey}-thumb.webp`;
      await uploadToR2(thumbnailPath, thumbBuffer, "image/webp");
    } catch {
      thumbnailPath = null;
    }
  }

  const evidence = await prisma.evidence.create({
    data: {
      serviceOrderId: orderId,
      vehicleId: order.vehicleId,
      uploadedById: user.id,
      category: category as any,
      storageType: "r2",
      storagePath,
      thumbnailPath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      description,
      marketingUsable,
      customerVisible,
    },
    include: { uploadedBy: true },
  });

  return NextResponse.json(evidence, { status: 201 });
}
