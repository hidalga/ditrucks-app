import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_ROLES } from "@/lib/constants";
import { quoterCalculationSchema } from "@/lib/validations";
import { calculateQuote, type QuoterPartLine } from "@/services/quoter-engine";
import { QuoterPdf } from "@/lib/pdf/quoter-pdf";

const QUOTER_ROLES = ["admin", "sales"];

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let authorized = QUOTER_ROLES.includes(user.role);
  if (!authorized && CLIENT_ROLES.includes(user.role)) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
    if (dbUser?.companyId) {
      const company = await prisma.company.findUnique({ where: { id: dbUser.companyId }, select: { quoterEnabled: true } });
      authorized = !!company?.quoterEnabled;
    }
  }
  if (!authorized) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await req.json();
  const parsed = quoterCalculationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const application = await prisma.quoterApplication.findUnique({ where: { id: input.applicationId } });
  if (!application || application.deleted) {
    return NextResponse.json({ error: "Aplicación no encontrada" }, { status: 404 });
  }

  const partIds = input.parts.map((p) => p.partId);
  const dbParts = partIds.length
    ? await prisma.quoterPart.findMany({ where: { id: { in: partIds } } })
    : [];
  const partLines: QuoterPartLine[] = dbParts.map((dbp) => {
    const sel = input.parts.find((p) => p.partId === dbp.id);
    return {
      system: dbp.system,
      label: dbp.label,
      vanPrice: dbp.vanPrice,
      truckPrice: dbp.truckPrice,
      selected: sel?.selected ?? false,
      units: sel?.units ?? 0,
    };
  });

  const result = calculateQuote({
    pricing: application.pricing as Record<string, { prev: number; corr: number }>,
    mode: input.mode,
    vans: input.vans,
    trucks: input.trucks,
    selectedSystems: input.selectedSystems,
    parts: partLines,
    ureaIncluded: input.ureaIncluded,
    ureaVanLitersPerMonth: input.ureaVanLitersPerMonth,
    ureaTruckLitersPerMonth: input.ureaTruckLitersPerMonth,
    ureaPricePerLiter: input.ureaPricePerLiter,
    downtimeIncluded: input.downtimeIncluded,
    downtimeHours: input.downtimeHours,
    downtimeRatePerHour: input.downtimeRatePerHour,
  });

  const generatedAt = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  const buffer = await renderToBuffer(
    <QuoterPdf
      applicationLabel={`${application.brand} — ${application.model}`}
      mode={input.mode}
      vans={input.vans}
      trucks={input.trucks}
      systems={input.selectedSystems}
      generatedAt={generatedAt}
      result={result}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="cotizacion-ditrucks.pdf"',
    },
  });
}
