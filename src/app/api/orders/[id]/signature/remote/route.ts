import { NextRequest, NextResponse } from "next/server";
import { getSession, createAuditLog } from "@/lib/auth";
import { createRemoteSignatureToken } from "@/services/signature";
import { sendCrmEvent } from "@/services/crm-webhook";
import { z } from "zod";

const remoteSchema = z.object({
  phase: z.enum(["reception", "delivery"]).default("reception"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = remoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { phase } = parsed.data;

  try {
    const { token, expiresAt } = await createRemoteSignatureToken(id, phase);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signUrl = `${baseUrl}/sign/${token}`;

    await createAuditLog({
      userId: user.id,
      entityType: "ServiceOrder",
      entityId: id,
      action: `signature_${phase}_remote_link_generated`,
      newValue: JSON.stringify({ expiresAt: expiresAt.toISOString() }),
    });

    // CRM event
    await sendCrmEvent("service_order.signature_requested", id, {
      signature_type: "remote",
      phase,
      sign_url: signUrl,
    }).catch(() => {});

    return NextResponse.json({
      signUrl,
      phase,
      expiresAt: expiresAt.toISOString(),
      message: "Enlace generado. Comparte con el cliente por WhatsApp, correo o CRM.",
    });
  } catch (error) {
    console.error("Remote signature error:", error);
    return NextResponse.json({ error: "Error al generar enlace" }, { status: 500 });
  }
}
