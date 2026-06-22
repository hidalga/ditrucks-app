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
  prevUnitPrice: number;
  corrUnitPrice: number;
  totalPrev: number;
  totalCorr: number;
  ureaLiters: number;
  ureaCost: number;
  partsSum: number;
  downtimeCost: number;
  savings: number;
  onlyPricePrev: number;
  onlyPriceCorr: number;
  onlyPriceDiff: number;
}

export const DEFAULT_DOWNTIME_HOURS = 16;
export const DEFAULT_DOWNTIME_RATE = 1200;
export const DEFAULT_UREA_VAN_LITERS = 70;
export const DEFAULT_UREA_TRUCK_LITERS = 137;
export const DEFAULT_UREA_PRICE = 17;

// Mirrors the calc() logic from the original standalone HTML quoter, 1:1.
export function calculateQuote(input: QuoterInput): QuoterResult {
  const totalUnits = input.vans + input.trucks;
  // Mutual exclusion for parts pricing: vans-only fleet uses van prices, otherwise truck prices.
  const activeType: "van" | "truck" = input.vans > 0 && input.trucks === 0 ? "van" : "truck";

  const rec = input.pricing[String(input.mode)] || { prev: 0, corr: 0 };
  const prevUnitPrice = rec.prev || 0;
  const corrUnitPrice = rec.corr || 0;

  const ureaLiters = input.vans * input.ureaVanLitersPerMonth + input.trucks * input.ureaTruckLitersPerMonth;
  const ureaCost = input.ureaIncluded ? ureaLiters * input.ureaPricePerLiter : 0;

  const selectedSet = new Set(input.selectedSystems);
  const partsSum = input.parts
    .filter((p) => selectedSet.has(p.system) && p.selected)
    .reduce((acc, p) => acc + (activeType === "van" ? p.vanPrice : p.truckPrice) * (p.units || 0), 0);

  const downtimeCost = input.downtimeIncluded ? input.downtimeHours * input.downtimeRatePerHour * totalUnits : 0;

  const totalPrev = prevUnitPrice * totalUnits;
  const totalCorr = corrUnitPrice * totalUnits + partsSum + ureaCost + downtimeCost;

  return {
    totalUnits,
    activeType,
    prevUnitPrice,
    corrUnitPrice,
    totalPrev,
    totalCorr,
    ureaLiters,
    ureaCost,
    partsSum,
    downtimeCost,
    savings: Math.max(totalCorr - totalPrev, 0),
    onlyPricePrev: prevUnitPrice * totalUnits,
    onlyPriceCorr: corrUnitPrice * totalUnits,
    onlyPriceDiff: Math.max((corrUnitPrice - prevUnitPrice) * totalUnits, 0),
  };
}
