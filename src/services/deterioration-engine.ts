/**
 * Deterioration Projection Engine
 * 
 * Projects when a vehicle's post-treatment systems will reach risk thresholds
 * based on current score, usage type, and mileage patterns.
 * 
 * Uses conservative rule-based calculations, not AI/ML.
 */

// Monthly score degradation rate by usage type (points per month)
const DEGRADATION_RATES: Record<string, number> = {
  carretera: 2.5,       // Highway = moderate wear
  ciudad: 3.5,          // City = more start/stop, more soot
  mixto: 3.0,           // Mixed
  carga_pesada: 4.5,    // Heavy load = fastest degradation
  ralenti_alto: 4.0,    // High idle = lots of soot buildup
  agricola: 3.5,        // Agriculture = dusty, variable
  construccion: 4.0,    // Construction = harsh conditions
  reparto_urbano: 3.8,  // Urban delivery = constant stop/go
};

// Risk thresholds
const RISK_THRESHOLDS = {
  medio: 50,   // Below 50 = medium risk
  alto: 30,    // Below 30 = high risk
  critico: 15, // Below 15 = critical
};

export interface SystemProjection {
  system: string;
  systemLabel: string;
  currentScore: number;
  riskLevel: string;
  degradationRate: number; // points per month
  daysToMedium: number | null;
  daysToHigh: number | null;
  daysToCritical: number | null;
  recommendedActionDate: string | null; // ISO date
  urgency: "none" | "monitor" | "schedule" | "urgent" | "critical";
  recommendation: string;
}

export interface VehicleProjection {
  vehicleId: string;
  overallScore: number;
  overallUrgency: "none" | "monitor" | "schedule" | "urgent" | "critical";
  systems: SystemProjection[];
  nextActionDate: string | null;
  summary: string;
}

function daysUntilScore(currentScore: number, targetScore: number, monthlyRate: number): number | null {
  if (currentScore <= targetScore) return 0;
  const pointsToLose = currentScore - targetScore;
  const dailyRate = monthlyRate / 30;
  return Math.round(pointsToLose / dailyRate);
}

function getUrgency(daysToHigh: number | null, daysToMedium: number | null, currentScore: number): "none" | "monitor" | "schedule" | "urgent" | "critical" {
  if (currentScore <= 15) return "critical";
  if (currentScore <= 30) return "urgent";
  if (daysToHigh !== null && daysToHigh <= 30) return "urgent";
  if (daysToHigh !== null && daysToHigh <= 90) return "schedule";
  if (daysToMedium !== null && daysToMedium <= 60) return "monitor";
  return "none";
}

function getRecommendation(system: string, urgency: string, days: number | null): string {
  const labels: Record<string, string> = { dpf: "DPF", scr: "SCR/UREA", egr: "EGR" };
  const name = labels[system] || system;

  switch (urgency) {
    case "critical":
      return `${name} en estado crítico. Intervención inmediata recomendada para evitar paro total en ruta.`;
    case "urgent":
      return `${name} requiere atención pronto. Se estima riesgo alto en ~${days} días. Agendar servicio preventivo.`;
    case "schedule":
      return `${name} en deterioro progresivo. Recomendamos agendar intervención preventiva en los próximos ${days} días.`;
    case "monitor":
      return `${name} en buen estado pero en deterioro normal. Monitorear en próxima revisión.`;
    default:
      return `${name} en buen estado. Sin acción necesaria por ahora.`;
  }
}

export function projectSystem(
  system: string,
  systemLabel: string,
  score: number | null,
  usageType: string,
): SystemProjection | null {
  if (score === null) return null;

  const rate = DEGRADATION_RATES[usageType] || DEGRADATION_RATES.mixto;

  const daysToMedium = score > RISK_THRESHOLDS.medio ? daysUntilScore(score, RISK_THRESHOLDS.medio, rate) : null;
  const daysToHigh = score > RISK_THRESHOLDS.alto ? daysUntilScore(score, RISK_THRESHOLDS.alto, rate) : null;
  const daysToCritical = score > RISK_THRESHOLDS.critico ? daysUntilScore(score, RISK_THRESHOLDS.critico, rate) : null;

  const urgency = getUrgency(daysToHigh, daysToMedium, score);

  // Recommended action date: when it hits "alto" threshold or now if already there
  let recommendedActionDate: string | null = null;
  if (urgency === "critical" || urgency === "urgent") {
    recommendedActionDate = new Date().toISOString();
  } else if (daysToHigh) {
    // Recommend action 30 days BEFORE reaching high risk
    const actionDays = Math.max(0, daysToHigh - 30);
    const date = new Date();
    date.setDate(date.getDate() + actionDays);
    recommendedActionDate = date.toISOString();
  }

  const riskLevel = score >= 85 ? "excelente" : score >= 70 ? "bueno" : score >= 50 ? "medio" : score >= 30 ? "alto" : "critico";

  return {
    system,
    systemLabel,
    currentScore: score,
    riskLevel,
    degradationRate: rate,
    daysToMedium,
    daysToHigh,
    daysToCritical,
    recommendedActionDate,
    urgency,
    recommendation: getRecommendation(system, urgency, daysToHigh),
  };
}

export function projectVehicle(diagnostic: {
  generalHealthScore: number | null;
  dpfPresent: boolean;
  dpfScore: number | null;
  scrPresent: boolean;
  scrScore: number | null;
  egrPresent: boolean;
  egrScore: number | null;
  usageType: string;
}, vehicleId: string): VehicleProjection {
  const systems: SystemProjection[] = [];

  if (diagnostic.dpfPresent) {
    const p = projectSystem("dpf", "DPF", diagnostic.dpfScore, diagnostic.usageType);
    if (p) systems.push(p);
  }
  if (diagnostic.scrPresent) {
    const p = projectSystem("scr", "SCR / UREA", diagnostic.scrScore, diagnostic.usageType);
    if (p) systems.push(p);
  }
  if (diagnostic.egrPresent) {
    const p = projectSystem("egr", "EGR", diagnostic.egrScore, diagnostic.usageType);
    if (p) systems.push(p);
  }

  // Overall urgency = worst system
  const urgencyOrder: Record<string, number> = { none: 0, monitor: 1, schedule: 2, urgent: 3, critical: 4 };
  const overallUrgency = systems.reduce(
    (worst, s) => urgencyOrder[s.urgency] > urgencyOrder[worst] ? s.urgency : worst,
    "none" as SystemProjection["urgency"]
  );

  // Next action date = earliest
  const actionDates = systems.map(s => s.recommendedActionDate).filter(Boolean) as string[];
  const nextActionDate = actionDates.length > 0 ? actionDates.sort()[0] : null;

  // Summary
  const criticalSystems = systems.filter(s => s.urgency === "critical" || s.urgency === "urgent");
  let summary: string;
  if (criticalSystems.length > 0) {
    summary = `${criticalSystems.length} sistema(s) requieren atención: ${criticalSystems.map(s => s.systemLabel).join(", ")}. Intervención preventiva recomendada.`;
  } else if (systems.some(s => s.urgency === "schedule")) {
    summary = "Sistemas en deterioro progresivo. Recomendamos agendar revisión preventiva.";
  } else {
    summary = "Sistemas post-tratamiento en buen estado. Continuar monitoreo regular.";
  }

  return {
    vehicleId,
    overallScore: diagnostic.generalHealthScore || 0,
    overallUrgency,
    systems,
    nextActionDate,
    summary,
  };
}

// Semaphore color mapping
export function getUrgencyColor(urgency: string): { bg: string; text: string; dot: string; border: string; label: string } {
  switch (urgency) {
    case "critical": return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", border: "border-red-200", label: "Crítico" };
    case "urgent": return { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200", label: "Urgente" };
    case "schedule": return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200", label: "Agendar" };
    case "monitor": return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200", label: "Monitorear" };
    default: return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", label: "Bien" };
  }
}
