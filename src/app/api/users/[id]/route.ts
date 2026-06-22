import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, createAuditLog } from "@/lib/auth";
import { userSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    active: parsed.data.active,
  };

  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  // No permitir que un admin se desactive a sí mismo
  if (id === session.id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !target.active },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  await createAuditLog({
    userId: session.id,
    entityType: "User",
    entityId: id,
    action: updated.active ? "reactivate" : "deactivate",
    oldValue: String(target.active),
    newValue: String(updated.active),
  });

  return NextResponse.json(updated);
}
