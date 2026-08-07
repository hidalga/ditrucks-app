import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const trackSchema = z.object({
  event: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "snake_case"),
  path: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Captura de eventos de analítica. Fire-and-forget: responde 204 siempre que
 * sea posible y nunca propaga errores a la UI que lo llama.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 204 });

    // Sesión opcional: enriquece el evento si existe, pero no es requisito.
    const user = await getSession().catch(() => null);

    // Para usuarios del portal, asociar la empresa (segmentación en BI).
    let companyId: string | null = null;
    if (user && ["customer", "fleet_admin"].includes(user.role)) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
      companyId = dbUser?.companyId ?? null;
    }

    await prisma.analyticsEvent.create({
      data: {
        event: parsed.data.event,
        path: parsed.data.path ?? null,
        metadata: (parsed.data.metadata ?? undefined) as never,
        userId: user?.id ?? null,
        userRole: user?.role ?? null,
        companyId,
      },
    });
  } catch {
    // Descartar en silencio: la analítica no debe romper nada.
  }
  return new NextResponse(null, { status: 204 });
}
