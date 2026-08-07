/**
 * Utilidades puras del cotizador — seguras para cliente y servidor.
 * (No importar Prisma ni datos pesados aquí: se usa en componentes "use client".)
 */

// Sistemas de postratamiento de emisiones que Ditrucks interviene.
export const QUOTER_SYSTEMS = ["DPF", "EGR", "SCR", "DOC", "DITUNING"] as const;
export type QuoterSystem = (typeof QUOTER_SYSTEMS)[number];

/**
 * Detecta qué sistemas menciona un texto (descriptor de vehículo). Se usa para
 * preseleccionar automáticamente los sistemas relevantes y mostrar badges.
 */
export function detectSystems(text: string): QuoterSystem[] {
  const upper = (text || "").toUpperCase();
  return QUOTER_SYSTEMS.filter((sys) => upper.includes(sys));
}
