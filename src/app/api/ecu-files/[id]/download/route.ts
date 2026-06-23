import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFromR2 } from "@/lib/storage/r2";
import { INTERNAL_ROLES } from "@/lib/constants";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !INTERNAL_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await params;
  const ecuFile = await prisma.ecuFile.findUnique({ where: { id } });
  if (!ecuFile || ecuFile.deleted) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
  if (ecuFile.storageType !== "r2" || !ecuFile.storagePath) {
    return NextResponse.json({ error: "Este archivo no está almacenado en R2" }, { status: 400 });
  }

  const object = await getFromR2(ecuFile.storagePath);
  if (!object) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });

  return new NextResponse(new Uint8Array(object.buffer), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Disposition": `attachment; filename="${ecuFile.fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
