/**
 * Catálogo base del Cotizador — SIEMPRE incluido.
 *
 * Los datos del catálogo (vehículos/aplicaciones y piezas) viajan empaquetados
 * con la app en `src/data/quoter-catalog.json`, por lo que están disponibles en
 * cualquier despliegue sin pasos manuales de seed.
 *
 * `ensureQuoterCatalogSeeded()` provisiona automáticamente la base de datos la
 * primera vez que se consulta el cotizador si las tablas están vacías. Es
 * idempotente y sólo escribe cuando no hay registros, por lo que respeta
 * cualquier edición manual hecha desde la UI (tabs "Catálogo" y "Piezas").
 */
import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import catalog from "@/data/quoter-catalog.json";

// Reexporta las utilidades puras (seguras para cliente) desde un único origen.
export { QUOTER_SYSTEMS, detectSystems, type QuoterSystem } from "@/lib/quoter-systems";

// ── Estructura del JSON empaquetado ──
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
}

const CATALOG = catalog as Catalog;

/**
 * Deriva marca / modelo desde el descriptor manteniendo la misma convención que
 * la captura manual: `displayLabel = descriptor completo`, `brand = primer
 * campo`, `model = resto de campos unidos con " | "`.
 */
function deriveFields(vehicle: CatalogVehicle) {
  const brand = vehicle.fields[0]?.trim() || "Sin marca";
  const model = vehicle.fields.slice(1).map((f) => f.trim()).join(" | ") || brand;
  return { brand, model, displayLabel: vehicle.descriptor.trim() };
}

// Evita provisionar dos veces ante peticiones concurrentes y omite el conteo en
// llamadas posteriores dentro del mismo proceso una vez confirmado el catálogo.
let ensured = false;
let ensuring: Promise<void> | null = null;

async function seedIfEmpty(db: PrismaClient) {
  const [appCount, partCount] = await Promise.all([
    db.quoterApplication.count(),
    db.quoterPart.count(),
  ]);

  if (appCount === 0 && CATALOG.vehicles.length > 0) {
    await db.quoterApplication.createMany({
      data: CATALOG.vehicles.map((v) => {
        const { brand, model, displayLabel } = deriveFields(v);
        return {
          category: v.category,
          brand,
          model,
          displayLabel,
          pricing: v.prices as unknown as Prisma.InputJsonValue,
        };
      }),
    });
    console.log(`[quoter] Catálogo provisionado: ${CATALOG.vehicles.length} aplicaciones.`);
  }

  if (partCount === 0 && CATALOG.parts.length > 0) {
    await db.quoterPart.createMany({
      data: CATALOG.parts.map((p) => ({
        system: p.sys,
        label: p.label,
        vanPrice: p.van,
        truckPrice: p.truck,
        essential: p.essential ?? true,
        qtyPerUnit: p.qtyPerUnit ?? 1,
        note: p.note ?? null,
      })),
    });
    console.log(`[quoter] Piezas provisionadas: ${CATALOG.parts.length}.`);
  }
}

/**
 * Garantiza que el catálogo base exista. Seguro de llamar en cada request:
 * sólo consulta conteos una vez por proceso y sólo escribe si está vacío.
 */
export async function ensureQuoterCatalogSeeded(db: PrismaClient = prisma): Promise<void> {
  if (ensured) return;
  if (ensuring) return ensuring;
  ensuring = seedIfEmpty(db)
    .then(() => {
      ensured = true;
    })
    .catch((err) => {
      // No bloquea la respuesta: si falla, se reintentará en el próximo request.
      console.error("[quoter] No se pudo provisionar el catálogo:", err);
    })
    .finally(() => {
      ensuring = null;
    });
  return ensuring;
}

/** Datos crudos del catálogo empaquetado (para scripts de seed). */
export function getBundledCatalog(): Catalog {
  return CATALOG;
}
