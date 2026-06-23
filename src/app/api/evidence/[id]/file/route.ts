import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFromR2 } from "@/lib/storage/r2";
import { INTERNAL_ROLES, CLIENT_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const evidence = await prisma.evidence.findUnique({
    where: { id },
    include: { serviceOrder: { select: { companyId: true } } },
  });
  if (!evidence || evidence.deleted) {
    return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
  }

  if (!INTERNAL_ROLES.includes(user.role)) {
    if (!CLIENT_ROLES.includes(user.role) || !evidence.customerVisible) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
    if (!dbUser?.companyId || dbUser.companyId !== evidence.serviceOrder.companyId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
  }

  const mode = req.nextUrl.searchParams.get("mode") || "thumb"; // thumb | original | download
  const useThumbnail = mode === "thumb" && !!evidence.thumbnailPath;
  const key = useThumbnail ? evidence.thumbnailPath! : evidence.storagePath;

  const object = await getFromR2(key);
  if (!object) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });

  const disposition = mode === "download"
    ? `attachment; filename="${evidence.fileName || "evidencia"}"`
    : "inline";

  return new NextResponse(new Uint8Array(object.buffer), {
    headers: {
      "Content-Type": useThumbnail ? "image/webp" : object.contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
