import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
const COOKIE_NAME = process.env.COOKIE_NAME || "ditrucks_session";

// Paths that don't require any auth
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/webhooks", "/api/public", "/sign", "/verify"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const role = payload.role as string;
    const isClientRole = role === "customer" || role === "fleet_admin";

    // Client portal access control
    if (pathname.startsWith("/client") || pathname.startsWith("/api/client")) {
      if (!isClientRole && role !== "admin") {
        if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Client-portal roles cannot access internal pages or APIs.
    // Allowed outside the portal: auth endpoints, evidence files
    // (the evidence route enforces customerVisible + same company) and la
    // captura de analítica (fire-and-forget, sin datos sensibles).
    if (
      isClientRole &&
      !pathname.startsWith("/api/auth") &&
      !pathname.startsWith("/api/evidence") &&
      !pathname.startsWith("/api/analytics/track")
    ) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
