export interface QuoterPricingMode {
  prev: number;
  corr: number;
}

export type QuoterPricing = Record<string, QuoterPricingMode>;

export interface QuoterPartLine {
  system: string;
  label: string;
  vanPrice: number;
  truckPrice: number;
  selected: boolean;
  units: number;
}

export interface QuoterInput {
  pricing: QuoterPricing;
  mode: number; // 1-4 deactivations
  vans: number;
  trucks: number;
  selectedSystems: string[]; // DPF | EGR | SCR | DOC | DITUNING — filters which parts apply
  parts: QuoterPartLine[];
  /** Ventana de proyección para costos recurrentes (DEF). Default 24 meses. */
  horizonMonths: number;
  ureaIncluded: boolean;
  ureaVanLitersPerMonth: number;
  ureaTruckLitersPerMonth: number;
  ureaPricePerLiter: number;
  downtimeIncluded: boolean;
  downtimeHours: number;
  downtimeRatePerHour: number;
}

export interface QuoterResult {
  totalUnits: number;
  activeType: "van" | "truck";
  horizonMonths: number;
  prevUnitPrice: number;
  corrUnitPrice: number;
  totalPrev: number;
  totalCorr: number;
  ureaMonthlyLiters: number;
  ureaMonthlyCost: number;
  ureaCost: number; // acumulado a lo largo del horizonte
  partsSum: number;
  downtimeCost: number;
  savings: number;
  savingsPct: number;
  /** Comparativo sólo de precio de servicio Ditrucks (sin extras), por si se requiere. */
  onlyPricePrev: number;
  onlyPriceCorr: number;
  onlyPriceDiff: number;
}

export const DEFAULT_HORIZON_MONTHS = 24;
export const DEFAULT_DOWNTIME_HOURS = 16;
export const DEFAULT_DOWNTIME_RATE = 1200;
// Consumos DEF/urea aproximados al mercado MX (editables en la UI).
export const DEFAULT_UREA_VAN_LITERS = 20;
export const DEFAULT_UREA_TRUCK_LITERS = 130;
export const DEFAULT_UREA_PRICE = 18;

/**
 * Modelo comercial Ditrucks — "Preventivo vs Correctivo".
 *
 * Ditrucks vende el mismo servicio (delete/reprogramación DITUNING) de dos formas:
 *  · PREVENTIVO: se hace ANTES de la falla → precio unitario `prev` (menor). Es un
 *    gasto único que además elimina para siempre el consumo de DEF y el riesgo de
 *    reemplazo de piezas del post-tratamiento.
 *  · CORRECTIVO: se hace cuando la unidad YA falló → precio unitario `corr` (mayor,
 *    más mano de obra/limpieza) MÁS el costo acumulado que el cliente ya venía
 *    pagando: piezas de reemplazo, DEF mes con mes (proyectado al horizonte) y la
 *    inoperatividad del paro.
 *
 * `savings` = cuánto se ahorra el cliente eligiendo el preventivo hoy.
 */
export function calculateQuote(input: QuoterInput): QuoterResult {
  const totalUnits = input.vans + input.trucks;
  const horizonMonths = input.horizonMonths > 0 ? input.horizonMonths : DEFAULT_HORIZON_MONTHS;
  // Exclusión mutua para precios de piezas: flota sólo de camionetas usa precio camioneta.
  const activeType: "van" | "truck" = input.vans > 0 && input.trucks === 0 ? "van" : "truck";

  const rec = input.pricing[String(input.mode)] || { prev: 0, corr: 0 };
  const prevUnitPrice = rec.prev || 0;
  const corrUnitPrice = rec.corr || 0;

  // DEF/urea: consumo mensual de la flota proyectado al horizonte.
  const ureaMonthlyLiters = input.vans * input.ureaVanLitersPerMonth + input.trucks * input.ureaTruckLitersPerMonth;
  const ureaMonthlyCost = ureaMonthlyLiters * input.ureaPricePerLiter;
  const ureaCost = input.ureaIncluded ? ureaMonthlyCost * horizonMonths : 0;

  const selectedSet = new Set(input.selectedSystems);
  const partsSum = input.parts
    .filter((p) => selectedSet.has(p.system) && p.selected)
    .reduce((acc, p) => acc + (activeType === "van" ? p.vanPrice : p.truckPrice) * (p.units || 0), 0);

  const downtimeCost = input.downtimeIncluded ? input.downtimeHours * input.downtimeRatePerHour * totalUnits : 0;

  const totalPrev = prevUnitPrice * totalUnits;
  const totalCorr = corrUnitPrice * totalUnits + partsSum + ureaCost + downtimeCost;
  const savings = Math.max(totalCorr - totalPrev, 0);

  return {
    totalUnits,
    activeType,
    horizonMonths,
    prevUnitPrice,
    corrUnitPrice,
    totalPrev,
    totalCorr,
    ureaMonthlyLiters,
    ureaMonthlyCost,
    ureaCost,
    partsSum,
    downtimeCost,
    savings,
    savingsPct: totalCorr > 0 ? Math.round((savings / totalCorr) * 100) : 0,
    onlyPricePrev: prevUnitPrice * totalUnits,
    onlyPriceCorr: corrUnitPrice * totalUnits,
    onlyPriceDiff: Math.max((corrUnitPrice - prevUnitPrice) * totalUnits, 0),
  };
}
