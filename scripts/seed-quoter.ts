import { PrismaClient } from "@prisma/client";
import catalogData from "../prisma/data/quoter-catalog.json";
import partsData from "../prisma/data/quoter-parts.json";

const prisma = new PrismaClient();

type RawPricing = Record<string, { prev: number; corr: number }>;
type RawPart = { sys: string; label: string; van: number; truck: number };

async function main() {
  const entries = Object.entries(catalogData as Record<string, RawPricing>);
  let created = 0;
  let skipped = 0;

  for (const [key, pricing] of entries) {
    const segments = key.split("|").map((s) => s.trim());
    const category = segments[0] || "Otro";
    const brand = segments[1] || "Sin marca";
    const model = segments.slice(2).join(" | ") || brand;

    const existing = await prisma.quoterApplication.findFirst({
      where: { displayLabel: key },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.quoterApplication.create({
      data: { category, brand, model, displayLabel: key, pricing },
    });
    created++;
  }

  console.log(`Aplicaciones: ${created} creadas, ${skipped} ya existían.`);

  const parts = partsData as RawPart[];
  let partsCreated = 0;
  let partsSkipped = 0;

  for (const p of parts) {
    const existing = await prisma.quoterPart.findFirst({
      where: { system: p.sys, label: p.label },
    });
    if (existing) {
      partsSkipped++;
      continue;
    }
    await prisma.quoterPart.create({
      data: { system: p.sys, label: p.label, vanPrice: p.van, truckPrice: p.truck },
    });
    partsCreated++;
  }

  console.log(`Piezas: ${partsCreated} creadas, ${partsSkipped} ya existían.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
