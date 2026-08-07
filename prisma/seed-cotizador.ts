/**
 * Seed del catálogo del Cotizador.
 *
 * Precarga los vehículos (aplicaciones) y las piezas del cotizador a partir de
 * `referencia/cotizador-catalog.json`. Es idempotente: usa upsert manual
 * (buscar → actualizar o crear) por lo que puede correrse varias veces sin
 * duplicar registros. La captura manual desde la UI (tabs "Catálogo" y
 * "Piezas") queda intacta; este script sólo agrega/actualiza el catálogo base.
 *
 * Uso:
 *   npx tsx prisma/seed-cotizador.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

// ── Estructura del JSON de referencia ──
interface CatalogPrice {
  prev: number;
  corr: number;
}
interface CatalogVehicle {
  category: string;
  descriptor: string;
  fields: string[];
  prices: Record<string, CatalogPrice>;
}
interface CatalogPart {
  sys: string;
  label: string;
  van: number;
  truck: number;
  essential?: boolean;
  qtyPerUnit?: number;
  note?: string | null;
}
interface Catalog {
  categories: string[];
  vehicles: CatalogVehicle[];
  parts: CatalogPart[];
  meta?: Record<string, unknown>;
}

function loadCatalog(): Catalog {
  // Fuente canónica empaquetada con la app (misma que usa el seed principal y la
  // auto-provisión en runtime — ver src/lib/quoter-catalog.ts).
  const file = join(process.cwd(), "src", "data", "quoter-catalog.json");
  return JSON.parse(readFileSync(file, "utf8")) as Catalog;
}

/**
 * Deriva marca / modelo desde los campos del descriptor, manteniendo la misma
 * convención que la captura manual: displayLabel = `categoría | marca | modelo`.
 * El descriptor completo del JSON se conserva como displayLabel para no perder
 * información (años, potencia, tier, método...).
 */
function deriveFields(vehicle: CatalogVehicle) {
  const brand = vehicle.fields[0]?.trim() || "Sin marca";
  const model = vehicle.fields.slice(1).map((f) => f.trim()).join(" | ") || brand;
  const displayLabel = vehicle.descriptor.trim();
  return { brand, model, displayLabel };
}

async function seedVehicles(vehicles: CatalogVehicle[]) {
  let created = 0;
  let updated = 0;

  for (const vehicle of vehicles) {
    const { brand, model, displayLabel } = deriveFields(vehicle);
    const data = {
      category: vehicle.category,
      brand,
      model,
      displayLabel,
      pricing: vehicle.prices as unknown as Prisma.InputJsonValue,
      deleted: false,
    };

    // No hay índice único en displayLabel, por eso hacemos upsert manual.
    const existing = await prisma.quoterApplication.findFirst({
      where: { displayLabel },
    });

    if (existing) {
      await prisma.quoterApplication.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.quoterApplication.create({ data });
      created++;
    }
  }

  console.log(`  Aplicaciones: ${created} creadas, ${updated} actualizadas (total ${vehicles.length}).`);
}

async function seedParts(parts: CatalogPart[]) {
  let created = 0;
  let updated = 0;

  for (const part of parts) {
    const data = {
      system: part.sys,
      label: part.label,
      vanPrice: part.van,
      truckPrice: part.truck,
      essential: part.essential ?? true,
      qtyPerUnit: part.qtyPerUnit ?? 1,
      note: part.note ?? null,
      deleted: false,
    };

    const existing = await prisma.quoterPart.findFirst({
      where: { system: part.sys, label: part.label },
    });

    if (existing) {
      await prisma.quoterPart.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.quoterPart.create({ data });
      created++;
    }
  }

  console.log(`  Piezas: ${created} creadas, ${updated} actualizadas (total ${parts.length}).`);
}

async function main() {
  console.log("🌱 Sembrando catálogo del cotizador...");
  const catalog = loadCatalog();
  await seedVehicles(catalog.vehicles);
  await seedParts(catalog.parts);
  console.log("✅ Catálogo del cotizador listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
