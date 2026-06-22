import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (CLIENT_ROLES.includes(user.role)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company: { select: { quoterEnabled: true } } },
    });
    return NextResponse.json({ user: { ...user, quoterEnabled: dbUser?.company?.quoterEnabled || false } });
  }

  return NextResponse.json({ user });
}
