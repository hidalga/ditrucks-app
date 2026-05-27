import type { Diagnostic, RiskLevel, UsageType } from "@prisma/client";

export interface Penalty {
  system: "DPF" | "SCR" | "EGR";
  reason: string;
  points: number;
}

export interface RatingResult {
  dpfScore: number | null;
  scrScore: number | null;
  egrScore: number | null;
  generalHealthScore: number;
  riskLevel: RiskLevel;
  penalties: Penalty[];
}

const HIGH_URBAN_USAGE: UsageType[] = ["ciudad", "ralenti_alto", "reparto_urbano"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateDpfScore(diag: Partial<Diagnostic>): {
  score: number;
  penalties: Penalty[];
} {
  let score = 100;
  const penalties: Penalty[] = [];

  if (diag.dpfDtcActive) {
    score -= 25;
    penalties.push({ system: "DPF", reason: "DTC activo en DPF", points: 25 });
  }

  const failedRegens = diag.failedRegenerationsCount ?? 0;
  if (failedRegens > 0) {
    const deduction = clamp(failedRegens * 5, 0, 20);
    score -= deduction;
    penalties.push({
      system: "DPF",
      reason: `${failedRegens} regeneraciones fallidas`,
      points: deduction,
    });
  }

  if (diag.differentialPressureHighRpm != null && diag.differentialPressureHighRpm > 8) {
    const deduction = clamp(
      Math.round((diag.differentialPressureHighRpm - 8) * 4),
      0,
      20
    );
    score -= deduction;
    penalties.push({
      system: "DPF",
      reason: `Presión diferencial alta a RPM elevado (${diag.differentialPressureHighRpm} kPa)`,
      points: deduction,
    });
  }

  if (diag.sootLoadPercent != null && diag.sootLoadPercent > 70) {
    score -= 20;
    penalties.push({
      system: "DPF",
      reason: `Carga de hollín elevada (${diag.sootLoadPercent}%)`,
      points: 20,
    });
  }

  if (diag.ashLoadPercent != null && diag.ashLoadPercent > 70) {
    score -= 20;
    penalties.push({
      system: "DPF",
      reason: `Carga de ceniza elevada (${diag.ashLoadPercent}%)`,
      points: 20,
    });
  }

  if (diag.usageType && HIGH_URBAN_USAGE.includes(diag.usageType)) {
    score -= 10;
    penalties.push({
      system: "DPF",
      reason: "Uso urbano/ralentí alto (mayor estrés en DPF)",
      points: 10,
    });
  }

  return { score: clamp(score, 0, 100), penalties };
}

export function calculateScrScore(diag: Partial<Diagnostic>): {
  score: number;
  penalties: Penalty[];
} {
  let score = 100;
  const penalties: Penalty[] = [];

  if (diag.scrDtcActive) {
    score -= 25;
    penalties.push({ system: "SCR", reason: "DTC activo en SCR", points: 25 });
  }

  if (diag.scrDerateActive) {
    score -= 30;
    penalties.push({ system: "SCR", reason: "Derate activo en SCR", points: 30 });
  }

  if (diag.scrEfficiency != null && diag.scrEfficiency < 80) {
    const deduction = clamp(Math.round((80 - diag.scrEfficiency) / 2), 0, 25);
    score -= deduction;
    penalties.push({
      system: "SCR",
      reason: `Eficiencia SCR baja (${diag.scrEfficiency}%)`,
      points: deduction,
    });
  }

  if (
    diag.defPumpPressure != null &&
    (diag.defPumpPressure < 3 || diag.defPumpPressure > 12)
  ) {
    score -= 25;
    penalties.push({
      system: "SCR",
      reason: `Presión bomba DEF anormal (${diag.defPumpPressure} bar)`,
      points: 25,
    });
  }

  const injectorStatus = diag.defInjectorStatus?.toLowerCase() ?? "";
  if (
    injectorStatus.includes("falla") ||
    injectorStatus.includes("error") ||
    injectorStatus.includes("obstruido") ||
    injectorStatus.includes("fail")
  ) {
    score -= 20;
    penalties.push({
      system: "SCR",
      reason: "Problema detectado en inyector DEF",
      points: 20,
    });
  }

  if (
    diag.noxUpstream != null &&
    diag.noxDownstream != null &&
    diag.noxDownstream > diag.noxUpstream * 0.5
  ) {
    score -= 20;
    penalties.push({
      system: "SCR",
      reason: "Sensor NOx con lectura anormal (reducción insuficiente)",
      points: 20,
    });
  }

  return { score: clamp(score, 0, 100), penalties };
}

export function calculateEgrScore(diag: Partial<Diagnostic>): {
  score: number;
  penalties: Penalty[];
} {
  let score = 100;
  const penalties: Penalty[] = [];

  if (diag.egrDtcActive) {
    score -= 25;
    penalties.push({ system: "EGR", reason: "DTC activo en EGR", points: 25 });
  }

  if (diag.egrDeviation != null && diag.egrDeviation > 10) {
    const deduction = clamp(Math.round(diag.egrDeviation), 0, 20);
    score -= deduction;
    penalties.push({
      system: "EGR",
      reason: `Desviación EGR alta (${diag.egrDeviation}%)`,
      points: deduction,
    });
  }

  const flowNotes = diag.egrFlowNotes?.toLowerCase() ?? "";
  if (
    flowNotes.includes("insuficiente") ||
    flowNotes.includes("bajo") ||
    flowNotes.includes("restringido")
  ) {
    score -= 20;
    penalties.push({
      system: "EGR",
      reason: "Flujo EGR insuficiente/restringido",
      points: 20,
    });
  }

  const egrNotes = diag.egrNotes?.toLowerCase() ?? "";
  if (
    egrNotes.includes("carboniz") ||
    egrNotes.includes("obstrui") ||
    egrNotes.includes("grave") ||
    egrNotes.includes("severo")
  ) {
    score -= 15;
    penalties.push({
      system: "EGR",
      reason: "Carbonización/obstrucción severa en EGR",
      points: 15,
    });
  }

  return { score: clamp(score, 0, 100), penalties };
}

export function calculateOverallRating(diag: Partial<Diagnostic>): RatingResult {
  let allPenalties: Penalty[] = [];
  const scores: number[] = [];
  let dpfScore: number | null = null;
  let scrScore: number | null = null;
  let egrScore: number | null = null;

  if (diag.dpfPresent) {
    const dpf = calculateDpfScore(diag);
    dpfScore = dpf.score;
    scores.push(dpf.score);
    allPenalties = [...allPenalties, ...dpf.penalties];
  }

  if (diag.scrPresent) {
    const scr = calculateScrScore(diag);
    scrScore = scr.score;
    scores.push(scr.score);
    allPenalties = [...allPenalties, ...scr.penalties];
  }

  if (diag.egrPresent) {
    const egr = calculateEgrScore(diag);
    egrScore = egr.score;
    scores.push(egr.score);
    allPenalties = [...allPenalties, ...egr.penalties];
  }

  const generalHealthScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100;

  let riskLevel: RiskLevel;
  if (generalHealthScore >= 85) riskLevel = "excelente";
  else if (generalHealthScore >= 70) riskLevel = "bueno";
  else if (generalHealthScore >= 50) riskLevel = "medio";
  else if (generalHealthScore >= 30) riskLevel = "alto";
  else riskLevel = "critico";

  return {
    dpfScore,
    scrScore,
    egrScore,
    generalHealthScore,
    riskLevel,
    penalties: allPenalties,
  };
}
